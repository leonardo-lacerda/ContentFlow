import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AdminAuthService } from '@gitroom/backend/services/auth/admin/admin-auth.service';
import { AdminSessionInvalidException } from '@gitroom/backend/services/auth/admin/admin.exceptions';

// Validates the short-lived `admin_auth` token against the live AdminSession
// row (via AdminAuthService's cached DB lookup) on every request — this is
// what makes admin access revocable in seconds instead of up to the token's
// remaining TTL. Must run before AdminPermissionGuard.
@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private _adminAuthService: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = (request.cookies?.admin_auth ||
      request.headers?.['admin-auth']) as string | undefined;

    if (!token) {
      throw new AdminSessionInvalidException();
    }

    const ip = request.ip || request.headers?.['x-forwarded-for']?.toString().split(',')[0].trim();
    const userAgent = request.headers?.['user-agent']?.toString();
    const authContext = await this._adminAuthService.validateToken(token, ip, userAgent);
    if (!authContext) {
      throw new AdminSessionInvalidException();
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error augmenting Express Request with the resolved admin context
    request.adminUser = authContext.adminUser;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error see above
    request.adminSession = {
      id: authContext.sessionId,
      jti: authContext.jti,
      mfaVerifiedAt: authContext.mfaVerifiedAt,
    };

    return true;
  }
}
