import { MastodonProvider } from './mastodon.provider';
import { MastodonCustomProvider } from './mastodon.custom.provider';

// Regression test for the 2026-08-20 audit finding: MastodonCustomProvider's
// `externalUrl` and the shared `dynamicAuthenticate`/`dynamicPost`/
// `dynamicComment`/`uploadFile` methods fetched a user-supplied instance URL
// (the `externalUrl` query param on the auth-start route) directly, with no
// SSRF guard.
describe('Mastodon SSRF guard', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('MastodonCustomProvider.externalUrl', () => {
    it('never fetches a loopback instance URL', async () => {
      const provider = new MastodonCustomProvider();
      await expect(
        provider.externalUrl('http://127.0.0.1:9000')
      ).rejects.toThrow(/blocked/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('never fetches the cloud metadata endpoint', async () => {
      const provider = new MastodonCustomProvider();
      await expect(
        provider.externalUrl('http://169.254.169.254')
      ).rejects.toThrow(/blocked/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('allows a public instance URL through, pinned via the SSRF-safe dispatcher', async () => {
      const provider = new MastodonCustomProvider();
      await provider.externalUrl('https://93.184.216.34');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, opts] = fetchSpy.mock.calls[0];
      expect(opts.dispatcher).toBeDefined();
    });
  });

  describe('MastodonProvider.dynamicAuthenticate (shared by mastodon + mastodon-custom)', () => {
    it('never fetches a private-network instance URL', async () => {
      const provider = new MastodonProvider();
      await expect(
        (provider as any).dynamicAuthenticate(
          'client',
          'secret',
          'http://10.0.0.5',
          'code'
        )
      ).rejects.toThrow(/blocked/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('MastodonProvider.dynamicPost', () => {
    it('never fetches a private-network instance URL', async () => {
      const provider = new MastodonProvider();
      await expect(
        provider.dynamicPost('id', 'token', 'http://192.168.0.1', [
          { id: '1', message: 'hi' } as any,
        ])
      ).rejects.toThrow(/blocked/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
