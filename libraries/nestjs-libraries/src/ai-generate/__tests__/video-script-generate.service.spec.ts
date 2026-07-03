import { VideoScriptGenerateService } from '../video-script-generate.service';

// Use a shared mock object that jest.mock factory can access
const mockOpenAIInstance = {
  chat: {
    completions: {
      parse: jest.fn(),
    },
  },
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

const mockCarouselProjectService = {
  getProject: jest.fn(),
};

const mockGenerationJobService = {
  createJob: jest.fn(),
  startJob: jest.fn(),
  completeJob: jest.fn(),
  failJob: jest.fn(),
};

describe('VideoScriptGenerateService', () => {
  let service: VideoScriptGenerateService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAIInstance.chat.completions.parse.mockReset();
    service = new VideoScriptGenerateService(
      mockBrandProfileService as any,
      mockCarouselProjectService as any,
      mockGenerationJobService as any,
    );

    mockGenerationJobService.createJob.mockResolvedValue({ id: 'job-1' });
    mockBrandProfileService.getBrand.mockResolvedValue({
      id: 'brand-1',
      organizationId: 'org-1',
      name: 'Test Brand',
    });
    mockBrandProfileService.getLatestDnaSnapshot.mockResolvedValue({
      voice: { tone: 'professional' },
    });
    mockCarouselProjectService.getProject.mockResolvedValue({
      id: 'project-1',
      title: 'Test Carousel',
      caption: 'Test caption',
      slides: [{ headline: 'Slide 1', body: 'Body 1' }],
    });
  });

  it('should throw when brand not found', async () => {
    mockBrandProfileService.getBrand.mockResolvedValue(null);

    await expect(
      service.generateVideoScript('org-1', {
        brandProfileId: 'brand-1',
        carouselProjectId: 'project-1',
        format: 'reels',
      }),
    ).rejects.toThrow('Brand not found');
  });

  it('should throw when brand belongs to different org', async () => {
    mockBrandProfileService.getBrand.mockResolvedValue({
      id: 'brand-1',
      organizationId: 'other-org',
      name: 'Other Brand',
    });

    await expect(
      service.generateVideoScript('org-1', {
        brandProfileId: 'brand-1',
        carouselProjectId: 'project-1',
        format: 'reels',
      }),
    ).rejects.toThrow('Brand not found');
  });

  it('should throw when carousel project not found', async () => {
    mockCarouselProjectService.getProject.mockResolvedValue(null);

    await expect(
      service.generateVideoScript('org-1', {
        brandProfileId: 'brand-1',
        carouselProjectId: 'project-1',
        format: 'reels',
      }),
    ).rejects.toThrow('Carousel project not found');
  });

  it('should create and start a generation job', async () => {
    mockOpenAIInstance.chat.completions.parse.mockResolvedValue({
      choices: [{ message: { parsed: { title: 'Test', totalDuration: 15, scenes: [] } } }],
    });

    await service.generateVideoScript('org-1', {
      brandProfileId: 'brand-1',
      carouselProjectId: 'project-1',
      format: 'reels',
    }).catch(() => {});

    expect(mockGenerationJobService.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        brandProfileId: 'brand-1',
        type: 'VIDEO_SCRIPT',
      }),
    );
    expect(mockGenerationJobService.startJob).toHaveBeenCalledWith('job-1');
  });

  it('should fail job on error', async () => {
    mockOpenAIInstance.chat.completions.parse.mockRejectedValue(new Error('API error'));

    await expect(
      service.generateVideoScript('org-1', {
        brandProfileId: 'brand-1',
        carouselProjectId: 'project-1',
        format: 'reels',
      }),
    ).rejects.toThrow();

    expect(mockGenerationJobService.failJob).toHaveBeenCalledWith('job-1', expect.any(String));
  });
});
