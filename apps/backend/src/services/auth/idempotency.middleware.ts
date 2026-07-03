import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

/**
 * Idempotency middleware for public API.
 * Clients send an Idempotency-Key header on POST/PUT/PATCH requests.
 * If the same key is seen again within the TTL, the cached response is returned.
 */
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly TTL_SECONDS = 86400; // 24 hours

  async use(req: Request, res: Response, next: NextFunction) {
    // Only apply to mutating methods
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    const idempotencyKey = req.headers['idempotency-key'] as string;

    // If no key provided, proceed without idempotency
    if (!idempotencyKey) {
      return next();
    }

    // Validate key format (UUID or alphanumeric, 10-100 chars)
    if (!/^[a-zA-Z0-9\-_]{10,100}$/.test(idempotencyKey)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        msg: 'Invalid Idempotency-Key format. Must be 10-100 alphanumeric characters, hyphens, or underscores.',
      });
    }

    const cacheKey = `idempotency:${idempotencyKey}`;

    try {
      // Check if we've seen this key before
      const cached = await ioRedis.get(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        // Return the cached response
        return res.status(parsed.status).json(parsed.body);
      }

      // Intercept the response to cache it
      const originalJson = res.json.bind(res);
      let responseBody: any;
      let responseStatus: number;

      res.json = (body: any) => {
        responseBody = body;
        responseStatus = res.statusCode;

        // Cache successful responses (2xx)
        if (responseStatus >= 200 && responseStatus < 300) {
          ioRedis
            .set(
              cacheKey,
              JSON.stringify({ status: responseStatus, body: responseBody }),
              'EX',
              this.TTL_SECONDS,
            )
            .catch(() => {});
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      // If Redis is down, proceed without idempotency
      next();
    }
  }
}
