import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

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
];

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  public override async canActivate(
    context: ExecutionContext
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { url, method } = request;

    // Public posting API: throttle per-organization.
    if (method === 'POST' && url.includes('/public/v1/posts')) {
      return super.canActivate(context);
    }

    // Creative writes are expensive and must be throttled; polling and read-only
    // catalog/health endpoints remain available for job progress and operations.
    const isCreativePath = url.startsWith('/creative') || url.startsWith('/public/v1/creative');
    if (isCreativePath && !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }

    // Always throttle sensitive endpoints (AI generation, billing)
    if (ALWAYS_THROTTLED_PATHS.some((path) => url.startsWith(path))) {
      return super.canActivate(context);
    }

    // Anonymous traffic (no org on request): always throttle by IP
    if (!(request as Record<string, any>).org) {
      return super.canActivate(context);
    }

    // Other authenticated traffic: skip throttling
    return true;
  }

  protected override async getTracker(
    req: Record<string, any>
  ): Promise<string> {
    if (req.org?.id) {
      return (
        req.org.id + '_' + (req.url.indexOf('/posts') > -1 ? 'posts' : 'other')
      );
    }

    return 'anon_' + (req.ips?.length ? req.ips[0] : req.ip);
  }
}
