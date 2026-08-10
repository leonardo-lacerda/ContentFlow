import { ServiceUnavailableException } from '@nestjs/common';
import { CreativeCapability, CreativeProviderInput } from './creative-engine.types';

/**
 * Financial guardrails for the Kie-backed creative catalog.
 *
 * These are customer-facing ContentFlow credits, not Kie credits. The floors
 * include enough room for the current provider price bands and normal retries.
 * An operator can intentionally override them only with an explicit unsafe
 * flag, never by accidentally setting a lower environment value.
 */
export const CREATIVE_FINANCIAL_POLICY = {
  videoPerTenSeconds: 800,
  imageGeneration: 25,
  talkingActorPerFifteenSeconds: 325,
  textToSpeechPerThirtySeconds: 12,
  actorReplacement: 1_300,
  translation: 20,
  videoUpscalePerTenSeconds: 120,
} as const;

export function unsafePricingEnabled() {
  return process.env.CREATIVE_ALLOW_UNSAFE_PRICING === 'true';
}

export function modelRequiresLivePricing(model: string, capability: CreativeCapability) {
  const normalized = model.toLowerCase();
  if (capability === 'video-generation' && normalized.includes('sora')) return true;
  if (capability === 'actor-replacement') return true;
  return false;
}

export function assertModelPricingConfigured(params: {
  capability: CreativeCapability;
  model: string;
  configuredCredits: number;
  configuredCostUsd: number;
}) {
  if (!modelRequiresLivePricing(params.model, params.capability)) return;
  if (params.configuredCredits > 0 || params.configuredCostUsd > 0) return;

  throw new ServiceUnavailableException(
    `Pricing is not configured for ${params.model}. This model is temporarily unavailable to protect your balance.`,
  );
}

export function protectedCreativeCredits(
  capability: CreativeCapability,
  input: CreativeProviderInput,
) {
  const durationSec = Math.max(1, Number(input.durationSec || 1));

  if (capability === 'video-generation' || capability === 'b-roll') {
    return CREATIVE_FINANCIAL_POLICY.videoPerTenSeconds * Math.max(1, Math.ceil(durationSec / 10));
  }

  if (capability === 'image-generation') {
    // Covers premium 4K image routes and one normal regeneration.
    return CREATIVE_FINANCIAL_POLICY.imageGeneration;
  }

  if (capability === 'talking-actor' || capability === 'lip-sync') {
    // OmniHuman/custom actors are intentionally priced with the same safe
    // floor. They must not fall back to the old 240-credit/15s estimate.
    const blocks = Math.max(1, Math.ceil(durationSec / 15));
    return CREATIVE_FINANCIAL_POLICY.talkingActorPerFifteenSeconds * blocks;
  }

  if (capability === 'text-to-speech') {
    return CREATIVE_FINANCIAL_POLICY.textToSpeechPerThirtySeconds * Math.max(1, Math.ceil(durationSec / 30));
  }

  if (capability === 'actor-replacement') {
    return CREATIVE_FINANCIAL_POLICY.actorReplacement;
  }

  if (capability === 'translation') {
    return CREATIVE_FINANCIAL_POLICY.translation;
  }

  return 0;
}

export function chooseProtectedCredits(params: {
  capability: CreativeCapability;
  input: CreativeProviderInput;
  model: string;
  configuredCredits: number;
}) {
  const floor = protectedCreativeCredits(params.capability, params.input);
  if (unsafePricingEnabled() && params.configuredCredits > 0) return params.configuredCredits;
  return Math.max(floor, params.configuredCredits);
}

