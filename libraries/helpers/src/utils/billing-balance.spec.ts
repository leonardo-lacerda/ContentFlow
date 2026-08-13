import { normalizeBillingBalance } from './billing-balance';

describe('normalizeBillingBalance', () => {
  it('reads the current billing account contract without turning it into zero', () => {
    expect(normalizeBillingBalance({
      subscription: null,
      credits: { balance: 19870, total: 19870, reserved: 0, debt: 0 },
    })).toEqual({ balance: 19870, total: 19870, reserved: 0, debt: 0 });
  });

  it('keeps compatibility with the older nested balance contract', () => {
    expect(normalizeBillingBalance({
      credits: { balance: { balance: 2500, total: 2600, reserved: 100, debt: 0 } },
    })).toEqual({ balance: 2500, total: 2600, reserved: 100, debt: 0 });
  });

  it('rejects missing or malformed responses instead of displaying zero', () => {
    expect(normalizeBillingBalance(undefined)).toBeNull();
    expect(normalizeBillingBalance({ credits: {} })).toBeNull();
    expect(normalizeBillingBalance({ error: 'backend unavailable' })).toBeNull();
  });
});
