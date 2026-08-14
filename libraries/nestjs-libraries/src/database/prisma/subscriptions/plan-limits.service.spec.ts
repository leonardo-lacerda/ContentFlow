import { PlanLimitsService } from './plan-limits.service';

describe('PlanLimitsService compatibility facade', () => {
  it('does not block image generation when the retired monthly count is exhausted', async () => {
    const prisma = {
      generationJob: { count: jest.fn().mockResolvedValue(10) },
      creativeJob: { count: jest.fn().mockResolvedValue(0) },
    } as any;
    const entitlements = {
      assertFeature: jest
        .fn()
        .mockResolvedValue({ plan: 'AGENCY', capacities: { brands: 200 } }),
    } as any;
    const service = new PlanLimitsService(prisma, entitlements);

    await expect(
      service.enforceLimit('org-agency', 'image_generation')
    ).resolves.toEqual({
      allowed: true,
      current: 10,
      limit: -1,
      plan: 'AGENCY',
    });
  });
});
