import { CreativeOutputStorageService } from './creative-output-storage.service';

describe('CreativeOutputStorageService', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;

  afterEach(() => {
    if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it('keeps outputs already hosted by ContentFlow and records storage provenance', async () => {
    process.env.FRONTEND_URL = 'https://app.example.test';
    const service = new CreativeOutputStorageService();

    const result = await service.persist(
      { provider: 'contentflow', model: 'test-model', url: 'https://app.example.test/uploads/creative.mp4' },
      { jobId: 'job-1', capability: 'video-generation' },
    );

    expect(result.url).toBe('https://app.example.test/uploads/creative.mp4');
    expect(result.metadata).toEqual(expect.objectContaining({ storage: 'contentflow', sourceUrls: ['https://app.example.test/uploads/creative.mp4'] }));
  });

  it('rejects provider outputs that are not public HTTPS or ContentFlow uploads', async () => {
    const service = new CreativeOutputStorageService();

    await expect(service.persist(
      { provider: 'contentflow', model: 'test-model', url: 'http://127.0.0.1:5432/private.mp4' },
      { jobId: 'job-2', capability: 'video-generation' },
    )).rejects.toThrow('public HTTPS URL');
  });
});
