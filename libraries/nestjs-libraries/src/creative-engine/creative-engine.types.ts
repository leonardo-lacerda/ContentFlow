export type CreativeCapability =
  | 'image-generation'
  | 'video-generation'
  | 'talking-actor'
  | 'text-to-speech'
  | 'translation'
  | 'lip-sync'
  | 'captions'
  | 'b-roll'
  | 'actor-replacement';

export type CreativeAspectRatio = '9:16' | '1:1' | '16:9' | '4:5';

export interface CreativeProviderInput {
  prompt: string;
  aspectRatio?: CreativeAspectRatio | string;
  durationSec?: number;
  imageUrls?: string[];
  audioUrl?: string;
  videoUrl?: string;
  script?: string;
  actor?: { id?: string; imageUrl?: string; externalId?: string };
  voice?: { id?: string; externalId?: string; language?: string };
  language?: string;
  metadata?: Record<string, unknown>;
}

export interface CreativeProviderOutput {
  provider: string;
  model: string;
  url?: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreativeProviderQuote {
  provider: string;
  model: string;
  estimatedCredits: number;
  estimatedCostUsd?: number;
  explanation: string;
}

export interface CreativeProvider {
  readonly id: string;
  capabilities(): CreativeCapability[];
  quote(capability: CreativeCapability, input: CreativeProviderInput): CreativeProviderQuote;
  generate(capability: CreativeCapability, input: CreativeProviderInput): Promise<CreativeProviderOutput>;
  cancel?(capability: CreativeCapability, input: CreativeProviderInput): Promise<void>;
}

export const CREATIVE_DEFAULT_PRICING: Record<CreativeCapability, number> = {
  // Floors are intentionally conservative. They represent ContentFlow
  // credits and include room for premium Kie routes and one regeneration.
  'image-generation': 25,
  'video-generation': 800,
  'talking-actor': 325,
  'text-to-speech': 12,
  translation: 20,
  'lip-sync': 325,
  captions: 8,
  'b-roll': 800,
  'actor-replacement': 1300,
};

export function normalizeAspectRatio(value?: string) {
  if (value === '1:1' || value === '16:9' || value === '4:5') return value;
  return '9:16';
}

export function scopeCreativeIdempotencyKey(organizationId: string, key: string) {
  return `${organizationId}:${key}`;
}

export function estimateCreativeCredits(
  capability: CreativeCapability,
  input: CreativeProviderInput,
) {
  const base = CREATIVE_DEFAULT_PRICING[capability];
  const duration = Math.max(1, Math.ceil(input.durationSec || 8));
  if (capability === 'talking-actor' || capability === 'lip-sync') return base * Math.ceil(duration / 15);
  if (capability === 'text-to-speech') return base * Math.max(1, Math.ceil(duration / 30));
  if (capability === 'video-generation' || capability === 'b-roll') {
    return base * Math.max(1, Math.ceil(duration / 10));
  }
  return base;
}
