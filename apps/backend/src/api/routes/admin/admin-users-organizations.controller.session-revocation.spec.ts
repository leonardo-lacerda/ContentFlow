import { AdminUsersController } from './admin-users-organizations.controller';

// Regression test for the 2026-08-20 audit finding (N-4): an admin-forced
// password reset changed the password but never bumped authSessionVersion,
// so a session hijacked before the reset survived the admin's own
// remediation for up to 24h. auth.middleware.ts only rejects a stale token
// once this is incremented.

describe('AdminUsersController.forcePasswordReset — session revocation', () => {
  it('increments authSessionVersion in the same update as the forced password reset', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'user-1', email: 'victim@example.com' });
    const prisma = { user: { update } };
    const controller = new AdminUsersController(prisma as any);

    await controller.forcePasswordReset('user-1');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          passwordResetRequired: true,
          authSessionVersion: { increment: 1 },
        }),
      })
    );
  });
});
