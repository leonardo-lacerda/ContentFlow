import { BillingEntitlementsService } from './billing-entitlements.service';

const subscription = (code: string, overrides: Record<string, unknown> = {}) => ({
  plan: { code },
  status: 'ACTIVE',
  currentPeriodEnd: new Date(Date.now() + 86400000),
  cancelAtPeriodEnd: false,
  failedAt: null,
  updatedAt: new Date(),
  ...overrides,
});

describe('BillingEntitlementsService', () => {
  const create = (billingSubscription: any, legacyTier?: string) => new BillingEntitlementsService(
    { billingSubscription: { findUnique: jest.fn().mockResolvedValue(billingSubscription) } } as any,
    { getSubscriptionByOrganizationId: jest.fn().mockResolvedValue(legacyTier ? { subscriptionTier: legacyTier } : null) } as any,
  );

  it('allows Free text and images but blocks video', async () => {
    const service = create(subscription('FREE'));
    await expect(service.assertFeature('org', 'image-generation')).resolves.toMatchObject({ plan: 'FREE' });
    await expect(service.assertFeature('org', 'video-generation')).rejects.toMatchObject({ response: expect.objectContaining({ code: 'FEATURE_NOT_INCLUDED' }) });
  });

  it('allows Starter Seedance 480p but not premium models', async () => {
    const service = create(subscription('STARTER'));
    await expect(service.assertModel('org', 'seedance-2.5-480p')).resolves.toMatchObject({ plan: 'STARTER' });
    await expect(service.assertModel('org', 'seedance-2.5-720p')).rejects.toMatchObject({ response: expect.objectContaining({ code: 'FEATURE_NOT_INCLUDED' }) });
  });

  it('maps legacy tiers without losing access', async () => {
    const service = create(null, 'TEAM');
    await expect(service.resolveAccess('org')).resolves.toMatchObject({ plan: 'STUDIO', source: 'legacy' });
  });

  it('falls back to Free after an expired cancellation', async () => {
    const service = create(subscription('PRO', {
      status: 'CANCELED',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(Date.now() - 1000),
    }));
    await expect(service.resolveAccess('org')).resolves.toMatchObject({ plan: 'FREE' });
  });

  // Regression coverage for the 2026-08-20 payment-security audit finding
  // V-2 (HIGH): a status of ACTIVE/TRIALING was granted paid access forever,
  // without ever being re-checked against currentPeriodEnd. A subscription
  // stuck ACTIVE (a missed renewal webhook, or any other DB/gateway drift —
  // including the now-fixed V-1 Cakto bug, which used to write exactly this
  // shape of stale-forever row) must fall back to FREE once its period has
  // actually passed.
  it('falls back to Free when status is ACTIVE but the period has already ended', async () => {
    const service = create(subscription('PRO', {
      status: 'ACTIVE',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date(Date.now() - 1000),
    }));
    await expect(service.resolveAccess('org')).resolves.toMatchObject({ plan: 'FREE' });
  });

  it('falls back to Free when status is TRIALING but the period has already ended', async () => {
    const service = create(subscription('STARTER', {
      status: 'TRIALING',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date(Date.now() - 1000),
    }));
    await expect(service.resolveAccess('org')).resolves.toMatchObject({ plan: 'FREE' });
  });

  it('still grants access for an ACTIVE subscription with no currentPeriodEnd set yet', async () => {
    const service = create(subscription('PRO', {
      status: 'ACTIVE',
      currentPeriodEnd: null,
    }));
    await expect(service.resolveAccess('org')).resolves.toMatchObject({ plan: 'PRO' });
  });

  it('still grants access for an ACTIVE subscription whose period genuinely has not ended', async () => {
    const service = create(subscription('PRO', {
      status: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() + 86400000),
    }));
    await expect(service.resolveAccess('org')).resolves.toMatchObject({ plan: 'PRO' });
  });
});
