import { KieCreativeProvider } from './kie-creative.provider';

describe('KieCreativeProvider', () => {
  const previous = { ...process.env };

  afterEach(() => {
    process.env = { ...previous };
  });

  it('exposes the configured Kie capabilities and maps Veo input', async () => {
    process.env.KIEAI_API_KEY = 'test-key';
    process.env.CREATIVE_KIE_ENABLED = 'true';
    process.env.CREATIVE_KIE_IMAGE_MODEL = 'gpt-image-1';
    process.env.CREATIVE_KIE_VIDEO_MODEL = 'veo3_fast';
    process.env.CREATIVE_KIE_TTS_MODEL = 'elevenlabs/text-to-speech-multilingual-v2';
    process.env.CREATIVE_KIE_TALKING_ACTOR_MODEL = 'kling/ai-avatar-standard';
    process.env.CREATIVE_KIE_LIP_SYNC_MODEL = 'kling/ai-avatar-standard';
    const client = {
      isConfigured: () => true,
      generateVeo: jest.fn().mockResolvedValue({ taskId: 'video-1', status: 'succeeded', url: 'https://cdn.example/video.mp4' }),
      createMarketTask: jest.fn(),
    } as any;
    const provider = new KieCreativeProvider(client);

    expect(provider.capabilities()).toEqual(expect.arrayContaining([
      'image-generation',
      'video-generation',
      'b-roll',
      'text-to-speech',
      'talking-actor',
      'lip-sync',
    ]));

    const output = await provider.generate('video-generation', {
      prompt: 'produto em uma mesa',
      aspectRatio: '16:9',
      imageUrls: ['https://cdn.example/product.png'],
      durationSec: 8,
    });

    expect(output).toEqual(expect.objectContaining({ provider: 'kie', model: 'veo3_fast', url: 'https://cdn.example/video.mp4' }));
    expect(client.generateVeo).toHaveBeenCalledWith(expect.objectContaining({
      aspectRatio: '16:9',
      imageUrls: ['https://cdn.example/product.png'],
      generationType: 'REFERENCE_2_VIDEO',
    }));
  });
});
