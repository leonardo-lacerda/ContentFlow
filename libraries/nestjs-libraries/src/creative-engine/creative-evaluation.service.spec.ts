import { CreativeEvaluationService } from './creative-evaluation.service';

describe('CreativeEvaluationService', () => {
  it('persists a review with the owning project and variant', async () => {
    const prisma = {
      creativeJob: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'job-1',
          organizationId: 'org-1',
          projectId: 'project-1',
          variantId: 'variant-1',
          status: 'SUCCEEDED',
          provider: 'contentflow',
          model: 'test-model',
        }),
      },
      creativeReview: {
        create: jest.fn().mockResolvedValue({ id: 'review-1', organizationId: 'org-1', jobId: 'job-1', projectId: 'project-1', variantId: 'variant-1', approved: true, score: 92 }),
      },
    } as any;
    const metrics = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const webhooks = { emit: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new CreativeEvaluationService(prisma, metrics, webhooks);

    const result = await service.review('org-1', 'job-1', {
      approved: true,
      score: 92,
      productFidelity: 95,
      lipSync: 90,
      captionAccuracy: 91,
      notes: 'Approved after manual QA',
    });

    expect(prisma.creativeReview.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: 'org-1',
        jobId: 'job-1',
        projectId: 'project-1',
        variantId: 'variant-1',
        score: 92,
      }),
    }));
    expect(result).toEqual(expect.objectContaining({ id: 'review-1', projectId: 'project-1', score: 92 }));
    expect(metrics.record).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'project-1',
      event: 'creative.review.approved',
      value: 92,
    }));
  });
});
