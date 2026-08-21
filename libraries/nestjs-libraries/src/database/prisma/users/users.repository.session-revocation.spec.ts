import { UsersRepository } from './users.repository';

// Regression test for the 2026-08-20 audit finding (N-4): password changes
// (self-service reset) never bumped `authSessionVersion`, so a session JWT
// stolen before the reset stayed valid for up to 24h AFTER the victim reset
// their password - auth.middleware.ts compares authSessionVersion on every
// request and only rejects the old token once this is incremented.

describe('UsersRepository.updatePassword — session revocation', () => {
  it('increments authSessionVersion in the same update as the password change', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'user-1' });
    const user = { model: { user: { update } } };
    const repository = new UsersRepository(user as any);

    await repository.updatePassword('user-1', 'new-password-123');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'user-1' }),
        data: expect.objectContaining({
          passwordResetRequired: false,
          authSessionVersion: { increment: 1 },
        }),
      })
    );
  });
});
