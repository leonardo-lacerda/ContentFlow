// BlueskyProvider transitively imports `sharp` (native binding, unavailable
// in this test environment) via its media-upload path — stub it out, same
// rationale as the other provider SSRF specs that avoid heavy transitive
// dependencies.
jest.mock('sharp', () => jest.fn());

// Mock the actual network-touching pieces of @atproto/api so this test can
// prove the SSRF guard fires BEFORE any agent is ever constructed — a
// same-string return value from `authenticate()`'s catch-all error handling
// wouldn't distinguish "blocked by the guard" from "the fetch itself simply
// failed" (which it well might for a bogus loopback port even with no
// guard at all), so asserting on the mock call is the only way to actually
// prove the fix.
const bskyAgentCtor = jest.fn();
jest.mock('@atproto/api', () => ({
  BskyAgent: bskyAgentCtor,
  AtpAgent: jest.fn(),
  RichText: jest.fn(),
}));

import { BlueskyProvider } from './bluesky.provider';

// Regression test found during offensive re-validation of the 2026-08-20
// audit's Lemmy/Listmonk SSRF fixes: the identical "user-supplied custom
// instance URL, fetched with no SSRF guard" pattern also existed in
// BlueskyProvider's `service` field — its own regex allows raw IPs with no
// private-range exclusion. Unlike Lemmy/Listmonk, Bluesky's HTTP calls go
// through the third-party `@atproto/api` client rather than a direct
// `fetch()` this codebase's ssrfSafeDispatcher can attach to, so the fix
// validates the URL before constructing the agent at all.
describe('Bluesky SSRF guard', () => {
  beforeEach(() => {
    bskyAgentCtor.mockClear();
  });

  const codeFor = (service: string) =>
    Buffer.from(
      JSON.stringify({ service, identifier: 'user.bsky.social', password: 'pw' })
    ).toString('base64');

  describe('BlueskyProvider.authenticate', () => {
    it('never constructs an agent for a loopback instance URL', async () => {
      const provider = new BlueskyProvider();
      await provider.authenticate({ code: codeFor('http://127.0.0.1:2583'), codeVerifier: '' });
      expect(bskyAgentCtor).not.toHaveBeenCalled();
    });

    it('never constructs an agent for the cloud metadata endpoint', async () => {
      const provider = new BlueskyProvider();
      await provider.authenticate({ code: codeFor('http://169.254.169.254'), codeVerifier: '' });
      expect(bskyAgentCtor).not.toHaveBeenCalled();
    });

    it('never constructs an agent for a private-network instance URL', async () => {
      const provider = new BlueskyProvider();
      await provider.authenticate({ code: codeFor('http://10.0.0.5'), codeVerifier: '' });
      expect(bskyAgentCtor).not.toHaveBeenCalled();
    });

    it('does construct an agent for a public service URL', async () => {
      bskyAgentCtor.mockImplementation(() => ({
        login: jest.fn().mockResolvedValue({
          data: { accessJwt: 'a', refreshJwt: 'r', handle: 'h', did: 'd' },
        }),
        getProfile: jest.fn().mockResolvedValue({ data: { handle: 'h' } }),
      }));
      const provider = new BlueskyProvider();
      await provider.authenticate({ code: codeFor('https://bsky.social'), codeVerifier: '' });
      expect(bskyAgentCtor).toHaveBeenCalledWith(
        expect.objectContaining({ service: 'https://bsky.social' })
      );
    });
  });
});
