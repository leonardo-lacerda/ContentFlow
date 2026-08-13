import { AdminRoleType } from '@prisma/client';
import { isAdminPermissionAllowed, isIpAllowed, isStepUpValid } from '@gitroom/nestjs-libraries/security/admin-permissions';
import { AdminPermissionGuard } from '@gitroom/backend/services/auth/admin/admin-permission.guard';
import { AdminSessionGuard } from '@gitroom/backend/services/auth/admin/admin-session.guard';
import { applyImpersonationIdentity } from '@gitroom/backend/services/auth/admin/admin-impersonation.policy';
import { getAdminClientIp } from '@gitroom/backend/services/auth/admin/admin-request.utils';

describe('admin security policy', () => {
  it('enforces the role x permission matrix and explicit overrides', () => {
    expect(isAdminPermissionAllowed(AdminRoleType.OWNER, null, 'anything')).toBe(true);
    expect(isAdminPermissionAllowed(AdminRoleType.SUPPORT, null, 'credits.adjust')).toBe(false);
    expect(isAdminPermissionAllowed(AdminRoleType.SUPPORT, null, 'users.read')).toBe(true);
    expect(isAdminPermissionAllowed(AdminRoleType.SUPPORT, { 'users.read': false }, 'users.read')).toBe(false);
    expect(isAdminPermissionAllowed(AdminRoleType.SUPPORT, { 'billing.refund': true }, 'billing.refund')).toBe(true);
  });

  it('supports exact and CIDR IP allowlists and five-minute step-up', () => {
    expect(isIpAllowed('10.20.30.40', ['10.20.30.0/24'])).toBe(true);
    expect(isIpAllowed('10.20.31.40', ['10.20.30.0/24'])).toBe(false);
    expect(isIpAllowed('10.20.30.40', [])).toBe(true);
    expect(isStepUpValid(new Date(Date.now() - 4 * 60 * 1000))).toBe(true);
    expect(isStepUpValid(new Date(Date.now() - 6 * 60 * 1000))).toBe(false);
  });

  it('denies an admin handler that forgot its permission decorator', async () => {
    const reflector = { get: (): undefined => undefined } as any;
    const guard = new AdminPermissionGuard(reflector, {} as any, {} as any);
    await expect(guard.canActivate({ getHandler: () => ({}), switchToHttp: () => ({ getRequest: () => ({}) }) } as any)).rejects.toThrow(/missing an @AdminPermission/);
  });

  it('rejects a missing or revoked admin session', async () => {
    const guard = new AdminSessionGuard({ validateToken: async (): Promise<null> => null } as any);
    await expect(guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ cookies: {} }) }) } as any)).rejects.toMatchObject({ status: 401 });
  });

  it('uses the forwarded client IP when the API is behind a reverse proxy', () => {
    const request = {
      ip: '127.0.0.1',
      headers: {
        'x-forwarded-for': '45.172.112.163, 127.0.0.1',
      },
    } as any;

    expect(getAdminClientIp(request)).toBe('45.172.112.163');
  });

  it('never carries platform-admin privilege into an impersonated identity', () => {
    const impersonated = applyImpersonationIdentity({ id: 'target', isSuperAdmin: true });
    expect(impersonated.isSuperAdmin).toBe(false);
  });
});
