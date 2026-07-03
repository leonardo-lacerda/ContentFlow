import { EmailCampaignGenerateService } from '../email-campaign-generate.service';

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

describe('EmailCampaignGenerateService', () => {
  let service: EmailCampaignGenerateService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAIInstance.chat.completions.parse.mockReset();
    service = new EmailCampaignGenerateService(
      mockBrandProfileService as any,
      mockContentIdeaService as any,
      mockCarouselProjectService as any,
      mockGenerationJobService as any,
    );

    mockGenerationJobService.createJob.mockResolvedValue({ id: 'job-1' });
    mockBrandProfileService.getBrand.mockResolvedValue({
      id: 'brand-1',
      organizationId: 'org-1',
      name: 'Test Brand',
      industry: 'Tech',
    });
    mockBrandProfileService.getLatestDnaSnapshot.mockResolvedValue({
      voice: { tone: 'friendly' },
    });
    mockContentIdeaService.getIdea.mockResolvedValue(null);
    mockCarouselProjectService.getProject.mockResolvedValue(null);
  });

  it('should throw when brand not found', async () => {
    mockBrandProfileService.getBrand.mockResolvedValue(null);

    await expect(
      service.generateEmailCampaign('org-1', {
        brandProfileId: 'brand-1',
        campaignType: 'newsletter',
        name: 'Test Campaign',
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
      service.generateEmailCampaign('org-1', {
        brandProfileId: 'brand-1',
        campaignType: 'newsletter',
        name: 'Test',
      }),
    ).rejects.toThrow('Brand not found');
  });

  it('should create job with correct type', async () => {
    mockOpenAIInstance.chat.completions.parse.mockResolvedValue({
      choices: [{ message: { parsed: { subject: 'Test', blocks: [] } } }],
    });

    await service.generateEmailCampaign('org-1', {
      brandProfileId: 'brand-1',
      campaignType: 'promotional',
      name: 'Promo Email',
    }).catch(() => {});

    expect(mockGenerationJobService.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EMAIL_GENERATION',
        organizationId: 'org-1',
      }),
    );
  });

  it('should use content idea when provided', async () => {
    mockContentIdeaService.getIdea.mockResolvedValue({
      title: 'Idea Title',
      hook: 'Hook text',
      angle: 'Angle text',
    });

    mockOpenAIInstance.chat.completions.parse.mockResolvedValue({
      choices: [{ message: { parsed: { subject: 'Test', blocks: [] } } }],
    });

    await service.generateEmailCampaign('org-1', {
      brandProfileId: 'brand-1',
      contentIdeaId: 'idea-1',
      campaignType: 'newsletter',
      name: 'Newsletter',
    }).catch(() => {});

    expect(mockContentIdeaService.getIdea).toHaveBeenCalledWith('idea-1');
  });

  it('should use carousel project when provided', async () => {
    mockCarouselProjectService.getProject.mockResolvedValue({
      title: 'Carousel Title',
      caption: 'Carousel caption',
    });

    mockOpenAIInstance.chat.completions.parse.mockResolvedValue({
      choices: [{ message: { parsed: { subject: 'Test', blocks: [] } } }],
    });

    await service.generateEmailCampaign('org-1', {
      brandProfileId: 'brand-1',
      carouselProjectId: 'proj-1',
      campaignType: 'newsletter',
      name: 'Newsletter',
    }).catch(() => {});

    expect(mockCarouselProjectService.getProject).toHaveBeenCalledWith('proj-1');
  });

  it('should fail job on error', async () => {
    mockOpenAIInstance.chat.completions.parse.mockRejectedValue(new Error('API error'));

    await expect(
      service.generateEmailCampaign('org-1', {
        brandProfileId: 'brand-1',
        campaignType: 'newsletter',
        name: 'Test',
      }),
    ).rejects.toThrow();

    expect(mockGenerationJobService.failJob).toHaveBeenCalledWith('job-1', expect.any(String));
  });

  describe('renderHtml', () => {
    it('should render heading blocks', () => {
      const html = service.renderHtml({
        subject: 'Test',
        blocks: [{ type: 'heading', text: 'Hello', level: 1 }],
      });
      expect(html).toContain('<h1');
      expect(html).toContain('Hello');
    });

    it('should render text blocks', () => {
      const html = service.renderHtml({
        subject: 'Test',
        blocks: [{ type: 'text', content: 'Body text' }],
      });
      expect(html).toContain('<p');
      expect(html).toContain('Body text');
    });

    it('should render CTA blocks', () => {
      const html = service.renderHtml({
        subject: 'Test',
        blocks: [{ type: 'cta', text: 'Click Me', url: 'https://example.com', color: '#ff0000' }],
      });
      expect(html).toContain('<a href="https://example.com"');
      expect(html).toContain('Click Me');
      expect(html).toContain('#ff0000');
    });

    it('should render image blocks', () => {
      const html = service.renderHtml({
        subject: 'Test',
        blocks: [{ type: 'image', url: 'https://example.com/img.png', alt: 'Test image' }],
      });
      expect(html).toContain('<img src="https://example.com/img.png"');
      expect(html).toContain('Test image');
    });

    it('should render divider blocks', () => {
      const html = service.renderHtml({
        subject: 'Test',
        blocks: [{ type: 'divider' }],
      });
      expect(html).toContain('<hr');
    });

    it('should render spacer blocks', () => {
      const html = service.renderHtml({
        subject: 'Test',
        blocks: [{ type: 'spacer', height: 40 }],
      });
      expect(html).toContain('height:40px');
    });

    it('should wrap in proper HTML structure', () => {
      const html = service.renderHtml({
        subject: 'Test',
        blocks: [{ type: 'text', content: 'Content' }],
      });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<meta charset="utf-8">');
      expect(html).toContain('600');
    });
  });
});
