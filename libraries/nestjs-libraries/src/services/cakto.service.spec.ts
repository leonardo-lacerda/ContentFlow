// SubscriptionService/OrganizationService pull in the social integrations
// manager -> nostr-tools (ESM), which Jest's default CJS transform can't
// parse (pre-existing gap, same rationale as media.service.carousel-logo.spec.ts).
// This test injects its own fakes via the constructor, so the real
// implementations are never used.
jest.mock('@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service', () => ({
  SubscriptionService: class SubscriptionService {},
}));
jest.mock('@gitroom/nestjs-libraries/database/prisma/organizations/organization.service', () => ({
  OrganizationService: class OrganizationService {},
}));

const redisStore = new Map<string, string>();
jest.mock('@gitroom/nestjs-libraries/redis/redis.service', () => ({
  ioRedis: {
    set: jest.fn(async (key: string, value: string, ...args: any[]) => {
      const nx = args.includes('NX');
      if (nx && redisStore.has(key)) return null;
      redisStore.set(key, value);
      return 'OK';
    }),
    get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
    del: jest.fn(async (key: string) => {
      const had = redisStore.delete(key);
      return had ? 1 : 0;
    }),
  },
}));

import { CaktoService } from './cakto.service';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

// Regression coverage for the 2026-08-20 audit finding (N-7): the Cakto
// webhook had no event-id replay dedup, unlike the Stripe V2 path
// (billing-accounting.service.ts), which claims each event id in Redis
// before ever acting on it.

describe('CaktoService.processWebhook — event replay dedup', () => {
  let subscriptionService: Record<string, jest.Mock>;
  let service: CaktoService;

  const event = {
    eventId: 'order.paid:order-123',
    eventType: 'order.paid',
    orderId: 'order-123',
    status: 'paid',
    checkoutReference: 'checkout-abc',
  };

  beforeEach(() => {
    redisStore.clear();
    (ioRedis.set as jest.Mock).mockClear();
    subscriptionService = {
      getSubscriptionByIdentifier: jest.fn().mockResolvedValue({
        organizationId: 'org-1',
        subscriptionTier: 'PRO',
        period: 'MONTHLY',
        organization: { id: 'org-1', paymentId: null },
      }),
      createOrUpdateSubscription: jest.fn().mockResolvedValue(undefined),
      deleteSubscription: jest.fn().mockResolvedValue(undefined),
    };
    service = new CaktoService(subscriptionService as any, {} as any);
  });

  it('processes the first delivery of an event normally', async () => {
    const result = await service.processWebhook(event as any);
    expect(result).toEqual({ ok: true, status: 'active' });
    expect(subscriptionService.createOrUpdateSubscription).toHaveBeenCalledTimes(1);
  });

  it('short-circuits a redelivery of the exact same event id without touching the subscription again', async () => {
    await service.processWebhook(event as any);
    subscriptionService.createOrUpdateSubscription.mockClear();

    const result = await service.processWebhook(event as any);

    expect(result).toEqual({ ok: true, duplicate: true });
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
  });

  it('still processes a genuinely different event id for the same order (e.g. a later status change)', async () => {
    await service.processWebhook(event as any);
    subscriptionService.deleteSubscription.mockClear();

    const canceledEvent = { ...event, eventId: 'order.canceled:order-123', status: 'canceled' };
    const result = await service.processWebhook(canceledEvent as any);

    expect(result).toEqual({ ok: true, status: 'canceled' });
    expect(subscriptionService.deleteSubscription).toHaveBeenCalledTimes(1);
  });
});

