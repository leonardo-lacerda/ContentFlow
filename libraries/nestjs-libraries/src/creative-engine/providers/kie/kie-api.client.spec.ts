import {
  KieApiClient,
  normalizeKieGptImageAspectRatio,
  normalizeKieGptImage2AspectRatio,
} from './kie-api.client';

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

  it('defaults the generic GPT image alias to the GPT Image 2 text-to-image contract', async () => {
    process.env.KIEAI_API_KEY = 'test-key';
    process.env.CREATIVE_KIE_POLL_INTERVAL_MS = '250';
    process.env.CREATIVE_KIE_MAX_POLL_ATTEMPTS = '1';
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ code: 200, data: { taskId: 'image-1' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ code: 200, data: { status: 'completed', resultUrls: ['https://cdn.example/image.png'] } }) } as Response);

    await new KieApiClient().generateImage('gpt-image-1', {
      prompt: 'carousel cover',
      aspectRatio: '4:5',
    });

    const request = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    // 4:5 is natively supported by GPT Image 2, unlike 1.5 which had to
    // lossily snap it to 2:3.
    expect(request).toEqual({
      model: 'gpt-image-2-text-to-image',
      input: {
        prompt: 'carousel cover',
        aspect_ratio: '4:5',
      },
    });
    expect(JSON.stringify(request)).not.toContain('response_format');
    expect(JSON.stringify(request)).not.toContain('quality');
  });

  it('uses the GPT Image 2 image-to-image contract when references are present', async () => {
    process.env.KIEAI_API_KEY = 'test-key';
    process.env.CREATIVE_KIE_POLL_INTERVAL_MS = '250';
    process.env.CREATIVE_KIE_MAX_POLL_ATTEMPTS = '1';
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ code: 200, data: { taskId: 'image-2' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ code: 200, data: { status: 'completed', resultUrls: ['https://cdn.example/image-2.png'] } }) } as Response);

    await new KieApiClient().generateImage('gpt-image-2', {
      prompt: 'place the product on a table',
      imageUrls: ['https://cdn.example/product.png'],
      aspectRatio: '1:1',
    });

    const request = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(request).toEqual({
      model: 'gpt-image-2-image-to-image',
      input: {
        prompt: 'place the product on a table',
        input_urls: ['https://cdn.example/product.png'],
        aspect_ratio: '1:1',
      },
    });
  });

  it('still honors an explicit GPT Image 1.5 pin', async () => {
    process.env.KIEAI_API_KEY = 'test-key';
    process.env.CREATIVE_KIE_POLL_INTERVAL_MS = '250';
    process.env.CREATIVE_KIE_MAX_POLL_ATTEMPTS = '1';
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ code: 200, data: { taskId: 'image-3' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ code: 200, data: { status: 'completed', resultUrls: ['https://cdn.example/image-3.png'] } }) } as Response);

    await new KieApiClient().generateImage('gpt-image-1.5', {
      prompt: 'carousel cover',
      aspectRatio: '4:5',
    });

    const request = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(request).toEqual({
      model: 'gpt-image/1.5-text-to-image',
      input: {
        prompt: 'carousel cover',
        aspect_ratio: '2:3',
        quality: 'medium',
      },
    });
  });

  it.each([
    ['1:1', '1:1'],
    ['4:4', '1:1'],
    ['4:5', '2:3'],
    ['3:4', '2:3'],
    ['9:16', '2:3'],
    ['16:9', '3:2'],
    ['4:3', '3:2'],
    ['1080x1350', '2:3'],
  ])('maps %s to the nearest Kie GPT Image 1.5 ratio %s', (input, expected) => {
    expect(normalizeKieGptImageAspectRatio(input)).toBe(expected);
  });

  it.each([
    ['1:1', '1:1'],
    ['4:5', '4:5'],
    ['9:16', '9:16'],
    ['16:9', '16:9'],
    ['auto', 'auto'],
    ['square', '1:1'],
    ['1080x1350', '4:5'],
    ['', 'auto'],
  ])('maps %s to the GPT Image 2 ratio %s', (input, expected) => {
    expect(normalizeKieGptImage2AspectRatio(input)).toBe(expected);
  });
});
