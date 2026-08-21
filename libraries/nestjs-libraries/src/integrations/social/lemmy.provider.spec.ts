import 'reflect-metadata';
import { LemmyProvider } from './lemmy.provider';

// Regression test for the 2026-08-20 audit finding: unlike MastodonProvider/
// MastodonCustomProvider and WordpressProvider (see mastodon.provider.spec.ts),
// LemmyProvider fetched a user-supplied Lemmy instance URL (the `service`
// custom field, base64-encoded into `authenticate`'s `code` param, and
// re-read from `Integration.customInstanceDetails` for every post/comment/
// search) with no SSRF guard at all — any self-registered account could
// point `service` at an internal address and have this backend issue
// authenticated requests to it.
describe('Lemmy SSRF guard', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ jwt: 'x' }), { status: 200 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const codeFor = (service: string) =>
    Buffer.from(
      JSON.stringify({ service, identifier: 'user', password: 'pw' })
    ).toString('base64');

  describe('LemmyProvider.authenticate', () => {
    it('never fetches a loopback/internal instance URL', async () => {
      const provider = new LemmyProvider();
      await expect(
        provider.authenticate({ code: codeFor('http://127.0.0.1:8536'), codeVerifier: '' })
      ).rejects.toThrow(/blocked/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('never fetches the cloud metadata endpoint', async () => {
      const provider = new LemmyProvider();
      await expect(
        provider.authenticate({ code: codeFor('http://169.254.169.254'), codeVerifier: '' })
      ).rejects.toThrow(/blocked/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('never fetches a private-network instance URL', async () => {
      const provider = new LemmyProvider();
      await expect(
        provider.authenticate({ code: codeFor('http://10.0.0.5'), codeVerifier: '' })
      ).rejects.toThrow(/blocked/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('allows a public instance URL through, pinned via the SSRF-safe dispatcher', async () => {
      const provider = new LemmyProvider();
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ jwt: 'token-123' }), { status: 200 })
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ person_view: { person: { id: 1, name: 'user' } } }),
          { status: 200 }
        )
      );

      await provider.authenticate({ code: codeFor('https://lemmy.world'), codeVerifier: '' });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      for (const call of fetchSpy.mock.calls) {
        expect((call[1] as any).dispatcher).toBeDefined();
      }
    });
  });
});
