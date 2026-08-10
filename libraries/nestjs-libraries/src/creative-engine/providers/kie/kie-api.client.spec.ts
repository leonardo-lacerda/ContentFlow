import { KieApiClient } from './kie-api.client';

describe('KieApiClient', () => {
  const previous = { ...process.env };

  afterEach(() => {
    process.env = { ...previous };
    jest.restoreAllMocks();
  });

  it('creates and polls a Veo task until a video URL is available', async () => {
    process.env.KIEAI_API_KEY = 'test-key';
    process.env.CREATIVE_KIE_ENABLED = 'true';
    process.env.CREATIVE_KIE_POLL_INTERVAL_MS = '250';
    process.env.CREATIVE_KIE_MAX_POLL_ATTEMPTS = '2';
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ code: 200, data: { taskId: 'veo-1' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ code: 200, data: { response: { status: 'processing' } } }) } as Response)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ code: 200, data: { response: { status: 'succeeded', resultUrls: ['https://cdn.example/video.mp4'] } } }) } as Response);

    const result = await new KieApiClient().generateVeo({ prompt: 'a product video' });

    expect(result).toEqual(expect.objectContaining({ taskId: 'veo-1', url: 'https://cdn.example/video.mp4', status: 'succeeded' }));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.kie.ai/api/v1/veo/generate');
  });

  it('normalizes a market model audio result', async () => {
    process.env.KIEAI_API_KEY = 'test-key';
    process.env.CREATIVE_KIE_POLL_INTERVAL_MS = '250';
    process.env.CREATIVE_KIE_MAX_POLL_ATTEMPTS = '1';
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ code: 200, data: { taskId: 'tts-1' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ code: 200, data: { status: 'completed', output: { audio_url: 'https://cdn.example/audio.mp3' } } }) } as Response);

    const result = await new KieApiClient().createMarketTask('elevenlabs/text-to-speech-multilingual-v2', { text: 'Olá' });

    expect(result).toEqual(expect.objectContaining({ taskId: 'tts-1', audioUrl: 'https://cdn.example/audio.mp3' }));
  });
});
