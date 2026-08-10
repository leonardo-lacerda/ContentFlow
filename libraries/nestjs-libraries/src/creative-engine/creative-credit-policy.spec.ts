import { ServiceUnavailableException } from '@nestjs/common';
import {
  assertModelPricingConfigured,
  chooseProtectedCredits,
  CREATIVE_FINANCIAL_POLICY,
} from './creative-credit-policy';

describe('creative financial policy', () => {
  it('protects video quotes from the old underpriced estimate', () => {
    expect(chooseProtectedCredits({
      capability: 'video-generation',
      input: { prompt: 'test', durationSec: 8 },
      model: 'veo3_fast',
      configuredCredits: 240,
    })).toBe(CREATIVE_FINANCIAL_POLICY.videoPerTenSeconds);
  });

  it('prices talking actors at a protected 15-second floor', () => {
    expect(chooseProtectedCredits({
      capability: 'talking-actor',
      input: { prompt: 'test', durationSec: 60 },
      model: 'omnihuman-1-5',
      configuredCredits: 800,
    })).toBe(1_300);
  });

  it('blocks models without a live price configuration', () => {
    expect(() => assertModelPricingConfigured({
      capability: 'video-generation',
      model: 'sora-2-pro',
      configuredCredits: 0,
      configuredCostUsd: 0,
    })).toThrow(ServiceUnavailableException);
  });

  it('never lets an unsafe lower env quote pass by default', () => {
    expect(chooseProtectedCredits({
      capability: 'image-generation',
      input: { prompt: 'test' },
      model: 'nano-banana-pro-4k',
      configuredCredits: 1,
    })).toBe(CREATIVE_FINANCIAL_POLICY.imageGeneration);
  });
});
