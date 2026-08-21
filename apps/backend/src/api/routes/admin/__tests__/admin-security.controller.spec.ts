import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { TotpService } from '@gitroom/nestjs-libraries/security/totp.service';
import { AdminSecurityController } from '../admin-security.controller';

describe('AdminSecurityController MFA enrollment', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  afterAll(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  it('validates a pending encrypted TOTP secret during confirmation', async () => {
    process.env.JWT_SECRET = 'admin-mfa-enrollment-test-secret';

    const totp = new TotpService();
    const rawSecret = totp.generateSecret();
    const encryptedSecret = AuthService.fixedEncryption(rawSecret);
    const adminUserService = {
      getByUserId: jest.fn().mockResolvedValue({
        id: 'admin-user-id',
        mfaSecret: encryptedSecret,
        mfaEnabled: false,
      }),
      enableMfa: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new AdminSecurityController(
      adminUserService as any,
      {} as any,
      {} as any,
      totp,
      {} as any,
      {} as any,
      {} as any
    );

    const code = totp.generateToken(rawSecret);
    const result = await controller.confirm({ id: 'user-id' } as any, code);

    expect(result.backupCodes).toHaveLength(10);
    expect(adminUserService.enableMfa).toHaveBeenCalledWith(
      'admin-user-id',
      expect.arrayContaining([expect.any(String)])
    );
  });
});

// Regression test for the 2026-08-20 audit finding: `verify()` used to skip
// the code check entirely for any READONLY admin who hadn't enrolled MFA
// yet (`mfaOptional`), issuing a full admin session off nothing but the
// regular user session + an AdminUser row with role=READONLY. That row is
// reachable the moment an admin account is created, before MFA enrollment
// is required or even prompted - so hijacking that admin's ordinary user
// session (XSS, a stolen cookie) was on its own enough to get a READONLY
// admin session, no second factor involved, for a role with broad read
// access (audit logs, billing, user PII, security alerts).
describe('AdminSecurityController.verify — MFA is mandatory for every role', () => {
  const baseAdminUser = {
    id: 'admin-user-id',
    userId: 'user-id',
    status: 'ACTIVE' as const,
    mfaSecret: null,
    mfaBackupCodes: [],
    user: { email: 'readonly-admin@example.com' },
  };

  const buildController = (adminUserOverrides: Record<string, unknown>) => {
    const adminUserService = {
      getByUserId: jest.fn().mockResolvedValue({ ...baseAdminUser, ...adminUserOverrides }),
    };
    const adminAuthService = {
      isMfaLockedOut: jest.fn().mockResolvedValue(false),
      registerFailedMfaAttempt: jest.fn().mockResolvedValue(undefined),
      clearFailedMfaAttempts: jest.fn().mockResolvedValue(undefined),
      issueSession: jest.fn().mockResolvedValue({
        token: 'admin-jwt',
        refreshToken: 'refresh-jwt',
        expiresAt: new Date(),
      }),
    };
    const adminAlertService = { emit: jest.fn() };
    const controller = new AdminSecurityController(
      adminUserService as any,
      {} as any,
      adminAuthService as any,
      new TotpService(),
      {} as any,
      {} as any,
      adminAlertService as any
    );
    const response = { cookie: jest.fn() };
    return { controller, adminUserService, adminAuthService, adminAlertService, response };
  };

  it('rejects a READONLY admin with no MFA enrolled and issues no session', async () => {
    const { controller, adminAuthService, response } = buildController({
      role: 'READONLY',
      mfaEnabled: false,
    });

    await expect(
      controller.verify(
        { id: 'user-id' } as any,
        '', // no code supplied — matches the real "hasn't set up MFA" client flow
        '203.0.113.1',
        'jest',
        response as any
      )
    ).rejects.toThrow('Admin MFA is not set up');

    expect(adminAuthService.issueSession).not.toHaveBeenCalled();
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('rejects a READONLY admin who supplies a code but never enrolled MFA', async () => {
    const { controller, adminAuthService } = buildController({
      role: 'READONLY',
      mfaEnabled: false,
    });

    await expect(
      controller.verify(
        { id: 'user-id' } as any,
        '123456',
        '203.0.113.1',
        'jest',
        { cookie: jest.fn() } as any
      )
    ).rejects.toThrow('Admin MFA is not set up');

    expect(adminAuthService.issueSession).not.toHaveBeenCalled();
  });

  it('still issues a session for a READONLY admin with a real enrolled MFA code', async () => {
    const totp = new TotpService();
    const rawSecret = totp.generateSecret();
    const { controller, adminAuthService, response } = buildController({
      role: 'READONLY',
      mfaEnabled: true,
      mfaSecret: AuthService.fixedEncryption(rawSecret),
    });

    const code = totp.generateToken(rawSecret);
    const result = await controller.verify(
      { id: 'user-id' } as any,
      code,
      '203.0.113.1',
      'jest',
      response as any
    );

    expect(adminAuthService.issueSession).toHaveBeenCalledWith(
      expect.objectContaining({ adminUserId: 'admin-user-id' })
    );
    expect(result).toEqual({ expiresAt: expect.any(Date) });
  });
});
