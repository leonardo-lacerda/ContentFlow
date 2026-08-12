import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminActionSeverity } from '@gitroom/nestjs-libraries/security/admin-permissions';
import { AdminUserWithAccount } from '@gitroom/backend/services/auth/admin/admin-auth.service';

export const ADMIN_PERMISSION_KEY = 'admin_permission';

export interface AdminPermissionOptions {
  severity?: AdminActionSeverity;
  requireReason?: boolean;
  requireApproval?: boolean;
  resourceType?: string;
}

export interface AdminPermissionMetadata extends Required<Omit<AdminPermissionOptions, 'resourceType'>> {
  key: string;
  resourceType?: string;
}

// Every handler under an Admin*Controller must carry this decorator: the
// AdminPermissionGuard denies any admin route that doesn't declare one, so a
// forgotten decorator fails closed instead of silently granting access.
export const AdminPermission = (key: string, options: AdminPermissionOptions = {}) =>
  SetMetadata(ADMIN_PERMISSION_KEY, {
    key,
    severity: options.severity || 'INFO',
    requireReason: !!options.requireReason,
    requireApproval: !!options.requireApproval,
    resourceType: options.resourceType,
  } as AdminPermissionMetadata);

export interface AdminRequestSession {
  id: string;
  jti: string;
  mfaVerifiedAt: Date | null;
}

export const GetAdminUserFromRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AdminUserWithAccount => {
    const request = ctx.switchToHttp().getRequest();
    return request.adminUser;
  }
);

export const GetAdminSessionFromRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AdminRequestSession => {
    const request = ctx.switchToHttp().getRequest();
    return request.adminSession;
  }
);
