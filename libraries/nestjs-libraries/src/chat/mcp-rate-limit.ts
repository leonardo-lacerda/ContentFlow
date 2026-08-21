import { Response } from 'express';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

// /mcp*, /mcp-studio*, /sse/:id and /message/:id (start.mcp.ts) are
// registered as raw Express middleware (app.use(...)) so they can be reached
// before Nest's own router/guard pipeline exists (see main.ts). That means
// ThrottlerBehindProxyGuard — the app's normal per-organization rate
// limiter, an APP_GUARD that only runs inside the Nest controller dispatch
// pipeline — never executes for any of these routes, for any HTTP method.
// Every credit-spending tool call this server ever receives from an MCP
// client (image/video generation, Creative Engine operations, publishing)
// was otherwise completely unthrottled: a client could fire tool calls in a
// tight loop with the only remaining brake being the organization's own
// credit balance. This is the minimal replacement rate limiter for this
// surface specifically, mirroring the Redis sliding-minute-bucket approach
// ThrottlerBehindProxyGuard already uses for the rest of the app
// (throttler.provider.ts).
//
// Kept in its own module (rather than inline in start.mcp.ts) so it can be
// unit tested without pulling in the Mastra/MCPServer dependency chain,
// which Jest's default CJS transform cannot parse.
export const MCP_RATE_LIMIT_PER_MINUTE = 120;

export async function enforceMcpRateLimit(organizationId: string, res: Response): Promise<boolean> {
  const bucket = Math.floor(Date.now() / 60000);
  const key = `throttle:mcp:${organizationId}:${bucket}`;
  const count = await ioRedis.incr(key);
  if (count === 1) await ioRedis.expire(key, 60);
  if (count > MCP_RATE_LIMIT_PER_MINUTE) {
    res.status(429).json({ error: 'rate_limited', error_description: 'Too many MCP requests for this organization; slow down.' });
    return false;
  }
  return true;
}
