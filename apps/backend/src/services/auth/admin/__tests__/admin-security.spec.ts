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

  // Regression test for the 2026-08-20 audit finding: this used to parse
  // `X-Forwarded-For` manually and trust its FIRST entry — a header any
  // client can set to anything. Behind this app's nginx config
  // ($proxy_add_x_forwarded_for APPENDS the real address rather than
  // replacing it), that first entry is exactly the part an attacker
  // controls, so a stolen admin_auth token plus a forged header could pass
  // the IP allowlist and defeat session IP-pinning. `getAdminClientIp` now
  // only ever reads `request.ip` — Express's own resolution, which already
  // honours `app.set('trust proxy', TRUST_PROXY_HOPS)` (main.ts) and reads
  // from the trusted, proxy-appended end of the header, never the
  // client-supplied end. The two tests below no longer feed a raw
  // `x-forwarded-for` header at all: `request.ip` here stands in for
  // whatever value Express's real trust-proxy-aware resolution already
  // produced, which is the only thing this function is now allowed to see.
  it('trusts only request.ip (Express\'s own trust-proxy-aware resolution), never a raw header', () => {
    const request = {
      ip: '45.172.112.163',
      headers: {
        // Even if present, a raw client-controlled header must have no
        // effect — getAdminClientIp must not read it at all any more.
        'x-forwarded-for': '9.9.9.9, 45.172.112.163',
      },
    } as any;

    expect(getAdminClientIp(request)).toBe('45.172.112.163');
  });

  it('cannot be spoofed by a forged x-forwarded-for header once trust proxy has already resolved request.ip', () => {
    // Simulates a spoofed header arriving at the app: Express, with
    // `trust proxy` correctly configured, has already resolved the real
    // client address into `request.ip` — a forged leading XFF entry never
    // reaches this function at all.
    const request = {
      ip: '203.0.113.9', // the real, resolved client IP
      headers: { 'x-forwarded-for': '10.0.0.1, 203.0.113.9' }, // attacker-forged leading entry
    } as any;

    expect(getAdminClientIp(request)).toBe('203.0.113.9');
    expect(getAdminClientIp(request)).not.toBe('10.0.0.1');
  });

  it('validates an admin session with the client IP resolved by Express', async () => {
    const validateToken = jest.fn().mockResolvedValue({
      adminUser: { id: 'admin-1' },
      sessionId: 'session-1',
      jti: 'jti-1',
      mfaVerifiedAt: new Date(),
    });
    const guard = new AdminSessionGuard({ validateToken } as any);
    const request = {
      ip: '45.172.112.163',
      cookies: { admin_auth: 'session-token' },
      headers: {
        'user-agent': 'admin-test-agent',
      },
    } as any;

    await expect(guard.canActivate({
      switchToHttp: () => ({ getRequest: () => request }),
    } as any)).resolves.toBe(true);
    expect(validateToken).toHaveBeenCalledWith(
      'session-token',
      '45.172.112.163',
      'admin-test-agent'
    );
  });

  it('never carries platform-admin privilege into an impersonated identity', () => {
    const impersonated = applyImpersonationIdentity({ id: 'target', isSuperAdmin: true });
    expect(impersonated.isSuperAdmin).toBe(false);
  });
});
