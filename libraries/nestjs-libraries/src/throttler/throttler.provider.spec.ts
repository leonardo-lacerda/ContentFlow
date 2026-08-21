import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

jest.mock('@gitroom/nestjs-libraries/redis/redis.service', () => ({
  ioRedis: { incr: jest.fn(), expire: jest.fn() },
}));

import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { ThrottlerBehindProxyGuard } from './throttler.provider';

const buildContext = (
  overrides: {
    url?: string;
    method?: string;
    org?: any;
    body?: any;
  } = {}
): ExecutionContext => {
  const request = {
    url: overrides.url ?? '/posts',
    method: overrides.method ?? 'GET',
    org: overrides.org,
    body: overrides.body,
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

    (ioRedis.incr as jest.Mock).mockReset().mockResolvedValue(1);
    (ioRedis.expire as jest.Mock).mockReset().mockResolvedValue(1);
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

    it('rate limits authenticated dashboard traffic outside the public posting API', async () => {
      const context = buildContext({
        method: 'GET',
        url: '/posts',
        org: { id: 'org-1' },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('rate limits authenticated billing reads used by the credit UI', async () => {
      const context = buildContext({
        method: 'GET',
        url: '/billing/v2/account',
        org: { id: 'org-1' },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(superCanActivate).not.toHaveBeenCalled();
    });

    // Regression coverage for the 2026-08-20 audit finding: /auth/login was
    // throttled only per-IP, so a distributed attacker (many source IPs)
    // could still brute-force one victim's password without ever tripping
    // the IP bucket.
    describe('per-email login throttle', () => {
      it('increments an email-keyed Redis bucket for a login attempt with an email body', async () => {
        const context = buildContext({
          method: 'POST',
          url: '/auth/login',
          body: { email: 'Victim@Example.com', password: 'x' },
        });

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(ioRedis.incr).toHaveBeenCalledWith(
          expect.stringContaining('throttle:login-email:victim@example.com:')
        );
        // Still falls through to the existing per-IP anonymous bucket too.
        expect(superCanActivate).toHaveBeenCalledWith(context);
      });

      it('blocks the 11th attempt within the hour for the same email, regardless of IP', async () => {
        (ioRedis.incr as jest.Mock).mockResolvedValue(11);
        const context = buildContext({
          method: 'POST',
          url: '/auth/login',
          body: { email: 'victim@example.com', password: 'x' },
        });

        await expect(guard.canActivate(context)).rejects.toThrow();
        // Rejected before ever reaching the per-IP bucket.
        expect(superCanActivate).not.toHaveBeenCalled();
      });

      it('skips the email bucket (but still delegates to the IP bucket) when no email is present in the body', async () => {
        const context = buildContext({ method: 'POST', url: '/auth/login' });

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(ioRedis.incr).not.toHaveBeenCalled();
        expect(superCanActivate).toHaveBeenCalledWith(context);
      });
    });

    // Same fix applied to registration and password-reset requests, which
    // the 2026-08-20 audit found were still IP-only: an attacker distributed
    // across many IPs could otherwise hammer one target email with account-
    // creation or reset-request spam without ever tripping a single bucket.
    describe('per-email register/forgot throttle', () => {
      it('increments an email-keyed Redis bucket for /auth/register', async () => {
        const context = buildContext({
          method: 'POST',
          url: '/auth/register',
          body: { email: 'Victim@Example.com', password: 'x', company: 'x' },
        });

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(ioRedis.incr).toHaveBeenCalledWith(
          expect.stringContaining('throttle:register-email:victim@example.com:')
        );
        expect(superCanActivate).toHaveBeenCalledWith(context);
      });

      it('blocks the 6th /auth/register attempt within the hour for the same email, regardless of IP', async () => {
        (ioRedis.incr as jest.Mock).mockResolvedValue(6);
        const context = buildContext({
          method: 'POST',
          url: '/auth/register',
          body: { email: 'victim@example.com' },
        });

        await expect(guard.canActivate(context)).rejects.toThrow();
        expect(superCanActivate).not.toHaveBeenCalled();
      });

      it('increments an email-keyed Redis bucket for /auth/forgot', async () => {
        const context = buildContext({
          method: 'POST',
          url: '/auth/forgot',
          body: { email: 'Victim@Example.com' },
        });

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(ioRedis.incr).toHaveBeenCalledWith(
          expect.stringContaining('throttle:forgot-email:victim@example.com:')
        );
        expect(superCanActivate).toHaveBeenCalledWith(context);
      });

      it('blocks the 6th /auth/forgot attempt within the hour for the same email, regardless of IP', async () => {
        (ioRedis.incr as jest.Mock).mockResolvedValue(6);
        const context = buildContext({
          method: 'POST',
          url: '/auth/forgot',
          body: { email: 'victim@example.com' },
        });

        await expect(guard.canActivate(context)).rejects.toThrow();
        expect(superCanActivate).not.toHaveBeenCalled();
      });
    });

    it('continues throttling billing writes', async () => {
      const context = buildContext({
        method: 'POST',
        url: '/billing/v2/checkout',
        org: { id: 'org-1' },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(superCanActivate).toHaveBeenCalledWith(context);
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
