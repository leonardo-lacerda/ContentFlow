const redisStore = new Map<string, { value: number; expiresAtMs: number | null }>();
jest.mock('@gitroom/nestjs-libraries/redis/redis.service', () => ({
  ioRedis: {
    incr: jest.fn(async (key: string) => {
      const now = Date.now();
      const existing = redisStore.get(key);
      const value = existing && (existing.expiresAtMs === null || existing.expiresAtMs > now) ? existing.value + 1 : 1;
      redisStore.set(key, { value, expiresAtMs: existing?.expiresAtMs ?? null });
      return value;
    }),
    expire: jest.fn(async (key: string, seconds: number) => {
      const entry = redisStore.get(key);
      if (entry) entry.expiresAtMs = Date.now() + seconds * 1000;
      return 1;
    }),
  },
}));

import { enforceMcpRateLimit, MCP_RATE_LIMIT_PER_MINUTE } from './mcp-rate-limit';

// Regression coverage for the 2026-08-20 audit CONFIRMED-2 finding: /mcp and
// /mcp-studio are raw Express middleware mounted before Nest's own router,
// so ThrottlerBehindProxyGuard (an APP_GUARD, which only runs inside the
// Nest controller pipeline) never executes for this traffic — every
// credit-spending MCP tool call was completely unthrottled. This exercises
// the replacement per-organization limiter directly.
describe('enforceMcpRateLimit', () => {
  const makeRes = () => {
    const res: any = { statusCode: undefined, body: undefined };
    res.status = jest.fn((code: number) => { res.statusCode = code; return res; });
    res.json = jest.fn((body: unknown) => { res.body = body; return res; });
    return res;
  };

  beforeEach(() => {
    redisStore.clear();
  });

  it('allows requests under the per-minute limit', async () => {
    const res = makeRes();
    const allowed = await enforceMcpRateLimit('org-1', res);
    expect(allowed).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks a burst of requests once the per-organization limit is exceeded', async () => {
    const res = makeRes();
    for (let i = 0; i < MCP_RATE_LIMIT_PER_MINUTE; i++) {
      await expect(enforceMcpRateLimit('org-1', res)).resolves.toBe(true);
    }
    const blockedRes = makeRes();
    await expect(enforceMcpRateLimit('org-1', blockedRes)).resolves.toBe(false);
    expect(blockedRes.status).toHaveBeenCalledWith(429);
  });

  it('tracks each organization in its own bucket — one org exceeding the limit does not block another', async () => {
    const res = makeRes();
    for (let i = 0; i <= MCP_RATE_LIMIT_PER_MINUTE; i++) {
      await enforceMcpRateLimit('org-1', res);
    }

    const otherOrgRes = makeRes();
    await expect(enforceMcpRateLimit('org-2', otherOrgRes)).resolves.toBe(true);
    expect(otherOrgRes.status).not.toHaveBeenCalled();
  });
});
