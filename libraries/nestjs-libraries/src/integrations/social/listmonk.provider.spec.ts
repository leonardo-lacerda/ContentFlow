import 'reflect-metadata';
import { ListmonkProvider } from './listmonk.provider';

// Regression test found during offensive re-validation of the 2026-08-20
// audit's Lemmy SSRF fix (lemmy.provider.spec.ts): the identical pattern
// (a user-supplied self-hosted instance URL, fetched with no SSRF guard)
// also existed here. Listmonk's own `customFields()` regex was even more
// permissive than Lemmy's — it explicitly ALLOWS `localhost` and raw IPs by
// design (matches an on-prem Listmonk install), so it never blocked an
// internal target at all.
describe('Listmonk SSRF guard', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const codeFor = (url: string) =>
    Buffer.from(
      JSON.stringify({ url, username: 'user', password: 'pw' })
    ).toString('base64');

  describe('ListmonkProvider.authenticate', () => {
    it('never fetches a loopback instance URL', async () => {
      const provider = new ListmonkProvider();
      await expect(
        provider.authenticate({ code: codeFor('http://127.0.0.1:9000'), codeVerifier: '' })
      ).rejects.toThrow(/blocked/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('never fetches the cloud metadata endpoint', async () => {
      const provider = new ListmonkProvider();
      await expect(
        provider.authenticate({ code: codeFor('http://169.254.169.254'), codeVerifier: '' })
      ).rejects.toThrow(/blocked/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('never fetches a private-network instance URL', async () => {
      const provider = new ListmonkProvider();
      await expect(
        provider.authenticate({ code: codeFor('http://10.0.0.5'), codeVerifier: '' })
      ).rejects.toThrow(/blocked/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('allows a public instance URL through, pinned via the SSRF-safe dispatcher', async () => {
      const provider = new ListmonkProvider();
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ 'app.site_name': 'test', 'app.logo_url': '' }), { status: 200 })
      );

      await provider.authenticate({ code: codeFor('https://93.184.216.34'), codeVerifier: '' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, opts] = fetchSpy.mock.calls[0];
      expect((opts as any).dispatcher).toBeDefined();
    });
  });
});
