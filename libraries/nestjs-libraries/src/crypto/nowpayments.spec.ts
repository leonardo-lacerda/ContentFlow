import { createHmac } from 'crypto';
import { AuthService } from '@gitroom/helpers/auth/auth.service';

// SubscriptionService transitively imports integration.manager.ts ->
// nostr.provider.ts -> nostr-tools, a pure-ESM package this project's Jest
// config can't transform. Only its type is used by Nowpayments's
// constructor, so mock the module rather than pull that chain in just to
// unit-test the IPN signature check.
jest.mock(
  '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service',
  () => ({ SubscriptionService: class SubscriptionService {} })
);

import { Nowpayments, ProcessPayment } from './nowpayments';

// Regression test for the 2026-08-20 audit finding: processPayment
// authenticated a NOWPayments IPN callback purely via a path-embedded JWT
// this server itself signed, never verifying the provider's own
// x-nowpayments-sig HMAC. Anyone who obtained one order's callback URL
// (browser history, proxy logs, a compromised monitoring tool) could POST
// an arbitrary body with payment_status: "confirmed" and grant that org a
// free lifetime PRO upgrade.
describe('Nowpayments IPN signature verification', () => {
  const originalSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-for-nowpayments-spec-32chars';
  });

  afterAll(() => {
    process.env.NOWPAYMENTS_IPN_SECRET = originalSecret;
    process.env.JWT_SECRET = originalJwtSecret;
  });

  const makeService = (lifeTime: jest.Mock) =>
    new Nowpayments({ lifeTime } as any);

  const validBody: ProcessPayment = {
    payment_id: 1,
    payment_status: 'confirmed',
    pay_address: 'addr',
    price_amount: 10,
    price_currency: 'USD',
    pay_amount: 0.1,
    actually_paid: 0.1,
    pay_currency: 'SOL',
    order_id: 'org-1_abc12',
    order_description: 'Lifetime deal',
    purchase_id: 'p1',
    created_at: '2026-08-20',
    updated_at: '2026-08-20',
    outcome_amount: 10,
    outcome_currency: 'USD',
  };

  const signedPath = () =>
    AuthService.signJWT(
      { order_id: validBody.order_id },
      { type: 'payment', expiresIn: '2h' }
    );

  const sign = (body: ProcessPayment, secret: string) => {
    const sorted = Object.keys(body)
      .sort()
      .reduce((acc, key) => {
        (acc as any)[key] = (body as any)[key];
        return acc;
      }, {} as ProcessPayment);
    return createHmac('sha512', secret)
      .update(JSON.stringify(sorted), 'utf8')
      .digest('hex');
  };

  it('rejects the callback when NOWPAYMENTS_IPN_SECRET is not configured, even with a valid path JWT', async () => {
    delete process.env.NOWPAYMENTS_IPN_SECRET;
    const lifeTime = jest.fn();
    const service = makeService(lifeTime);

    const result = await service.processPayment(
      signedPath(),
      validBody,
      'anything'
    );

    expect(result).toBeUndefined();
    expect(lifeTime).not.toHaveBeenCalled();
  });

  it('rejects a forged callback with no signature header (the pre-fix exploit path)', async () => {
    process.env.NOWPAYMENTS_IPN_SECRET = 'ipn-secret-value';
    const lifeTime = jest.fn();
    const service = makeService(lifeTime);

    // Attacker replays a valid order URL (from a leaked callback link) with
    // an arbitrary body and no idea what the IPN secret is.
    const result = await service.processPayment(signedPath(), validBody);

    expect(result).toBeUndefined();
    expect(lifeTime).not.toHaveBeenCalled();
  });

  it('rejects a callback with an incorrect signature', async () => {
    process.env.NOWPAYMENTS_IPN_SECRET = 'ipn-secret-value';
    const lifeTime = jest.fn();
    const service = makeService(lifeTime);

    const result = await service.processPayment(
      signedPath(),
      validBody,
      sign(validBody, 'wrong-secret')
    );

    expect(result).toBeUndefined();
    expect(lifeTime).not.toHaveBeenCalled();
  });

  it('grants the upgrade for a correctly signed, genuine callback', async () => {
    process.env.NOWPAYMENTS_IPN_SECRET = 'ipn-secret-value';
    const lifeTime = jest.fn().mockResolvedValue(undefined);
    const service = makeService(lifeTime);

    const result = await service.processPayment(
      signedPath(),
      validBody,
      sign(validBody, 'ipn-secret-value')
    );

    expect(result).toEqual(validBody);
    expect(lifeTime).toHaveBeenCalledWith('org-1', 'abc12', 'PRO');
  });
});
