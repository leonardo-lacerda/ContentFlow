import { Injectable, Logger } from '@nestjs/common';
import { CreativeJobStatus, CreativeProjectStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CreativeProviderService } from '@gitroom/nestjs-libraries/creative-engine/creative-provider.service';
import { CreativeCreditService } from '@gitroom/nestjs-libraries/creative-engine/creative-credit.service';
import { CreativeWebhookService } from '@gitroom/nestjs-libraries/creative-engine/creative-webhook.service';
import { CreativeOutputValidationService } from '@gitroom/nestjs-libraries/creative-engine/creative-output-validation.service';
import { CreativeMetricsService } from '@gitroom/nestjs-libraries/creative-engine/creative-metrics.service';
import { CreativeCapability } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.types';
import { CreativeWorkflowService } from '@gitroom/nestjs-libraries/creative-engine/creative-workflow.service';
import { CreativeOutputStorageService } from '@gitroom/nestjs-libraries/creative-engine/creative-output-storage.service';

@Injectable()
export class CreativeActivity {
  private readonly logger = new Logger(CreativeActivity.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: CreativeProviderService,
    private readonly credits: CreativeCreditService,
    private readonly webhooks: CreativeWebhookService,
    private readonly outputValidation: CreativeOutputValidationService,
    private readonly metrics: CreativeMetricsService,
    private readonly workflows: CreativeWorkflowService,
    private readonly outputStorage: CreativeOutputStorageService,
  ) {}

