import { AdCreativeGenerateService } from '../ad-creative-generate.service';

const mockOpenAIInstance = {
  chat: { completions: { parse: jest.fn() } },
};

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockOpenAIInstance),
}));

jest.mock('openai/helpers/zod', () => ({
  zodResponseFormat: jest.fn().mockReturnValue({}),
}));

const mockBrandProfileService = {
  getBrand: jest.fn(),
  getLatestDnaSnapshot: jest.fn(),
};

const mockContentIdeaService = {
  getIdea: jest.fn(),
};

const mockCarouselProjectService = {
  getProject: jest.fn(),
};

const mockGenerationJobService = {
  createJob: jest.fn(),
  startJob: jest.fn(),
  completeJob: jest.fn(),
  failJob: jest.fn(),
};

const mockPrismaService = {
  adCreative: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

describe('AdCreativeGenerateService', () => {
  let service: AdCreativeGenerateService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAIInstance.chat.completions.parse.mockReset();
    service = new AdCreativeGenerateService(
      mockBrandProfileService as any,
      mockContentIdeaService as any,
      mockCarouselProjectService as any,
      mockGenerationJobService as any,
      mockPrismaService as any,
    );

    mockGenerationJobService.createJob.mockResolvedValue({ id: 'job-1' });
    mockBrandProfileService.getBrand.mockResolvedValue({
      id: 'brand-1',
      organizationId: 'org-1',
      name: 'Test Brand',
      industry: 'E-commerce',
    });
    mockBrandProfileService.getLatestDnaSnapshot.mockResolvedValue({
      voice: { tone: 'persuasive' },
      audience: { demographics: '25-45' },
    });
    mockContentIdeaService.getIdea.mockResolvedValue(null);
  });

  it('should throw when brand not found', async () => {
    mockBrandProfileService.getBrand.mockResolvedValue(null);

    await expect(
      service.generateAdCreatives('org-1', {
        brandProfileId: 'brand-1',
        platforms: ['META_INSTAGRAM'],
        objective: 'CONVERSION',
        adType: 'AUTO',
        contentObjective: 'Test product',
      }),
    ).rejects.toThrow('Brand not found');
  });

  it('should throw when brand belongs to different org', async () => {
    mockBrandProfileService.getBrand.mockResolvedValue({
      id: 'brand-1',
      organizationId: 'other-org',
      name: 'Other',
    });

    await expect(
      service.generateAdCreatives('org-1', {
        brandProfileId: 'brand-1',
        platforms: ['META_INSTAGRAM'],
        objective: 'CONVERSION',
        adType: 'AUTO',
        contentObjective: 'Test product',
      }),
    ).rejects.toThrow('Brand not found');
  });

  it('should throw when no source content provided', async () => {
    await expect(
      service.generateAdCreatives('org-1', {
        brandProfileId: 'brand-1',
        platforms: ['META_INSTAGRAM'],
        objective: 'CONVERSION',
        adType: 'AUTO',
      }),
    ).rejects.toThrow('Either contentIdeaId, carouselProjectId, or contentObjective must be provided');
  });

  it('should create job with correct type and provider', async () => {
    mockOpenAIInstance.chat.completions.parse.mockResolvedValue({
      choices: [{ message: { parsed: { ads: [] } } }],
    });

    await service.generateAdCreatives('org-1', {
      brandProfileId: 'brand-1',
      platforms: ['META_INSTAGRAM', 'LINKEDIN'],
      objective: 'AWARENESS',
      adType: 'AUTO',
      contentObjective: 'Test promotion',
    }).catch(() => {});

    expect(mockGenerationJobService.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'AD_CREATIVE_GENERATION',
        model: 'gpt-4.1',
        provider: 'openai',
        organizationId: 'org-1',
        brandProfileId: 'brand-1',
      }),
    );
  });

  it('should use content idea when provided', async () => {
    mockContentIdeaService.getIdea.mockResolvedValue({
      title: 'Sale Idea',
      hook: '50% off!',
      goal: 'Drive sales',
      angle: 'Urgency',
    });

    mockOpenAIInstance.chat.completions.parse.mockResolvedValue({
      choices: [{ message: { parsed: { ads: [] } } }],
    });

    await service.generateAdCreatives('org-1', {
      brandProfileId: 'brand-1',
      contentIdeaId: 'idea-1',
      platforms: ['META_INSTAGRAM'],
      objective: 'CONVERSION',
      adType: 'AUTO',
    }).catch(() => {});

    expect(mockContentIdeaService.getIdea).toHaveBeenCalledWith('idea-1', 'org-1');
  });

  it('should fail job on error', async () => {
    mockOpenAIInstance.chat.completions.parse.mockRejectedValue(new Error('Rate limited'));

    await expect(
      service.generateAdCreatives('org-1', {
        brandProfileId: 'brand-1',
        platforms: ['META_INSTAGRAM'],
        objective: 'CONVERSION',
        adType: 'AUTO',
        contentObjective: 'Test product',
      }),
    ).rejects.toThrow();

    expect(mockGenerationJobService.failJob).toHaveBeenCalledWith('job-1', expect.any(String));
  });

  it('should complete job on success', async () => {
    const mockResult = {
      ads: [
        {
          platform: 'META_INSTAGRAM',
          type: 'STATIC',
          objective: 'CONVERSION',
          headline: 'Buy Now',
          primaryText: 'Great deal',
          ctaButton: 'SHOP_NOW',
          policyWarnings: [],
          claimsFlags: [],
        },
      ],
    };
    mockOpenAIInstance.chat.completions.parse.mockResolvedValue({
      choices: [{ message: { parsed: mockResult } }],
    });

    await service.generateAdCreatives('org-1', {
      brandProfileId: 'brand-1',
      platforms: ['META_INSTAGRAM'],
      objective: 'CONVERSION',
      adType: 'STATIC',
      contentObjective: 'Test product',
    }).catch(() => {});

    expect(mockGenerationJobService.completeJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ ads: expect.any(Array) }),
    );
  });

  it('should save ad creatives to database', async () => {
    mockPrismaService.adCreative.create.mockResolvedValue({ id: 'ad-1' });

    const batch = {
      ads: [
        {
          platform: 'META_FACEBOOK',
          type: 'STATIC',
          objective: 'CONVERSION',
          headline: 'Test',
          primaryText: 'Test text',
          ctaButton: 'LEARN_MORE',
          policyWarnings: [],
          claimsFlags: [],
        },
      ],
    };

    const result = await service.saveAdCreatives('org-1', batch, {
      brandProfileId: 'brand-1',
    });

    expect(result).toHaveLength(1);
    expect(mockPrismaService.adCreative.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          brandProfileId: 'brand-1',
          headline: 'Test',
          status: 'DRAFT',
        }),
      }),
    );
  });

  it('should soft delete ad creative', async () => {
    mockPrismaService.adCreative.findFirst.mockResolvedValue({
      id: 'ad-1',
      organizationId: 'org-1',
    });
    mockPrismaService.adCreative.update.mockResolvedValue({ id: 'ad-1' });

    await service.deleteAdCreative('org-1', 'ad-1');

    expect(mockPrismaService.adCreative.update).toHaveBeenCalledWith({
      where: { id: 'ad-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
