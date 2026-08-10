import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreativeJobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CreativeMetricsService } from './creative-metrics.service';
import { CreativeWebhookService } from './creative-webhook.service';

type ReviewInput = {
  approved: boolean;
  score?: number;
  productFidelity?: number;
  lipSync?: number;
  captionAccuracy?: number;
  notes?: string;
};

@Injectable()
export class CreativeEvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: CreativeMetricsService,
    private readonly webhooks: CreativeWebhookService,
  ) {}

  async preflight(organizationId: string, jobId: string) {
    const job = await this.prisma.creativeJob.findFirst({ where: { id: jobId, organizationId } });
    if (!job) throw new NotFoundException('Creative job not found');
    const output = (job.output || {}) as Prisma.JsonObject;
    const terminalStatuses = new Set<CreativeJobStatus>([CreativeJobStatus.SUCCEEDED, CreativeJobStatus.FAILED, CreativeJobStatus.CANCELLED, CreativeJobStatus.REFUNDED]);
    const checks = {
      terminal: terminalStatuses.has(job.status),
      succeeded: job.status === CreativeJobStatus.SUCCEEDED,
      hasUrl: typeof output.url === 'string' && output.url.length > 0,
      hasProvider: typeof output.provider === 'string' && output.provider.length > 0,
      hasModel: typeof output.model === 'string' && output.model.length > 0,
    };
    const passed = Object.values(checks).filter(Boolean).length;
    const score = Math.round((passed / Object.keys(checks).length) * 100);
    const result = { jobId, status: job.status, provider: job.provider, model: job.model, score, checks };
    await this.metrics.record({
      organizationId,
      projectId: job.projectId,
      jobId,
      event: 'creative.quality.preflight',
      provider: job.provider,
      model: job.model,
      value: score,
      metadata: result,
    });
    return result;
  }

  async review(organizationId: string, jobId: string, input: ReviewInput) {
    const job = await this.prisma.creativeJob.findFirst({ where: { id: jobId, organizationId } });
    if (!job) throw new NotFoundException('Creative job not found');
    if (job.status !== CreativeJobStatus.SUCCEEDED) {
      throw new BadRequestException('Only successful creative jobs can receive a human review');
    }
    const score = Math.max(0, Math.min(100, Number(input.score ?? (input.approved ? 100 : 0))));
    const review = {
      approved: input.approved,
      score,
      productFidelity: input.productFidelity,
      lipSync: input.lipSync,
      captionAccuracy: input.captionAccuracy,
      notes: input.notes,
    };
    const persisted = await this.prisma.creativeReview.create({
      data: {
        organizationId,
        jobId,
        projectId: job.projectId,
        variantId: job.variantId,
        approved: input.approved,
        score,
        productFidelity: input.productFidelity,
        lipSync: input.lipSync,
        captionAccuracy: input.captionAccuracy,
        notes: input.notes,
      },
    });
    await this.metrics.record({
      organizationId,
      projectId: job.projectId,
      jobId,
      event: input.approved ? 'creative.review.approved' : 'creative.review.rejected',
      provider: job.provider,
      model: job.model,
      value: score,
      metadata: review,
    });
    await this.webhooks.emit(organizationId, 'creative.review.recorded', {
      jobId,
      projectId: job.projectId,
      variantId: job.variantId,
      review,
    });
    return { ...persisted, projectId: job.projectId, ...review };
  }

  async listReviews(organizationId: string, jobId?: string, variantId?: string) {
    return this.prisma.creativeReview.findMany({
      where: { organizationId, ...(jobId ? { jobId } : {}), ...(variantId ? { variantId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
