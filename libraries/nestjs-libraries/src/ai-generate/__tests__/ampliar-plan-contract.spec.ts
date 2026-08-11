import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

/**
 * Contrato do plano Ampliar (Must): limits e campos de pricing.
 * Handoff FE é coberto por build-ampliar-url / presets no frontend.
 */
describe('Ampliar plan contract', () => {
  it('FREE has conservative ampliar limits', () => {
    expect(pricing.FREE.ad_kits_per_month).toBe(3);
    expect(pricing.FREE.email_campaigns_per_month).toBe(2);
    expect(pricing.FREE.video_scripts_per_month).toBe(3);
  });

  it('STANDARD has growth ampliar limits', () => {
    expect(pricing.STANDARD.ad_kits_per_month).toBe(30);
    expect(pricing.STANDARD.email_campaigns_per_month).toBe(20);
    expect(pricing.STANDARD.video_scripts_per_month).toBe(40);
  });

  it('ULTIMATE exposes the current ampliAR limits', () => {
    expect(pricing.ULTIMATE.ad_kits_per_month).toBe(150);
    expect(pricing.ULTIMATE.email_campaigns_per_month).toBe(100);
    expect(pricing.ULTIMATE.video_scripts_per_month).toBe(200);
  });

  it('all sellable tiers expose the three ampliar counters', () => {
    for (const key of ['FREE', 'STANDARD', 'PRO', 'TEAM', 'ULTIMATE'] as const) {
      const p = pricing[key];
      expect(typeof p.ad_kits_per_month).toBe('number');
      expect(typeof p.email_campaigns_per_month).toBe('number');
      expect(typeof p.video_scripts_per_month).toBe('number');
    }
  });
});
