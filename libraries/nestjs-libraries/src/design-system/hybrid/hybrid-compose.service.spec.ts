import { HybridComposeService } from './hybrid-compose.service';

// Regression test for the 2026-08-20 audit finding: resolveBackground() used
// to fetch `backgroundUrl` (fully client-controlled via the
// POST /ai-generate/hybrid/recompose body) with a raw fetch, no SSRF guard —
// letting an attacker read internal services / cloud metadata endpoints and
// have the response embedded back into the generated image.
describe('HybridComposeService SSRF guard on resolveBackground', () => {
  const makeService = () => new HybridComposeService({} as any);

  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response('image-bytes', {
          status: 200,
          headers: { 'content-type': 'image/png' },
        })
      );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('blocks a loopback IP background URL without ever calling fetch', async () => {
    const service = makeService();
    const result = await (service as any).resolveBackground({
      backgroundUrl: 'http://127.0.0.1/admin',
    });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('blocks the cloud metadata IP', async () => {
    const service = makeService();
    const result = await (service as any).resolveBackground({
      backgroundUrl: 'http://169.254.169.254/latest/meta-data/',
    });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('blocks a plain-http absolute URL (guard requires https)', async () => {
    const service = makeService();
    const result = await (service as any).resolveBackground({
      backgroundUrl: 'http://example.com/bg.png',
    });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allows a public https URL through, pinned via the SSRF-safe dispatcher', async () => {
    const service = makeService();
    // dns.lookup for a real public hostname would hit the network in a unit
    // test; use a literal public IP so validation is synchronous/deterministic.
    const result = await (service as any).resolveBackground({
      backgroundUrl: 'https://93.184.216.34/bg.png',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.dispatcher).toBeDefined();
    expect(result).toBe('data:image/png;base64,aW1hZ2UtYnl0ZXM=');
  });

  it('resolves a relative backgroundUrl against MAIN_URL without the SSRF guard (same-origin by construction)', async () => {
    const originalMainUrl = process.env.MAIN_URL;
    process.env.MAIN_URL = 'https://app.contentflow.example';
    try {
      const service = makeService();
      const result = await (service as any).resolveBackground({
        backgroundUrl: '/uploads/org1/slide.png',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy.mock.calls[0][0]).toBe(
        'https://app.contentflow.example/uploads/org1/slide.png'
      );
      expect(result).toBe('data:image/png;base64,aW1hZ2UtYnl0ZXM=');
    } finally {
      process.env.MAIN_URL = originalMainUrl;
    }
  });
});
