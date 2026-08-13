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
});
