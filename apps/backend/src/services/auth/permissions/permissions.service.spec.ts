import { AuthorizationActions, Sections } from './permission.exception.class';

jest.mock(
  '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service',
  () => ({ SubscriptionService: jest.fn() })
);
jest.mock(
  '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service',
  () => ({ IntegrationService: jest.fn() })
);
jest.mock(
  '@gitroom/nestjs-libraries/services/billing-entitlements.service',
  () => ({ BillingEntitlementsService: jest.fn() })
);

import { PermissionsService } from './permissions.service';

const access = (overrides: Record<string, unknown> = {}) => ({
  plan: 'AGENCY',
  features: ['studio', 'image-generation', 'video-generation', 'webhooks'],
  models: ['text-default', 'image-basic'],
  capacities: { brands: 200, channels: 100, members: 25 },
  cycleCredits: 40000,
  renewsAt: null,
  subscriptionStatus: 'ACTIVE',
  source: 'billing-v2',
  ...overrides,
});

describe('PermissionsService Billing v2 bridge', () => {
  const subscriptions = {
    getSubscriptionByOrganizationId: jest.fn().mockResolvedValue(null),
    getSubscription: jest.fn(),
  } as any;
  const integrations = {
    getIntegrationsList: jest.fn().mockResolvedValue([]),
    getIntegrationById: jest.fn(),
  } as any;
  const entitlements = { resolveAccess: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_billing_v2';
    entitlements.resolveAccess.mockResolvedValue(access());
  });

  it('allows Agency image routes without a legacy subscription', async () => {
    const service = new PermissionsService(
      subscriptions,
      integrations,
      entitlements
    );
    const ability = await service.check('org-agency', new Date(), 'ADMIN', [
      [AuthorizationActions.Create, Sections.AI],
    ]);

    expect(ability.can(AuthorizationActions.Create, Sections.AI)).toBe(true);
  });

  it('does not use the retired monthly post quota', async () => {
    const service = new PermissionsService(
      subscriptions,
      integrations,
      entitlements
    );
    const ability = await service.check('org-agency', new Date(), 'ADMIN', [
      [AuthorizationActions.Create, Sections.POSTS_PER_MONTH],
    ]);

    expect(
      ability.can(AuthorizationActions.Create, Sections.POSTS_PER_MONTH)
    ).toBe(true);
  });

  it('keeps video access feature-gated instead of count-gated', async () => {
    entitlements.resolveAccess.mockResolvedValue(
      access({ features: ['studio', 'image-generation'] })
    );
    const service = new PermissionsService(
      subscriptions,
      integrations,
      entitlements
    );
    const ability = await service.check('org-free', new Date(), 'ADMIN', [
      [AuthorizationActions.Create, Sections.VIDEOS_PER_MONTH],
    ]);

    expect(
      ability.can(AuthorizationActions.Create, Sections.VIDEOS_PER_MONTH)
    ).toBe(false);
  });
});
