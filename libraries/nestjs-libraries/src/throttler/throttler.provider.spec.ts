import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerBehindProxyGuard } from './throttler.provider';

const buildContext = (
  overrides: {
    url?: string;
    method?: string;
    org?: any;
  } = {}
): ExecutionContext => {
  const request = {
    url: overrides.url ?? '/posts',
    method: overrides.method ?? 'GET',
    org: overrides.org,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
};

describe('ThrottlerBehindProxyGuard', () => {
  let guard: ThrottlerBehindProxyGuard;
  let superCanActivate: jest.SpyInstance;

  beforeEach(() => {
    guard = new ThrottlerBehindProxyGuard(
      { throttlers: [{ ttl: 3600000, limit: 30 }] } as any,
      { increment: jest.fn() } as any,
      new Reflector()
    );

    // The base ThrottlerGuard pulls in storage/reflector machinery we don't
    // want to exercise here — we only care whether *our* override decides to
    // delegate to it or not.
    superCanActivate = jest
      .spyOn(ThrottlerGuard.prototype, 'canActivate')
      .mockResolvedValue(true);
  });

  afterEach(() => {
    superCanActivate.mockRestore();
  });

  describe('canActivate', () => {
    it('delegates to the base throttler for POST /public/v1/posts', async () => {
      const context = buildContext({
        method: 'POST',
        url: '/public/v1/posts',
        org: { id: 'org-1' },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(superCanActivate).toHaveBeenCalledWith(context);
    });

    it('delegates to the base throttler for anonymous requests (no org attached, e.g. /auth/login or /public/*)', async () => {
      const context = buildContext({ method: 'POST', url: '/auth/login' });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(superCanActivate).toHaveBeenCalledWith(context);
    });

    it('skips throttling for authenticated dashboard traffic outside the public posting API', async () => {
      const context = buildContext({
        method: 'GET',
        url: '/posts',
        org: { id: 'org-1' },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(superCanActivate).not.toHaveBeenCalled();
    });
  });

  describe('getTracker', () => {
    const getTracker = (req: Record<string, any>): Promise<string> =>
      (guard as any).getTracker(req);

    it('tracks authenticated traffic per-organization, separating /posts from other routes', async () => {
      await expect(
        getTracker({ org: { id: 'org-1' }, url: '/posts/123' })
      ).resolves.toBe('org-1_posts');

      await expect(
        getTracker({ org: { id: 'org-1' }, url: '/integrations' })
      ).resolves.toBe('org-1_other');
    });

    it('falls back to tracking anonymous requests by IP', async () => {
      await expect(
        getTracker({ url: '/auth/login', ip: '1.2.3.4', ips: [] })
      ).resolves.toBe('anon_1.2.3.4');
    });

    it('prefers the left-most proxied IP when the request has been forwarded', async () => {
      await expect(
        getTracker({
          url: '/auth/login',
          ip: '1.2.3.4',
          ips: ['5.6.7.8', '1.2.3.4'],
        })
      ).resolves.toBe('anon_5.6.7.8');
    });
  });
});
