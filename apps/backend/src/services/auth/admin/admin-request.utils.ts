import { Request } from 'express';

/**
 * Returns the client address for admin IP-allowlisting and session
 * IP-pinning. This MUST come from Express' own `req.ip`, which is derived
 * by trusting only as many `X-Forwarded-For` hops as `app.set('trust
 * proxy', TRUST_PROXY_HOPS)` in main.ts configures — i.e. it reads from the
 * right-hand (proxy-appended) end of the header, not the left-hand end a
 * client can freely set.
 *
 * Do NOT read `x-forwarded-for`/`x-real-ip` directly here: nginx's
 * `$proxy_add_x_forwarded_for` (var/docker/nginx.conf) APPENDS the real
 * client address to whatever `X-Forwarded-For` the client already sent
 * rather than replacing it, so `request.headers['x-forwarded-for'].split(',')[0]`
 * previously returned an attacker-controlled value — letting a stolen
 * admin_auth token bypass both the IP allowlist and the session IP-pinning
 * revocation check just by sending a forged header.
 */
export function getAdminClientIp(request: Request): string | undefined {
  return request.ip;
}