// Regression coverage for the 2026-08-20 payment-security audit finding V-1
// (CRITICAL): POST /billing/subscribe on the Cakto path used to write the
// paid Subscription row immediately, before the user ever paid anything —
// the returned checkout URL was optional, not a precondition. subscribe()
// must never grant a tier; only a genuinely paid webhook event may.
describe('CaktoService.subscribe — never grants a plan before payment', () => {
  let subscriptionService: Record<string, jest.Mock>;
  let organizationService: Record<string, jest.Mock>;
  let service: CaktoService;

  const organization = { id: 'org-1', paymentId: null, name: 'Acme' } as any;
  const user = { email: 'user@acme.com' } as any;

  beforeEach(() => {
    redisStore.clear();
    process.env.CAKTO_STARTER_CHECKOUT_URL = 'https://pay.cakto.com.br/starter';
    process.env.CAKTO_PRO_CHECKOUT_URL = 'https://pay.cakto.com.br/pro';
    process.env.CAKTO_SCALE_CHECKOUT_URL = 'https://pay.cakto.com.br/scale';
    subscriptionService = {
      updateCustomerId: jest.fn().mockResolvedValue(undefined),
      createOrUpdateSubscription: jest.fn().mockResolvedValue(undefined),
      getSubscriptionByIdentifier: jest.fn().mockResolvedValue(null),
      deleteSubscription: jest.fn().mockResolvedValue(undefined),
    };
    organizationService = {};
    service = new CaktoService(subscriptionService as any, organizationService as any);
  });

  it('does not write any Subscription row when generating a checkout link, even for the highest tier', async () => {
    const result = await service.subscribe('track-1', organization, user, {
      billing: 'ULTIMATE',
      period: 'MONTHLY',
    } as any);

    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
    expect(result.url).toContain('https://pay.cakto.com.br/scale');
  });

  it('ignores a paid webhook event that has no matching checkout ever created', async () => {
    const result = await service.processWebhook({
      eventId: 'order.paid:unknown-order',
      eventType: 'order.paid',
      orderId: 'unknown-order',
      status: 'paid',
      checkoutReference: 'never-issued-reference',
    } as any);

    expect(result).toEqual({ ok: true, ignored: true, reason: 'subscription_not_found' });
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
  });

  it('grants the plan only once the webhook reports the checkout as actually paid', async () => {
    const subscribeResult = await service.subscribe('track-1', organization, user, {
      billing: 'ULTIMATE',
      period: 'MONTHLY',
    } as any);

    // Abandoning the checkout (never paying) must never grant anything.
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();

    const paidResult = await service.processWebhook({
      eventId: 'order.paid:order-99',
      eventType: 'order.paid',
      orderId: 'order-99',
      status: 'paid',
      checkoutReference: subscribeResult.id,
      providerSubscriptionId: 'cakto-sub-99',
    } as any);

    expect(paidResult).toEqual({ ok: true, status: 'active' });
    expect(subscriptionService.createOrUpdateSubscription).toHaveBeenCalledTimes(1);
    const [, , , , billingArg, periodArg, , , orgIdArg] =
      subscriptionService.createOrUpdateSubscription.mock.calls[0];
    expect(billingArg).toBe('ULTIMATE');
    expect(periodArg).toBe('MONTHLY');
    expect(orgIdArg).toBe('org-1');

    // The pending checkout is consumed — replaying the same "paid" status
    // under a *different* event id must not grant a second time via the
    // pending-checkout path (the identifier now resolves through
    // getSubscriptionByIdentifier instead, which this test's mock returns
    // null for, matching "no such subscription found" rather than a second
    // grant).
    subscriptionService.createOrUpdateSubscription.mockClear();
    const replay = await service.processWebhook({
      eventId: 'order.paid:order-99-again',
      eventType: 'order.paid',
      orderId: 'order-99',
      status: 'paid',
      checkoutReference: subscribeResult.id,
    } as any);
    expect(replay).toEqual({ ok: true, ignored: true, reason: 'subscription_not_found' });
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
  });

  it('does not grant anything when the checkout is refused/canceled before ever being paid', async () => {
    const subscribeResult = await service.subscribe('track-1', organization, user, {
      billing: 'PRO',
      period: 'MONTHLY',
    } as any);

    const result = await service.processWebhook({
      eventId: 'order.refused:order-1',
      eventType: 'order.refused',
      orderId: 'order-1',
      status: 'refused',
      checkoutReference: subscribeResult.id,
    } as any);

    expect(result).toEqual({ ok: true, ignored: true, reason: 'subscription_not_found' });
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();

    // And the abandoned/refused checkout can no longer be paid later either.
    const lateAttempt = await service.processWebhook({
      eventId: 'order.paid:order-1-late',
      eventType: 'order.paid',
      orderId: 'order-1',
      status: 'paid',
      checkoutReference: subscribeResult.id,
    } as any);
    expect(lateAttempt).toEqual({ ok: true, ignored: true, reason: 'subscription_not_found' });
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
  });
});
