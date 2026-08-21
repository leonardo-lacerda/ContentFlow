import 'reflect-metadata';
import { WordpressProvider } from './wordpress.provider';

// Regression test for the 2026-08-20 audit finding: `domain` is a
// user-entered custom-instance URL, and authenticate/postTypes/post all
// fetched it directly with no SSRF guard — an attacker could point `domain`
// at an internal service or cloud metadata endpoint and read the response
// back through the "connect" or "post types" flow.
describe('WordpressProvider SSRF guard', () => {
  const makeCode = (domain: string) =>
    Buffer.from(
      JSON.stringify({ domain, username: 'u', password: 'p' })
    ).toString('base64');

  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'x', avatar_urls: {} }), {
        status: 200,
      })
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('authenticate: never fetches a loopback domain', async () => {
    const provider = new WordpressProvider();
    const result = await provider.authenticate({
      code: makeCode('http://127.0.0.1:8080'),
      codeVerifier: 'x',
    });

    expect(result).toBe('Invalid credentials');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('authenticate: never fetches the cloud metadata endpoint', async () => {
    const provider = new WordpressProvider();
    const result = await provider.authenticate({
      code: makeCode('http://169.254.169.254'),
      codeVerifier: 'x',
    });

    expect(result).toBe('Invalid credentials');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('authenticate: allows a legitimate public domain through, pinned via the SSRF-safe dispatcher', async () => {
    const provider = new WordpressProvider();
    const result = await provider.authenticate({
      code: makeCode('https://93.184.216.34'),
      codeVerifier: 'x',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.dispatcher).toBeDefined();
    expect(result).not.toBe('Invalid credentials');
  });

  it('postTypes: rejects a private-network domain before fetching', async () => {
    const provider = new WordpressProvider();
    await expect(
      provider.postTypes(makeCode('http://192.168.1.1'))
    ).rejects.toThrow(/blocked/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
