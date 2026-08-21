// Regression coverage for 2026-08-20 payment-security audit findings V-3 and
// V-4:
//   V-3 — applyDiscount() called `this.checkDiscount(customer)` without
//         `await`, so `check` was always a truthy Promise and the intended
//         eligibility gate (spend history, plan interval, no existing
//         discount) was a complete no-op — any authenticated org could
//         self-apply the configured Stripe coupon on demand.
//   V-4 — the legacy (V1) `/stripe` webhook switch had no case at all for
//         `charge.refunded`/`charge.dispute.created`; an org on that path
//         kept its paid tier forever after a refund or chargeback.
//
// StripeService talks to the Stripe SDK through a module-level lazily
// constructed client (see the Proxy at the top of stripe.service.ts), so the
// 'stripe' package itself is mocked here to make that client's calls
// observable/controllable without hitting the network.

const stripeChargesList = jest.fn();
const stripeSubscriptionsList = jest.fn();
const stripeSubscriptionsUpdate = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    charges: { list: stripeChargesList },
    subscriptions: { list: stripeSubscriptionsList, update: stripeSubscriptionsUpdate },
  }));
});

// SubscriptionService transitively drags in nostr-tools (ESM), which the
// default ts-jest CJS transform can't parse — same rationale as the other
// stripe.service spec file.
jest.mock(
  '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service',
  () => ({
    SubscriptionService: jest.fn().mockImplementation(() => ({
      createOrUpdateSubscription: jest.fn(),
      deleteSubscription: jest.fn(),
    })),
  })
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StripeService } = require('./stripe.service');
import type { StripeService as StripeServiceType } from './stripe.service';
import type { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import type { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import type { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import type { TrackService } from '@gitroom/nestjs-libraries/track/track.service';

describe('StripeService — discount eligibility (V-3)', () => {
  let subscriptionService: SubscriptionService;
  let organizationService: OrganizationService;
  let service: StripeServiceType;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_DISCOUNT_ID = 'coupon_loyalty';
    subscriptionService = { createOrUpdateSubscription: jest.fn(), deleteSubscription: jest.fn() } as any;
    organizationService = { getOrgById: jest.fn() } as any;
    service = new StripeService(
      subscriptionService,
      organizationService,
      {} as UsersService,
      {} as TrackService
    );
  });

  it('does not apply the coupon when the customer has no charge above the spend threshold', async () => {
    stripeChargesList.mockResolvedValue({ data: [{ amount: 500 }] });

    const result = await service.applyDiscount('cus_low_spend');

    expect(result).toBe(false);
    expect(stripeSubscriptionsUpdate).not.toHaveBeenCalled();
  });

  it('does not apply the coupon to a yearly subscription', async () => {
    stripeChargesList.mockResolvedValue({ data: [{ amount: 5000 }] });
    stripeSubscriptionsList.mockResolvedValue({
      data: [
        {
          status: 'active',
          items: { data: [{ price: { recurring: { interval: 'year' } } }] },
          discounts: [],
        },
      ],
    });

    const result = await service.applyDiscount('cus_yearly');

    expect(result).toBe(false);
    expect(stripeSubscriptionsUpdate).not.toHaveBeenCalled();
  });

  it('does not apply the coupon when a discount is already active', async () => {
    stripeChargesList.mockResolvedValue({ data: [{ amount: 5000 }] });
    stripeSubscriptionsList.mockResolvedValue({
      data: [
        {
          status: 'active',
          items: { data: [{ price: { recurring: { interval: 'month' } } }] },
          discounts: ['di_existing'],
        },
      ],
    });

    const result = await service.applyDiscount('cus_already_discounted');

    expect(result).toBe(false);
    expect(stripeSubscriptionsUpdate).not.toHaveBeenCalled();
  });

  it('applies the coupon only when every eligibility condition genuinely passes', async () => {
    stripeChargesList.mockResolvedValue({ data: [{ amount: 5000 }] });
    stripeSubscriptionsList.mockResolvedValue({
      data: [
        {
          id: 'sub_eligible',
          status: 'active',
          items: { data: [{ price: { recurring: { interval: 'month' } } }] },
          discounts: [],
        },
      ],
    });

    const result = await service.applyDiscount('cus_eligible');

    expect(result).toBe(true);
    expect(stripeSubscriptionsUpdate).toHaveBeenCalledWith('sub_eligible', {
      discounts: [{ coupon: 'coupon_loyalty' }],
    });
  });
});

describe('StripeService.checkSubscription — non-Stripe customer ids (Cakto pending-checkout regression)', () => {
  let subscriptionService: SubscriptionService;
  let organizationService: OrganizationService;
  let service: StripeServiceType;

  beforeEach(() => {
    jest.clearAllMocks();
    subscriptionService = { checkSubscription: jest.fn() } as any;
    organizationService = { getOrgById: jest.fn() } as any;
    service = new StripeService(
      subscriptionService,
      organizationService,
      {} as UsersService,
      {} as TrackService
    );
  });

  it('returns 0 without calling the Stripe API for a Cakto-synthetic customer id', async () => {
    (subscriptionService.checkSubscription as jest.Mock).mockResolvedValue(null);
    (organizationService.getOrgById as jest.Mock).mockResolvedValue({ paymentId: 'cakto:org-1' });

    const result = await service.checkSubscription('org-1', 'checkout-ref-1');

    expect(result).toBe(0);
    expect(stripeSubscriptionsList).not.toHaveBeenCalled();
  });

  it('returns 0 without calling the Stripe API for an organization with no paymentId yet', async () => {
    (subscriptionService.checkSubscription as jest.Mock).mockResolvedValue(null);
    (organizationService.getOrgById as jest.Mock).mockResolvedValue({ paymentId: null });

    const result = await service.checkSubscription('org-1', 'checkout-ref-1');

    expect(result).toBe(0);
    expect(stripeSubscriptionsList).not.toHaveBeenCalled();
  });

  it('still checks the Stripe API for a real Stripe customer id', async () => {
    (subscriptionService.checkSubscription as jest.Mock).mockResolvedValue(null);
    (organizationService.getOrgById as jest.Mock).mockResolvedValue({ paymentId: 'cus_real' });
    stripeSubscriptionsList.mockResolvedValue({ data: [] });

    const result = await service.checkSubscription('org-1', 'checkout-ref-1');

    expect(result).toBe(0);
    expect(stripeSubscriptionsList).toHaveBeenCalled();
  });
});

describe('StripeService — legacy webhook refund/dispute handling (V-4)', () => {
  let subscriptionService: SubscriptionService;
  let service: StripeServiceType;

  beforeEach(() => {
    jest.clearAllMocks();
    subscriptionService = { deleteSubscription: jest.fn().mockResolvedValue(undefined) } as any;
    service = new StripeService(
      subscriptionService,
      {} as OrganizationService,
      {} as UsersService,
      {} as TrackService
    );
  });

  it('revokes the legacy subscription tier when a charge is refunded', async () => {
    const event = { data: { object: { customer: 'cus_refunded' } } } as any;

    const result = await service.handleChargeRefunded(event);

    expect(subscriptionService.deleteSubscription).toHaveBeenCalledWith('cus_refunded');
    expect(result).toEqual({ ok: true });
  });

  it('revokes the legacy subscription tier when a charge is disputed', async () => {
    const event = { data: { object: { customer: 'cus_disputed' } } } as any;

    const result = await service.handleChargeDispute(event);

    expect(subscriptionService.deleteSubscription).toHaveBeenCalledWith('cus_disputed');
    expect(result).toEqual({ ok: true });
  });

  it('does nothing for a refund/dispute with no resolvable customer id', async () => {
    const event = { data: { object: { customer: null } } } as any;

    await service.handleChargeRefunded(event);
    await service.handleChargeDispute(event);

    expect(subscriptionService.deleteSubscription).not.toHaveBeenCalled();
  });
});
