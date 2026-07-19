import { z } from 'zod';

export const VERSION = '1.0.0';

// OpenAI Structured Outputs requires every field to be required.
// Use .nullable() instead of .nullable().optional() / .default() for optional semantics.

const SummarySchema = z.object({
  tagline: z.string().describe('A short, catchy tagline for the brand'),
  description: z
    .string()
    .describe('A concise description of what the brand does'),
  industry: z.string().describe('The industry the brand operates in'),
  targetAudience: z
    .string()
    .describe('The primary target audience of the brand'),
});

const VoiceSchema = z.object({
  tone: z
    .string()
    .describe('The overall tone of the brand voice (e.g. professional, playful)'),
  style: z
    .string()
    .describe('The writing style (e.g. conversational, technical)'),
  personality: z.string().describe('The brand personality adjectives'),
  forbiddenWords: z
    .array(z.string())
    .describe('Words the brand avoids (empty array if none)'),
});

const AudienceSchema = z.object({
  demographics: z
    .string()
    .describe('Key demographic information about the audience'),
  painPoints: z
    .array(z.string())
    .describe('Primary pain points the audience faces'),
  desires: z.array(z.string()).describe('What the audience desires'),
  objections: z
    .array(z.string())
    .describe('Common objections to purchasing/engaging'),
});

const OfferSchema = z.object({
  products: z.array(z.string()).describe('Products offered by the brand'),
  services: z.array(z.string()).describe('Services offered by the brand'),
  uniqueSellingPoints: z
    .array(z.string())
    .describe('What differentiates the brand from competitors'),
  pricingHint: z
    .string()
    .nullable()
    .describe('Any hints about pricing positioning, or null if unknown'),
});

const VisualSchema = z.object({
  colors: z.array(z.string()).describe('Brand colors (hex or named)'),
  style: z
    .string()
    .describe('Visual style (e.g. minimalist, bold, modern)'),
  typographyHint: z
    .string()
    .nullable()
    .describe('Typography preferences if identifiable, or null'),
});

const ConstraintsSchema = z.object({
  do: z
    .array(z.string())
    .describe('Things to do when representing this brand'),
  avoid: z
    .array(z.string())
    .describe('Things to avoid when representing this brand'),
  requiredElements: z
    .array(z.string())
    .describe('Elements that must be included in content'),
});

const ConfidenceSchema = z.object({
  overall: z.number().min(0).max(1).describe('Overall confidence score (0-1)'),
  textual: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in text-based analysis (0-1)'),
  visual: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in visual analysis (0-1)'),
  commercial: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in commercial/offer analysis (0-1)'),
});

export const BrandDnaExtractionSchema = z.object({
  summary: SummarySchema.describe('High-level brand summary'),
  voice: VoiceSchema.describe('Brand voice characteristics'),
  audience: AudienceSchema.describe('Target audience insights'),
  offer: OfferSchema.describe('Products, services and differentiators'),
  visual: VisualSchema.describe('Visual identity guidelines'),
  constraints: ConstraintsSchema.describe(
    'Content constraints and requirements'
  ),
  confidence: ConfidenceSchema.describe(
    'Confidence levels for each analysis dimension'
  ),
});

export type BrandDnaExtraction = z.infer<typeof BrandDnaExtractionSchema>;

/**
 * Validate an unknown payload against the BrandDnaExtraction schema.
 * Returns a result object with success flag, typed data, and any validation errors.
 */
export function validate(data: unknown): {
  success: boolean;
  data: BrandDnaExtraction | null;
  errors: z.ZodError | null;
} {
  const result = BrandDnaExtractionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  return { success: false, data: null, errors: result.error };
}

/**
 * Parse an unknown payload against the BrandDnaExtraction schema.
 * Returns typed data or throws a ZodError on failure.
 */
export function parse(data: unknown): BrandDnaExtraction {
  return BrandDnaExtractionSchema.parse(data);
}
