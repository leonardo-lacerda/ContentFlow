import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  public override async canActivate(
    context: ExecutionContext
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { url, method } = request;

    // Authenticated org traffic on the public posting API: throttle per-organization.
    if (method === 'POST' && url.includes('/public/v1/posts')) {
      return super.canActivate(context);
    }

    // Routes that don't go through AuthMiddleware have no `org` attached to the
    // request (e.g. /auth/login, /auth/register, /public/*). These are the routes
    // most exposed to brute-force, scraping and abuse from anonymous clients, so
    // throttle them by IP instead of skipping them entirely.
    if (!(request as Record<string, any>).org) {
      return super.canActivate(context);
    }

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
