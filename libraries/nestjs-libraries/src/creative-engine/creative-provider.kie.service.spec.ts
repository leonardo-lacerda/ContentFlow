import { CreativeProviderService } from './creative-provider.service';
import { KieCreativeProvider } from './providers/kie/kie-creative.provider';

describe('CreativeProviderService with Kie', () => {
  const previous = { ...process.env };

  afterEach(() => {
    process.env = { ...previous };
  });

  it('selects Kie automatically for configured media capabilities', () => {
    process.env.KIEAI_API_KEY = 'test-key';
    process.env.CREATIVE_KIE_ENABLED = 'true';
    const kie = new KieCreativeProvider({ isConfigured: () => true } as any);
    const service = new CreativeProviderService({} as any, {} as any, kie);

    expect(service.quote('video-generation', { prompt: 'test', durationSec: 5 })).toEqual(expect.objectContaining({
      provider: 'kie',
      model: 'veo3_fast',
    }));
    expect(service.listCapabilities()).toEqual(expect.arrayContaining([
      { provider: 'kie', capability: 'image-generation' },
      { provider: 'kie', capability: 'video-generation' },
      { provider: 'kie', capability: 'text-to-speech' },
    ]));
  });
});
