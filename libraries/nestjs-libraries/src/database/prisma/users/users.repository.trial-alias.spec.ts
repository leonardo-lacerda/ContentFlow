import { UsersRepository } from './users.repository';

// Regression coverage for the 2026-08-20 payment-security audit's trial
// abuse finding: registration granted allowTrial/isTrailing unconditionally
// to every new org, and DISALLOW_PLUS defaults to unset, so
// user+1@gmail.com, user+2@gmail.com, ... are all one real inbox getting
// unlimited fresh trials. hasPlusAddressedAliasHistory() doesn't block
// registration or reject the address — it only tells the caller (see
// auth.service.ts) whether this base address already has history, so a
// fresh trial grant can be withheld without touching whether the account
// itself is allowed to exist.

describe('UsersRepository.hasPlusAddressedAliasHistory', () => {
  const buildRepo = (count: number) => {
    const countFn = jest.fn().mockResolvedValue(count);
    const user = { model: { user: { count: countFn } } };
    const repository = new UsersRepository(user as any);
    return { repository, countFn };
  };

  it('returns false for a genuinely first-time address', async () => {
    const { repository, countFn } = buildRepo(0);

    const result = await repository.hasPlusAddressedAliasHistory('fresh@gmail.com');

    expect(result).toBe(false);
    expect(countFn).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [
          { email: 'fresh@gmail.com' },
          { email: { startsWith: 'fresh+', endsWith: '@gmail.com' } },
        ],
      }),
    }));
  });

  it('flags a plus-addressed signup when the bare base address already exists', async () => {
    const { repository } = buildRepo(1);

    const result = await repository.hasPlusAddressedAliasHistory('attacker+2@gmail.com');

    expect(result).toBe(true);
  });

  it('flags a bare signup when a plus-addressed sibling already exists', async () => {
    const { repository, countFn } = buildRepo(1);

    const result = await repository.hasPlusAddressedAliasHistory('attacker@gmail.com');

    expect(result).toBe(true);
    expect(countFn).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [
          { email: 'attacker@gmail.com' },
          { email: { startsWith: 'attacker+', endsWith: '@gmail.com' } },
        ],
      }),
    }));
  });

  it('does not treat unrelated local-parts sharing a prefix as aliases', async () => {
    // "attacker2@gmail.com" must not match a startsWith('attacker+') filter —
    // this is asserting the query shape, not app-side matching, so it's
    // really documenting that the DB query itself can't produce this false
    // positive (no '+' in the filter means Prisma won't match it).
    const { repository, countFn } = buildRepo(0);

    await repository.hasPlusAddressedAliasHistory('attacker+2@gmail.com');

    const call = countFn.mock.calls[0][0];
    expect(call.where.OR[1].email.startsWith).toBe('attacker+');
  });

  it('returns false for a malformed address with no @ instead of throwing', async () => {
    const { repository, countFn } = buildRepo(0);

    const result = await repository.hasPlusAddressedAliasHistory('not-an-email');

    expect(result).toBe(false);
    expect(countFn).not.toHaveBeenCalled();
  });
});
