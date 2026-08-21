import { SubscriptionRepository } from './subscription.repository';

// Regression coverage for the 2026-08-20 payment-security audit finding P-4
// (lifetime-code redemption race): the UsedCodes row used to be inserted
// *after* the subscription was already granted, and the column had no
// unique constraint — two concurrent requests for the same code could both
// pass the "already used?" read and both get a free lifetime subscription
// before either insert landed. The fix claims the code first (a `create`
// that now relies on UsedCodes.code being @unique in schema.prisma) and
// only grants the subscription if that claim succeeds.

describe('SubscriptionRepository.createOrUpdateSubscription — code redemption ordering (P-4)', () => {
  const buildRepo = (usedCodesCreateImpl: () => Promise<unknown>) => {
    const subscription = { upsert: jest.fn().mockResolvedValue(undefined) };
    const organization = {
      update: jest.fn().mockResolvedValue(undefined),
      findFirst: jest.fn().mockResolvedValue({ id: 'org-1' }),
    };
    const usedCodes = { create: jest.fn(usedCodesCreateImpl) };
    const repo = new SubscriptionRepository(
      { model: { subscription } } as any,
      { model: { organization } } as any,
      {} as any,
      {} as any,
      { model: { usedCodes } } as any
    );
    return { repo, subscription, organization, usedCodes };
  };

  it('claims the code before granting the subscription, in that order', async () => {
    const calls: string[] = [];
    const { repo, subscription, usedCodes } = buildRepo(async () => {
      calls.push('claim-code');
      return {};
    });
    (subscription.upsert as jest.Mock).mockImplementation(async () => {
      calls.push('grant-subscription');
    });

    await repo.createOrUpdateSubscription(
      false,
      'identifier-1',
      'customer-1',
      5,
      'STANDARD',
      'MONTHLY',
      null,
      'lifetime-code-abc',
      { id: 'org-1' }
    );

    expect(calls).toEqual(['claim-code', 'grant-subscription']);
    expect(usedCodes.create).toHaveBeenCalledWith({ data: { code: 'lifetime-code-abc', orgId: 'org-1' } });
  });

  it('never grants the subscription when the code claim loses a concurrency race', async () => {
    const { repo, subscription } = buildRepo(async () => {
      const error: any = new Error('Unique constraint failed');
      error.code = 'P2002';
      throw error;
    });

    await expect(
      repo.createOrUpdateSubscription(
        false,
        'identifier-1',
        'customer-1',
        5,
        'STANDARD',
        'MONTHLY',
        null,
        'already-redeemed-code',
        { id: 'org-1' }
      )
    ).rejects.toThrow('Code already redeemed');

    expect(subscription.upsert).not.toHaveBeenCalled();
  });

  it('does not touch UsedCodes at all for the normal (non-lifetime-code) gateway path', async () => {
    const { repo, subscription, usedCodes } = buildRepo(async () => ({}));

    await repo.createOrUpdateSubscription(
      false,
      'identifier-1',
      'customer-1',
      5,
      'STANDARD',
      'MONTHLY',
      null,
      undefined,
      { id: 'org-1' }
    );

    expect(usedCodes.create).not.toHaveBeenCalled();
    expect(subscription.upsert).toHaveBeenCalled();
  });
});
