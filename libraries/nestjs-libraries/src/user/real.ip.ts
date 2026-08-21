import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Replaces the `nestjs-real-ip` package (backed by `@supercharge/request-ip`),
// which resolves the client IP by taking the FIRST address in
// `X-Forwarded-For` — a header a client can set to anything. Behind this
// app's nginx config, which uses `$proxy_add_x_forwarded_for` to APPEND the
// real address rather than replace it, that first entry is exactly the part
// an attacker controls, letting them forge IP-based lockouts/audit trails
// with a single spoofed header.
//
// Express' own `request.ip` is the correct source: it honours
// `app.set('trust proxy', TRUST_PROXY_HOPS)` (main.ts), which trusts only
// the configured number of hops and reads from the right-hand,
// proxy-appended end of the header instead of the client-supplied end.
export const RealIP = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.ip;
  }
);
