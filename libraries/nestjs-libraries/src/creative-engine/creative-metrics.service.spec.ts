import { CreativeMetricsService } from './creative-metrics.service';

describe('CreativeMetricsService quality summary', () => {
  it('computes success, approval, cost and p95 latency metrics', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { event: 'creative.job.completed', provider: 'p', model: 'm', value: 100, metadata: { durationMs: 100 }, createdAt: new Date() },
      { event: 'creative.job.completed', provider: 'p', model: 'm', value: 120, metadata: { durationMs: 200 }, createdAt: new Date() },
      { event: 'creative.job.failed', provider: 'p', model: 'm', value: 0, metadata: { durationMs: 300 }, createdAt: new Date() },
      { event: 'creative.review.approved', provider: 'p', model: 'm', value: 90, metadata: {}, createdAt: new Date() },
      { event: 'creative.review.rejected', provider: 'p', model: 'm', value: 20, metadata: {}, createdAt: new Date() },
    ]);
    const service = new CreativeMetricsService({ creativeMetricEvent: { findMany } } as any);

    const summary = await service.summary('org', 30);

    expect(summary.quality.completed).toBe(2);
    expect(summary.quality.failed).toBe(1);
    expect(summary.quality.successRate).toBeCloseTo(2 / 3);
    expect(summary.quality.approvalRate).toBeCloseTo(1 / 2);
    expect(summary.quality.costCredits).toBe(220);
    expect(summary.quality.p95LatencyMsByProviderModel[0].p95Ms).toBe(300);
  });
});
