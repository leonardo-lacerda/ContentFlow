import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { AuthMiddleware } from './auth.middleware';

// Regression test for the 2026-08-20 audit finding: the impersonation path
// in AuthMiddleware only checked the AdminImpersonation row's own
// endedAt/expiresAt — it never re-validated the admin_auth session that
// STARTED the impersonation. Revoking that admin session (a stolen
// admin_auth token, an MFA reset, an explicit "log this admin out") used to
// leave an already-active impersonation usable for up to its own 60-minute
// expiry regardless. This exercises the fix: `use()` now revalidates the
// admin's admin_auth session on every impersonated request the same way
// AdminSessionGuard does, and stops honouring impersonation the moment that
// session is no longer valid.
describe('AuthMiddleware impersonation — revalidates the originating admin session', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'auth-middleware-impersonation-test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  const regularUser = {
    id: 'admin-owner-user-id',
    email: 'admin-owner@example.com',
    activated: true,
    deletedAt: null,
    authSessionVersion: 1,
    password: 'hashed',
  };

  const targetUser = {
    id: 'target-user-id',
    email: 'target@example.com',
    activated: true,
  };

  const targetOrg = {
    id: 'target-org-id',
    status: 'ACTIVE',
    deletedAt: null,
    users: [{ userId: 'target-user-id', disabled: false }],
  };

  const impersonationRow = {
    id: 'impersonation-1',
    adminUserId: 'admin-user-row-id',
    targetUserId: 'target-user-id',
    targetOrgId: 'target-org-id',
    endedAt: null,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    readOnly: true,
  };

  const sessionJwt = () =>
    AuthService.signJWT({ ...regularUser, authSessionVersion: 1 }, { type: 'session' });

  const buildMiddleware = (adminAuthServiceOverrides: Record<string, unknown> = {}) => {
    const organizationService = {
      getUserOrg: jest.fn().mockResolvedValue({ user: targetUser, organization: { ...targetOrg, users: [...targetOrg.users] } }),
      getOrgsByUserId: jest.fn().mockResolvedValue([
        { id: 'own-org-id', status: 'ACTIVE', deletedAt: null, apiKey: 'x', users: [{ userId: regularUser.id, disabled: false }] },
      ]),
      updateApiKey: jest.fn(),
    };
    const userService = {
      getUserById: jest.fn().mockResolvedValue({ ...regularUser }),
    };
    const prisma = {
      adminUser: {
        findUnique: jest.fn().mockResolvedValue({ id: 'admin-user-row-id', userId: regularUser.id, status: 'ACTIVE' }),
      },
      adminImpersonation: {
        findFirst: jest.fn().mockResolvedValue({ ...impersonationRow }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: regularUser.email }),
      },
    };
    const adminAuthService = {
      validateToken: jest.fn().mockResolvedValue(null),
      ...adminAuthServiceOverrides,
    };
    const middleware = new AuthMiddleware(
      organizationService as any,
      userService as any,
      prisma as any,
      adminAuthService as any
    );
    return { middleware, organizationService, userService, prisma, adminAuthService };
  };

  const buildReqRes = (overrides: Partial<{ cookies: Record<string, string>; headers: Record<string, string>; method: string }> = {}) => {
    const req: any = {
      headers: { 'user-agent': 'jest', ...(overrides.headers || {}) },
      cookies: { auth: sessionJwt(), impersonate: 'target-org-id', ...(overrides.cookies || {}) },
      method: overrides.method || 'GET',
      path: '/posts',
      ip: '203.0.113.5',
    };
    const res: any = { cookie: jest.fn(), header: jest.fn() };
    const next = jest.fn();
    return { req, res, next };
  };

  it('does NOT honour impersonation when there is no admin_auth cookie at all', async () => {
    const { middleware, adminAuthService } = buildMiddleware();
    const { req, res, next } = buildReqRes();

    await middleware.use(req, res, next);

    expect(adminAuthService.validateToken).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(req.impersonating).toBeUndefined();
    // Falls through to the admin's OWN org, not the impersonated target.
    expect(req.org.id).toBe('own-org-id');
  });

  it('does NOT honour impersonation when the admin_auth session is invalid/revoked', async () => {
    const { middleware, adminAuthService, prisma } = buildMiddleware({
      validateToken: jest.fn().mockResolvedValue(null), // revoked/expired admin session
    });
    const { req, res, next } = buildReqRes({ cookies: { admin_auth: 'revoked-admin-token' } });

    await middleware.use(req, res, next);

    expect(adminAuthService.validateToken).toHaveBeenCalledWith('revoked-admin-token', '203.0.113.5', 'jest');
    expect(req.impersonating).toBeUndefined();
    expect(req.org.id).toBe('own-org-id');
    // The now-orphaned impersonation grant is proactively ended, not left
    // "active" for the next request to re-check.
    expect(prisma.adminImpersonation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ adminUserId: 'admin-user-row-id' }),
        data: { endedAt: expect.any(Date) },
      })
    );
  });

  it('honours impersonation when the admin_auth session is valid and matches the same admin', async () => {
    const { middleware, adminAuthService } = buildMiddleware({
      validateToken: jest.fn().mockResolvedValue({
        adminUser: { id: 'admin-user-row-id' },
        sessionId: 'session-1',
        jti: 'jti-1',
        mfaVerifiedAt: new Date(),
      }),
    });
    const { req, res, next } = buildReqRes({ cookies: { admin_auth: 'valid-admin-token' } });

    await middleware.use(req, res, next);

    expect(adminAuthService.validateToken).toHaveBeenCalled();
    expect(req.impersonating).toBe(true);
    expect(req.org.id).toBe('target-org-id');
    expect(req.user.id).toBe('target-user-id');
  });

  it('still enforces readOnly even with a valid admin session backing the impersonation', async () => {
    const { middleware } = buildMiddleware({
      validateToken: jest.fn().mockResolvedValue({
        adminUser: { id: 'admin-user-row-id' },
        sessionId: 'session-1',
        jti: 'jti-1',
        mfaVerifiedAt: new Date(),
      }),
    });
    const { req, res, next } = buildReqRes({ cookies: { admin_auth: 'valid-admin-token' }, method: 'POST' });

    await expect(middleware.use(req, res, next)).rejects.toThrow();
  });
});
