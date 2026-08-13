import { Request } from 'express';

/**
 * Returns the client address consistently when the API is behind Nginx.
 * The session is issued from the forwarded address (@RealIP), so guards
 * must validate against that same address instead of Express' proxy IP.
 */
export function getAdminClientIp(request: Request): string | undefined {
  const forwardedFor = request.headers?.['x-forwarded-for'];
  const forwardedIp = forwardedFor?.toString().split(',')[0].trim();

  return (
    forwardedIp ||
    request.headers?.['x-real-ip']?.toString().trim() ||
    request.ip
  );
}
