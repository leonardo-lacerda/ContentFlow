import { CreativeRightsService } from './creative-rights.service';

describe('CreativeRightsService', () => {
  it('rejects rights grants for resources outside the organization', async () => {
    const prisma = {
      creativeActor: { findFirst: jest.fn().mockResolvedValue(null) },
    } as any;
    const service = new CreativeRightsService(prisma);

    await expect(service.grant('org-1', {
      resourceType: 'actor',
      resourceId: 'actor-from-another-org',
      consentReference: 'consent-1',
    })).rejects.toThrow('Creative actor not found');
  });
});
