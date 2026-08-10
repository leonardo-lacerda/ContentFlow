import { CreativeProviderService } from './creative-provider.service';

describe('CreativeProviderService', () => {
  const previous = {
    talkingActorUrl: process.env.CREATIVE_TALKING_ACTOR_URL,
    lipSyncUrl: process.env.CREATIVE_LIP_SYNC_URL,
    lipSyncToken: process.env.CREATIVE_LIP_SYNC_TOKEN,
    lipSyncModel: process.env.CREATIVE_LIP_SYNC_MODEL,
    imageUrl: process.env.CREATIVE_IMAGE_URL,
    imageProvider: process.env.CREATIVE_IMAGE_PROVIDER,
    openaiKey: process.env.OPENAI_API_KEY,
    pollAttempts: process.env.CREATIVE_PROVIDER_POLL_ATTEMPTS,
    pollInterval: process.env.CREATIVE_PROVIDER_POLL_INTERVAL_MS,
  };

  afterEach(() => {
    if (previous.talkingActorUrl === undefined) delete process.env.CREATIVE_TALKING_ACTOR_URL;
    else process.env.CREATIVE_TALKING_ACTOR_URL = previous.talkingActorUrl;
    if (previous.lipSyncUrl === undefined) delete process.env.CREATIVE_LIP_SYNC_URL;
    else process.env.CREATIVE_LIP_SYNC_URL = previous.lipSyncUrl;
    if (previous.lipSyncToken === undefined) delete process.env.CREATIVE_LIP_SYNC_TOKEN;
    else process.env.CREATIVE_LIP_SYNC_TOKEN = previous.lipSyncToken;
    if (previous.lipSyncModel === undefined) delete process.env.CREATIVE_LIP_SYNC_MODEL;
    else process.env.CREATIVE_LIP_SYNC_MODEL = previous.lipSyncModel;
    if (previous.imageUrl === undefined) delete process.env.CREATIVE_IMAGE_URL;
    else process.env.CREATIVE_IMAGE_URL = previous.imageUrl;
    if (previous.imageProvider === undefined) delete process.env.CREATIVE_IMAGE_PROVIDER;
    else process.env.CREATIVE_IMAGE_PROVIDER = previous.imageProvider;
    if (previous.openaiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous.openaiKey;
    if (previous.pollAttempts === undefined) delete process.env.CREATIVE_PROVIDER_POLL_ATTEMPTS;
    else process.env.CREATIVE_PROVIDER_POLL_ATTEMPTS = previous.pollAttempts;
    if (previous.pollInterval === undefined) delete process.env.CREATIVE_PROVIDER_POLL_INTERVAL_MS;
    else process.env.CREATIVE_PROVIDER_POLL_INTERVAL_MS = previous.pollInterval;
  });

  it('registers the configured lip-sync contract and quotes it', () => {
    process.env.CREATIVE_LIP_SYNC_URL = 'https://provider.example/lip-sync';
    process.env.CREATIVE_LIP_SYNC_MODEL = 'licensed-lip-sync-v1';
    const service = new CreativeProviderService({} as any, {} as any);

    expect(service.listCapabilities()).toEqual(expect.arrayContaining([
      { provider: 'lip-sync-http', capability: 'lip-sync' },
    ]));
    expect(service.quote('lip-sync', {
      prompt: 'sync',
      videoUrl: 'https://cdn.example/video.mp4',
      audioUrl: 'https://cdn.example/audio.mp3',
      durationSec: 10,
    }, 'lip-sync-http')).toEqual(expect.objectContaining({
      provider: 'lip-sync-http',
      model: 'licensed-lip-sync-v1',
      estimatedCredits: 325,
    }));
  });

  it('polls an asynchronous HTTP provider until it returns an output', async () => {
    process.env.CREATIVE_TALKING_ACTOR_URL = 'https://provider.example/talking-actor';
    process.env.CREATIVE_PROVIDER_POLL_ATTEMPTS = '1';
    process.env.CREATIVE_PROVIDER_POLL_INTERVAL_MS = '250';
    const originalFetch = global.fetch;
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'task-1', status: 'queued' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'completed', output: { url: 'https://cdn.example/talking.mp4' } }) });
    global.fetch = fetchMock as any;
    try {
      const service = new CreativeProviderService({} as any, {} as any);
      const output = await service.generate('talking-actor', { prompt: 'hello' }, 'talking-actor-http');
      expect(output).toEqual(expect.objectContaining({ url: 'https://cdn.example/talking.mp4', provider: 'talking-actor-http' }));
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('falls back to the ContentFlow provider when the configured provider fails', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.CREATIVE_IMAGE_URL = 'https://provider.example/image';
    process.env.CREATIVE_IMAGE_PROVIDER = 'image-http';
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockRejectedValue(new Error('provider timeout'));
    global.fetch = fetchMock as any;
    const openaiService = {
      generateImage: jest.fn().mockResolvedValue('https://cdn.example/fallback.png'),
    };
    try {
      const service = new CreativeProviderService(openaiService as any, {} as any);
      const output = await service.generate('image-generation', { prompt: 'fallback' });
      expect(output).toEqual(expect.objectContaining({
        provider: 'contentflow',
        url: 'https://cdn.example/fallback.png',
      }));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