  async executeCreativeJob(input: { jobId: string; organizationId: string }) {
    const job = await this.prisma.creativeJob.findFirst({ where: { id: input.jobId, organizationId: input.organizationId } });
    if (!job) throw new Error('Creative job not found');
    if (job.status === CreativeJobStatus.SUCCEEDED || job.status === CreativeJobStatus.CANCELLED || job.status === CreativeJobStatus.REFUNDED) return job.output;
    const data = job.input as Record<string, any>;
    const attemptNumber = Number(job.attempts || 0) + 1;
    await this.prisma.creativeJob.update({ where: { id: job.id }, data: { status: CreativeJobStatus.RUNNING, progress: 5, startedAt: new Date(), attempts: { increment: 1 } } });
    let attemptRecord: { id: string } | null = null;
    try {
      attemptRecord = await this.prisma.creativeJobAttempt.create({
        data: { jobId: job.id, attempt: attemptNumber, provider: job.provider, model: job.model },
        select: { id: true },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        attemptRecord = await this.prisma.creativeJobAttempt.findUnique({ where: { jobId_attempt: { jobId: job.id, attempt: attemptNumber } }, select: { id: true } });
      } else throw error;
    }
    if (job.variantId) await this.prisma.creativeVariant.update({ where: { id: job.variantId }, data: { status: 'GENERATING' } });
    try {
      let output = await this.providers.generate(
        data.capability as CreativeCapability,
        data as any,
        data.provider,
      );
      this.outputValidation.validate(data.capability as CreativeCapability, output);
      const latestJob = await this.prisma.creativeJob.findFirst({ where: { id: job.id, organizationId: input.organizationId } });
      if (latestJob?.status === CreativeJobStatus.CANCELLED || latestJob?.status === CreativeJobStatus.REFUNDED) {
        if (attemptRecord) await this.prisma.creativeJobAttempt.update({ where: { id: attemptRecord.id }, data: { status: 'CANCELLED', completedAt: new Date() } });
        this.logger.warn(`Creative job ${job.id} completed after cancellation; output discarded`);
        return null;
      }
      output = await this.outputStorage.persist(output, { jobId: job.id, capability: data.capability as CreativeCapability });
      const outputJson = JSON.parse(JSON.stringify(output)) as Prisma.InputJsonValue;
      if (data.reservationId) await this.credits.settle(data.reservationId, job.costEstimate || 0);
      await this.prisma.creativeJob.update({ where: { id: job.id }, data: { status: CreativeJobStatus.SUCCEEDED, progress: 100, output: outputJson, costActual: job.costEstimate, completedAt: new Date() } });
      if (attemptRecord) await this.prisma.creativeJobAttempt.update({ where: { id: attemptRecord.id }, data: { status: 'SUCCEEDED', completedAt: new Date(), output: outputJson } });
      if (job.variantId) await this.prisma.creativeVariant.update({ where: { id: job.variantId }, data: { status: 'READY', videoUrl: output.url, thumbnailUrl: output.thumbnailUrl, output: outputJson } });
      if (job.projectId) await this.prisma.creativeProject.update({ where: { id: job.projectId }, data: { status: CreativeProjectStatus.REVIEW } });
      await this.prisma.creativeProvenance.create({ data: { organizationId: input.organizationId, projectId: job.projectId, variantId: job.variantId, operation: data.capability, provider: output.provider, model: output.model, inputHash: createHash('sha256').update(JSON.stringify(data)).digest('hex'), data: JSON.parse(JSON.stringify({ input: data, output })) as Prisma.InputJsonValue } });
      await this.webhooks.emit(input.organizationId, 'creative.job.completed', { jobId: job.id, projectId: job.projectId, variantId: job.variantId, output });
      await this.metrics.record({ organizationId: input.organizationId, projectId: job.projectId, jobId: job.id, event: 'creative.job.completed', provider: output.provider, model: output.model, value: job.costEstimate, metadata: { durationMs: Date.now() - job.createdAt.getTime() } });
      return output;
    } catch (error: any) {
      const message = error?.message || String(error);
      if (attemptRecord) await this.prisma.creativeJobAttempt.update({ where: { id: attemptRecord.id }, data: { status: 'FAILED', error: message, completedAt: new Date() } });
      const maxAttempts = Math.min(5, Math.max(1, Number(process.env.CREATIVE_MAX_ATTEMPTS || 3)));
      const status = Number(error?.status || error?.response?.status || 0);
      const retryable = status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
        || ['timeout', 'timed out', 'temporarily unavailable', 'econnreset', 'enotfound', 'socket hang up'].some((term) => message.toLowerCase().includes(term));
      if (retryable && attemptNumber < maxAttempts) {
        await this.prisma.creativeJob.update({ where: { id: job.id }, data: { status: CreativeJobStatus.RETRYABLE, error: message } });
        await this.metrics.record({ organizationId: input.organizationId, projectId: job.projectId, jobId: job.id, event: 'creative.job.retryable', value: attemptNumber, provider: job.provider || undefined, model: job.model || undefined, metadata: { error: message, attempt: attemptNumber, maxAttempts } });
        throw error;
      }
      if (data.reservationId) await this.credits.refund(data.reservationId, message);
      await this.prisma.creativeJob.update({ where: { id: job.id }, data: { status: CreativeJobStatus.FAILED, error: message, completedAt: new Date() } });
      if (job.variantId) await this.prisma.creativeVariant.update({ where: { id: job.variantId }, data: { status: 'FAILED', metadata: { error: message } as Prisma.InputJsonValue } });
      if (job.projectId) await this.prisma.creativeProject.update({ where: { id: job.projectId }, data: { status: CreativeProjectStatus.FAILED } });
      await this.webhooks.emit(input.organizationId, 'creative.job.failed', { jobId: job.id, projectId: job.projectId, variantId: job.variantId, error: message });
      await this.metrics.record({ organizationId: input.organizationId, projectId: job.projectId, jobId: job.id, event: 'creative.job.failed', value: 1, metadata: { error: message } });
      this.logger.error(`Creative Temporal activity failed for ${job.id}: ${message}`);
      throw error;
    }
  }

  async executeCreativeWorkflowRun(input: { runId: string; organizationId: string }) {
    return this.workflows.executeForWorker(input.runId, input.organizationId);
  }
}
