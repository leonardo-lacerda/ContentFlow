import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class CreativeMetricsService {
  private readonly logger = new Logger(CreativeMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    organizationId: string;
    projectId?: string | null;
    jobId?: string | null;
    workflowRunId?: string | null;
    event: string;
    provider?: string | null;
    model?: string | null;
    value?: number | null;
    metadata?: Record<string, unknown>;
  }) {
    try {
      return await this.prisma.creativeMetricEvent.create({
        data: {
          organizationId: input.organizationId,
          projectId: input.projectId,
          jobId: input.jobId,
          workflowRunId: input.workflowRunId,
          event: input.event,
          provider: input.provider,
          model: input.model,
          value: input.value,
          metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue : undefined,
        },
      });
    } catch (error) {
      this.logger.warn(`Unable to record creative metric ${input.event}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async summary(organizationId: string, days = 30) {
    const since = new Date(Date.now() - Math.min(365, Math.max(1, days)) * 24 * 60 * 60 * 1000);
    const events = await this.prisma.creativeMetricEvent.findMany({
      where: { organizationId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 10000,
      select: { event: true, provider: true, model: true, value: true, metadata: true, createdAt: true },
    });
    const grouped = new Map<string, { event: string; provider?: string | null; model?: string | null; count: number; totalValue: number }>();
    for (const event of events) {
      const key = `${event.event}:${event.provider || ''}:${event.model || ''}`;
      const current = grouped.get(key) || { event: event.event, provider: event.provider, model: event.model, count: 0, totalValue: 0 };
      current.count += 1;
      current.totalValue += Number(event.value || 0);
      grouped.set(key, current);
    }
    const latencyBuckets = new Map<string, number[]>();
    let completed = 0;
    let failed = 0;
    let approved = 0;
    let rejected = 0;
    let costCredits = 0;
    const providerQuality = new Map<string, { provider: string | null; model: string | null; completed: number; failed: number; approved: number; rejected: number; costCredits: number }>();
    for (const event of events) {
      if (event.event === 'creative.job.completed') completed += 1;
      if (event.event === 'creative.job.failed') failed += 1;
      if (event.event === 'creative.review.approved') approved += 1;
      if (event.event === 'creative.review.rejected') rejected += 1;
      if (event.event === 'creative.job.completed' && event.value) costCredits += Number(event.value);
      if (['creative.job.completed', 'creative.job.failed', 'creative.review.approved', 'creative.review.rejected'].includes(event.event)) {
        const key = `${event.provider || ''}:${event.model || ''}`;
        const current = providerQuality.get(key) || { provider: event.provider, model: event.model, completed: 0, failed: 0, approved: 0, rejected: 0, costCredits: 0 };
        if (event.event === 'creative.job.completed') { current.completed += 1; current.costCredits += Number(event.value || 0); }
        if (event.event === 'creative.job.failed') current.failed += 1;
        if (event.event === 'creative.review.approved') current.approved += 1;
        if (event.event === 'creative.review.rejected') current.rejected += 1;
        providerQuality.set(key, current);
      }
      const durationMs = Number((event.metadata as Record<string, unknown> | null)?.durationMs || 0);
      if (durationMs > 0) {
        const key = `${event.provider || ''}:${event.model || ''}`;
        const values = latencyBuckets.get(key) || [];
        values.push(durationMs);
        latencyBuckets.set(key, values);
      }
    }
    const p95 = (values: number[]) => {
      const ordered = [...values].sort((a, b) => a - b);
      return ordered.length ? ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * 0.95) - 1)] : null;
    };
    const p95LatencyMsByProviderModel = [...latencyBuckets.entries()].map(([key, values]) => {
      const [provider, model] = key.split(':');
      return { provider: provider || null, model: model || null, samples: values.length, p95Ms: p95(values) };
    });
    const totalOutcomes = completed + failed;
    const totalReviews = approved + rejected;
    return {
      since,
      totalEvents: events.length,
      groups: [...grouped.values()],
      quality: {
        completed,
        failed,
        successRate: totalOutcomes ? completed / totalOutcomes : null,
        approved,
        rejected,
        approvalRate: totalReviews ? approved / totalReviews : null,
        costCredits,
        byProviderModel: [...providerQuality.values()].map((item) => ({
          ...item,
          successRate: item.completed + item.failed ? item.completed / (item.completed + item.failed) : null,
          approvalRate: item.approved + item.rejected ? item.approved / (item.approved + item.rejected) : null,
        })),
        p95LatencyMsByProviderModel,
      },
    };
  }
}
