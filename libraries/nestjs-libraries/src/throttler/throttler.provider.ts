import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

// Endpoints que SEMPRE devem ter rate limiting, mesmo para autenticados
const ALWAYS_THROTTLED_PATHS = [
  '/ai-generate',
  '/billing',
  '/social-posts/generate',
  '/email-campaigns/generate',
  '/ad-creatives/generate',
  '/video-scripts',
  '/creative',
  '/public/v1/creative',
  // Admin routes must never fall into the "authenticated org traffic: skip
  // throttling" branch below — the MFA guess surface in particular needs a
  // hard ceiling regardless of org context. See PLANO-SISTEMA-ADMIN.md §4.4.
  '/admin',
];

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  public override async canActivate(
    context: ExecutionContext
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { url, method } = request;

    if (url.startsWith('/admin')) {
      const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      const isDestructive = isWrite && /(?:revoke|delete|remove|refund|adjust|suspend|approve|reject|reset|impersonat)/i.test(url);
      const limit = isDestructive ? 3 : isWrite ? 10 : 60;
      const tracker = this.getTracker(request as any);
      const bucket = Math.floor(Date.now() / 60000);
      const key = `throttle:admin:${tracker}:${bucket}:${isDestructive ? 'd' : isWrite ? 'w' : 'r'}`;
      const count = await ioRedis.incr(key);
      if (count === 1) await ioRedis.expire(key, 60);
      if (count > limit) throw new ThrottlerException();
      return true;
    }

    // Billing reads power the credit badge and billing screen. They are
    // authenticated, read-only and intentionally refreshed while jobs settle.
    // Applying the global 30/hour bucket here made the dashboard lock itself
    // after a few minutes and caused SWR retries to amplify the 429 response.
    if (
      ['GET', 'HEAD'].includes(method) &&
      (url.startsWith('/billing/v2/account') ||
        url.startsWith('/billing/v2/invoices') ||
        url.startsWith('/billing/v2/plans') ||
        url.startsWith('/billing/v2/pricing'))
    ) {
      return this.enforceOrganizationBucket(request, 'billing-read', 120);
    }

    // Public posting API: throttle per-organization.
    if (method === 'POST' && url.includes('/public/v1/posts')) {
      return super.canActivate(context);
    }

    // Creative writes are expensive and must be throttled; polling and read-only
    // catalog/health endpoints remain available for job progress and operations.
    const isCreativePath = url.startsWith('/creative') || url.startsWith('/public/v1/creative');
    if (isCreativePath && !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return this.enforceOrganizationBucket(request, 'creative-read', 120);
    }

    // Always throttle sensitive write endpoints (AI generation, billing).
    if (ALWAYS_THROTTLED_PATHS.some((path) => url.startsWith(path))) {
      return super.canActivate(context);
    }

    // Anonymous traffic (no org on request): always throttle by IP
    if (!(request as Record<string, any>).org) {
      return super.canActivate(context);
    }

    // Every authenticated organization request is rate limited. This is a
    // technical abuse guard only; commercial generation limits are enforced by
    // credits/entitlements, not by this bucket.
    return this.enforceOrganizationBucket(request, 'authenticated', 120);
  }

  private async enforceOrganizationBucket(
    request: Request,
    scope: string,
    limit: number,
  ): Promise<boolean> {
    const tracker = await this.getTracker(request as any);
    const bucket = Math.floor(Date.now() / 60000);
    const key = `throttle:org:${tracker}:${scope}:${bucket}`;
    const count = await ioRedis.incr(key);
    if (count === 1) await ioRedis.expire(key, 60);
    if (count > limit) throw new ThrottlerException();
    return true;
  }

  protected override async getTracker(
    req: Record<string, any>
  ): Promise<string> {
    // Admin routes get their own bucket, keyed by the acting user rather than
    // the org, so a brute-force attempt can't hide behind (or exhaust) the
    // org's regular API quota, and so co-admins in the same org don't share
    // one counter.
    if (req.url?.startsWith('/admin')) {
      return 'admin_' + (req.user?.id || req.ips?.[0] || req.ip);
    }

    if (req.org?.id) {
      return (
        req.org.id + '_' + (req.url.indexOf('/posts') > -1 ? 'posts' : 'other')
      );
    }

    return 'anon_' + (req.ips?.length ? req.ips[0] : req.ip);
  }
}
