import {
  BILLING_CATALOG_PLANS,
  BILLING_CATALOG_TOPUPS,
  billingPeriodEnd,
} from './billing-catalog';
import { PricingCatalogService } from './pricing-catalog.service';

describe('billing catalog', () => {
  it('contains the six monthly plans in ascending price order', () => {
    expect(BILLING_CATALOG_PLANS.map((plan) => plan.code)).toEqual([
      'FREE', 'STARTER', 'CREATOR', 'PRO', 'STUDIO', 'AGENCY',
    ]);
    expect(BILLING_CATALOG_PLANS.map((plan) => plan.priceCents)).toEqual([
      0, 4900, 9900, 19900, 39900, 89900,
    ]);
    expect(BILLING_CATALOG_PLANS.every((plan) => plan.monthlyCredits > 0)).toBe(true);
  });

  it('contains fixed ninety-day top-up packs', () => {
    expect(BILLING_CATALOG_TOPUPS.map((topup) => topup.code)).toEqual([
      'TOPUP_500', 'TOPUP_2000', 'TOPUP_5000', 'TOPUP_10000',
    ]);
    expect(BILLING_CATALOG_TOPUPS.every((topup) => topup.validityDays === 90)).toBe(true);
  });

  it('uses plans for access and credits instead of generation quotas', () => {
    const free = BILLING_CATALOG_PLANS.find((plan) => plan.code === 'FREE')!;
    const starter = BILLING_CATALOG_PLANS.find((plan) => plan.code === 'STARTER')!;
    const pro = BILLING_CATALOG_PLANS.find((plan) => plan.code === 'PRO')!;
    expect(free.access.features).toContain('image-generation');
    expect(free.access.features).not.toContain('video-generation');
    expect(starter.access.models).toContain('seedance-2.5-480p');
    expect(pro.access.models).toContain('seedance-2.5-720p');
    expect(free.access.capacities).toEqual({ brands: 3, channels: 1, members: 1 });
  });

  it('returns the end of the current UTC month', () => {
    const end = billingPeriodEnd(new Date('2026-08-10T12:00:00.000Z'));
    expect(end.toISOString()).toBe('2026-08-31T23:59:59.999Z');
  });

  it('normalizes Seedance 2.5 quotes by resolution and input media', () => {
    const service = new PricingCatalogService({} as any);
    const noInput = service.normalizeProviderQuote(
      { provider: 'kie', model: 'seedance-2.5', estimatedCredits: 800, explanation: 'fallback' },
      'video-generation',
      { prompt: 'test', durationSec: 20, metadata: { resolution: '720p' } },
    );
    const withInput = service.normalizeProviderQuote(
      { provider: 'kie', model: 'seedance-2.5', estimatedCredits: 800, explanation: 'fallback' },
      'video-generation',
      { prompt: 'test', durationSec: 10, imageUrls: ['https://example.com/input.png'], metadata: { resolution: '720p' } },
    );
    expect(noInput.estimatedCredits).toBe(4000);
    expect(withInput.estimatedCredits).toBe(2500);
  });
});
