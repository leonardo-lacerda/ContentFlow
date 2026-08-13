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
