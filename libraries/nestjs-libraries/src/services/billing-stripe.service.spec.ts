// Regression coverage for 2026-08-20 payment-security audit findings V-5,
// P-1 and P-2. See billing-accounting.service.spec.ts for the lower-level
// revokeCreditsForInvoice/markSubscriptionDisputed/recordWebhook coverage —
// this file checks that BillingStripeService's webhook handlers and
// changePlan() actually call into those correctly.

const stripePricesRetrieve = jest.fn();
const stripeSubscriptionsRetrieve = jest.fn();
const stripeSubscriptionsUpdate = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    prices: { retrieve: stripePricesRetrieve },
    subscriptions: { retrieve: stripeSubscriptionsRetrieve, update: stripeSubscriptionsUpdate },
  }));
});

import { BillingStripeService } from './billing-stripe.service';

describe('BillingStripeService — charge.refunded (V-5)', () => {
  const buildService = () => {
    const accounting = {
      recordWebhook: jest.fn().mockResolvedValue({ id: 'row-1' }),
      completeWebhook: jest.fn().mockResolvedValue(undefined),
      revokeCreditsForInvoice: jest.fn().mockResolvedValue({ revoked: true }),
    };
    const service = new BillingStripeService({} as any, accounting as any);
    return { service, accounting };
  };

  it('resolves credits to revoke via the invoice id for a subscription-invoice charge', async () => {
    const { service, accounting } = buildService();
    const event = {
      id: 'evt_1',
      type: 'charge.refunded',
      data: { object: { id: 'ch_1', invoice: 'in_123', payment_intent: null } },
    } as any;

    await service.handleWebhook(event);

    expect(accounting.revokeCreditsForInvoice).toHaveBeenCalledWith('in_123', expect.stringContaining('ch_1'));
  });

  it('falls back to payment_intent when there is no invoice — the one-off top-up checkout case', async () => {
    const { service, accounting } = buildService();
    const event = {
      id: 'evt_2',
      type: 'charge.refunded',
      data: { object: { id: 'ch_2', invoice: null, payment_intent: 'pi_456' } },
    } as any;

    await service.handleWebhook(event);

    expect(accounting.revokeCreditsForInvoice).toHaveBeenCalledWith('pi_456', expect.stringContaining('ch_2'));
  });

  it('does nothing when the charge has neither an invoice nor a payment_intent to correlate', async () => {
    const { service, accounting } = buildService();
    const event = {
      id: 'evt_3',
      type: 'charge.refunded',
      data: { object: { id: 'ch_3', invoice: null, payment_intent: null } },
    } as any;

    await service.handleWebhook(event);

    expect(accounting.revokeCreditsForInvoice).not.toHaveBeenCalled();
  });
});

describe('BillingStripeService — charge.dispute.created (P-1)', () => {
  it('revokes plan-tier access (not just credit spend) for the disputed org', async () => {
    const accounting = {
      recordWebhook: jest.fn().mockResolvedValue({ id: 'row-1' }),
      completeWebhook: jest.fn().mockResolvedValue(undefined),
      markSubscriptionDisputed: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      billingSubscription: { findFirst: jest.fn().mockResolvedValue({ organizationId: 'org-1' }) },
    };
    const service = new BillingStripeService(prisma as any, accounting as any);
    const event = {
      id: 'evt_4',
      type: 'charge.dispute.created',
      data: { object: { id: 'dp_1', customer: 'cus_disputed' } },
    } as any;

    await service.handleWebhook(event);

    expect(accounting.markSubscriptionDisputed).toHaveBeenCalledWith('org-1', expect.stringContaining('dp_1'));
  });

  it('does nothing when the dispute cannot be matched to one of our subscriptions', async () => {
    const accounting = {
      recordWebhook: jest.fn().mockResolvedValue({ id: 'row-1' }),
      completeWebhook: jest.fn().mockResolvedValue(undefined),
      markSubscriptionDisputed: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      billingSubscription: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new BillingStripeService(prisma as any, accounting as any);
    const event = {
      id: 'evt_5',
      type: 'charge.dispute.created',
      data: { object: { id: 'dp_2', customer: 'cus_unknown' } },
    } as any;

    await service.handleWebhook(event);

    expect(accounting.markSubscriptionDisputed).not.toHaveBeenCalled();
  });
});

describe('BillingStripeService.changePlan — downgrade (P-2)', () => {
  it('moves the Stripe subscription item to the cheaper price so the next invoice matches what the org will actually receive', async () => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    stripeSubscriptionsRetrieve.mockResolvedValue({ items: { data: [{ id: 'si_1' }] } });
    stripePricesRetrieve.mockResolvedValue({ active: true, id: 'price_cheap' });

    const accounting = {
      getPlan: jest.fn().mockResolvedValue({ code: 'CREATOR', priceCents: 4900 }),
      getSubscription: jest.fn().mockResolvedValue({
        plan: { code: 'PRO', priceCents: 9900 },
        providerSubscriptionId: 'sub_1',
        providerCustomerId: 'cus_1',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 86400000),
      }),
      getPrice: jest.fn().mockResolvedValue({ id: 'price_row_1', stripePriceId: 'price_cheap', code: 'CREATOR_MONTHLY' }),
      upsertSubscription: jest.fn().mockResolvedValue(undefined),
    };
    const service = new BillingStripeService({} as any, accounting as any);

    const result = await service.changePlan('org-1', 'CREATOR');

    expect(stripeSubscriptionsUpdate).toHaveBeenCalledWith('sub_1', expect.objectContaining({
      items: [{ id: 'si_1', price: 'price_cheap' }],
      proration_behavior: 'none',
    }));
    expect(accounting.upsertSubscription).toHaveBeenCalledWith(expect.objectContaining({
      pendingPlanCode: 'CREATOR',
    }));
    expect(result).toMatchObject({ status: 'SCHEDULED', plan: 'CREATOR' });
  });
});
