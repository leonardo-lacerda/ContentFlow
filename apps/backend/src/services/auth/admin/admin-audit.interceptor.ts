import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AdminAuditService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-audit.service';
import {
  ADMIN_PERMISSION_KEY,
  AdminPermissionMetadata,
} from '@gitroom/backend/services/auth/admin/admin-permission.decorator';
import { AdminUserWithAccount } from '@gitroom/backend/services/auth/admin/admin-auth.service';
import { AdminAlertService } from '@gitroom/nestjs-libraries/database/prisma/admin/admin-alert.service';

// Global, but a no-op for every route that isn't behind AdminSessionGuard
// (no request.adminUser => nothing to log). Applied once here instead of
// per-controller so a new admin route can never ship without an audit trail
// — see docs/admin/PLANO-SISTEMA-ADMIN.md §4.4 "toda escrita é auditada".
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(
    private _reflector: Reflector,
    private _adminAuditService: AdminAuditService,
    private _adminAlertService: AdminAlertService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request: Request = context.switchToHttp().getRequest();
    if (request.path.startsWith('/admin')) {
      request.res?.setHeader('Cache-Control', 'no-store');
      request.res?.setHeader('X-Frame-Options', 'DENY');
      request.res?.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error only present on routes behind AdminSessionGuard
    const adminUser: AdminUserWithAccount | undefined = request.adminUser;

    if (!adminUser && !(request as any).impersonating) {
      return next.handle();
    }

    const metadata = this._reflector.get<AdminPermissionMetadata | undefined>(
      ADMIN_PERMISSION_KEY,
      context.getHandler()
    );

    const requestId = uuidv4();
    const forwardedFor = request.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
      request.ip;
    const userAgent = request.headers['user-agent'];
    const params = request.params as Record<string, string> | undefined;
    const body = request.body as Record<string, unknown> | undefined;
    const reason = body?.reason;
    const resourceId = params?.id || params?.userId || params?.organizationId;

    const write = (success: boolean, errorMessage?: string) =>
      this._adminAuditService
        .write({
          adminUserId: adminUser.id,
          actorEmail: adminUser.user.email,
          action: metadata?.key || `impersonation.${request.method.toLowerCase()}`,
          resourceType: metadata?.resourceType || ((request as any).impersonating ? 'ImpersonatedRequest' : 'Unknown'),
          resourceId,
          targetOrgId: params?.organizationId,
          reason: typeof reason === 'string' ? reason : undefined,
          ip: typeof ip === 'string' ? ip : undefined,
          userAgent: typeof userAgent === 'string' ? userAgent : undefined,
          requestId,
          severity: metadata?.severity || 'INFO',
          success,
          errorMessage,
        })
        .then(() => this._adminAlertService.observeAdminAction({
          adminUserId: adminUser.id,
          action: metadata?.key || `impersonation.${request.method.toLowerCase()}`,
          success,
          severity: metadata?.severity || 'INFO',
          resourceId,
        }))
        .catch(() => undefined); // an audit-log failure must never break the response

    return next.handle().pipe(
      tap(() => {
        void write(true);
      }),
      catchError((err) => {
        void write(false, err?.message);
        return throwError(() => err);
      })
    );
  }
}
