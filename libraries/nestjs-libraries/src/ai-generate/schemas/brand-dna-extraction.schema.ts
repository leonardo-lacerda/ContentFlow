import { z } from 'zod';

export const VERSION = '2.0.0';

// kie.ai (this app's default LLM provider — see ai-text.client.ts) has no
// native structured-output enforcement: the JSON shape is only a prompt
// instruction, validated afterwards with this schema. A schema where every
// one of 40+ nested fields is required means the model has to get literally
// everything right in one shot, or the whole extraction is thrown away
// (observed in production: real sites failing 3/3 retries). Every field here
// is therefore optional; normalizeBrandDnaExtraction() below fills sensible
// defaults so callers can keep treating the result as fully-shaped, matching
// the same loosen-then-backfill pattern already used for
// contentPresentationTool (see content.presentation.tool.ts).

const SummarySchema = z.object({
  tagline: z.string().optional().describe('A short, catchy tagline for the brand'),
  description: z
    .string()
    .optional()
    .describe('A concise description of what the brand does'),
  industry: z.string().optional().describe('The industry the brand operates in'),
  targetAudience: z
    .string()
    .optional()
    .describe('The primary target audience of the brand'),
  missionStatement: z
    .string()
    .optional()
    .describe('The brand mission statement, or empty string if not found'),
  valueProposition: z
    .string()
    .optional()
    .describe(
      'The core value proposition - what unique value the brand delivers to customers'
    ),
});

const VoiceSchema = z.object({
  tone: z
    .string()
    .optional()
    .describe('The overall tone of the brand voice (e.g. professional, playful)'),
  style: z
    .string()
    .optional()
    .describe('The writing style (e.g. conversational, technical)'),
  personality: z.string().optional().describe('The brand personality adjectives'),
  forbiddenWords: z
    .array(z.string())
    .optional()
    .describe('Words the brand avoids (empty array if none)'),
  examplePhrases: z
    .array(z.string())
    .optional()
    .describe(
      '2-3 example sentences written in the brand voice to illustrate tone and style'
    ),
});

const AudienceSchema = z.object({
  demographics: z
    .string()
    .optional()
    .describe('Key demographic information about the audience'),
  painPoints: z
    .array(z.string())
    .optional()
    .describe('Primary pain points the audience faces'),
  desires: z.array(z.string()).optional().describe('What the audience desires'),
  objections: z
    .array(z.string())
    .optional()
    .describe('Common objections to purchasing/engaging'),
  buyerPersonas: z
    .array(
      z.object({
        name: z.string().optional().describe('A short persona name (e.g. "Marketing Manager Maria")'),
        description: z.string().optional().describe('Brief 1-2 sentence persona description'),
        role: z.string().optional().describe('Typical job role or life context'),
      })
    )
    .optional()
    .describe('2-3 primary buyer personas identified from the website'),
});

const OfferSchema = z.object({
  products: z.array(z.string()).optional().describe('Products offered by the brand'),
  services: z.array(z.string()).optional().describe('Services offered by the brand'),
  uniqueSellingPoints: z
    .array(z.string())
    .optional()
    .describe('What differentiates the brand from competitors'),
  pricingHint: z
    .string()
    .nullable()
    .optional()
    .describe('Any hints about pricing positioning, or null if unknown'),
  category: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Product/service category classification (e.g. "SaaS", "E-commerce", "Agency")'
    ),
  topCompetitors: z
    .array(z.string())
    .optional()
    .describe(
      '2-4 main competitor brand names detected from the website content'
    ),
});

const VisualSchema = z.object({
  colors: z.array(z.string()).optional().describe('Brand colors (hex or named)'),
  style: z
    .string()
    .optional()
    .describe('Visual style (e.g. minimalist, bold, modern)'),
  typographyHint: z
    .string()
    .nullable()
    .optional()
    .describe('Typography preferences if identifiable, or null'),
  imageryStyle: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Type of imagery used (e.g. "lifestyle photography", "abstract illustrations", "product shots", "team photos")'
    ),
});

const ConstraintsSchema = z.object({
  do: z
    .array(z.string())
    .optional()
    .describe('Things to do when representing this brand'),
  avoid: z
    .array(z.string())
    .optional()
    .describe('Things to avoid when representing this brand'),
  requiredElements: z
    .array(z.string())
    .optional()
    .describe('Elements that must be included in content'),
});

const MessagingSchema = z.object({
  messagingPillars: z
    .array(z.string())
    .optional()
    .describe(
      '3-5 core messaging pillars / recurring themes the brand emphasizes'
    ),
  keyMessages: z
    .array(z.string())
    .optional()
    .describe('2-4 key messages the brand consistently communicates across channels'),
  callToActionStyle: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Preferred CTA style (e.g. "urgency-driven", "value-led", "soft invitation", "data-backed")'
    ),
});

const ContentGuidelinesSchema = z.object({
  preferredFormats: z
    .array(z.string())
    .optional()
    .describe(
      'Content formats the brand favors (e.g. "carousels", "short-form video", "long-form blog", "infographics")'
    ),
  hashtagsStrategy: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Hashtag usage strategy observed (e.g. "branded + 5-10 niche", "minimal 2-3 broad")'
    ),
  emojiUsage: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Emoji usage pattern (e.g. "frequent in captions", "none in formal posts", "sparingly for emphasis")'
    ),
});

const ConfidenceSchema = z.object({
  overall: z.number().min(0).max(1).optional().describe('Overall confidence score (0-1)'),
  textual: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Confidence in text-based analysis (0-1)'),
  visual: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Confidence in visual analysis (0-1)'),
  commercial: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Confidence in commercial/offer analysis (0-1)'),
  messaging: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Confidence in messaging and positioning analysis (0-1)'),
  brandValues: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Confidence in brand values and mission extraction (0-1)'),
});

export const BrandDnaExtractionSchema = z.object({
  summary: SummarySchema.optional().describe('High-level brand summary'),
  voice: VoiceSchema.optional().describe('Brand voice characteristics'),
  audience: AudienceSchema.optional().describe('Target audience insights'),
  offer: OfferSchema.optional().describe('Products, services and differentiators'),
  visual: VisualSchema.optional().describe('Visual identity guidelines'),
  constraints: ConstraintsSchema.optional().describe(
    'Content constraints and requirements'
  ),
  messaging: MessagingSchema.optional().describe(
    'Messaging strategy and communication pillars'
  ),
  contentGuidelines: ContentGuidelinesSchema.optional().describe(
    'Content format and publishing guidelines'
  ),
  confidence: ConfidenceSchema.optional().describe(
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

/**
 * Fills every optional field left out by the model with the same empty
 * defaults the previous fully-required schema effectively guaranteed, so
 * every downstream consumer (Prisma Json columns, the brand detail page's
 * rendering) keeps seeing the full, fully-shaped object it always has —
 * a genuinely partial extraction is still useful and saved, instead of the
 * whole analysis being discarded because the model missed one field.
 */
export function normalizeBrandDnaExtraction(
  data: BrandDnaExtraction
): Required<{
  summary: Required<z.infer<typeof SummarySchema>>;
  voice: Required<z.infer<typeof VoiceSchema>>;
  audience: {
    demographics: string;
    painPoints: string[];
    desires: string[];
    objections: string[];
    buyerPersonas: Array<{ name: string; description: string; role: string }>;
  };
  offer: Required<z.infer<typeof OfferSchema>>;
  visual: Required<z.infer<typeof VisualSchema>>;
  constraints: Required<z.infer<typeof ConstraintsSchema>>;
  messaging: Required<z.infer<typeof MessagingSchema>>;
  contentGuidelines: Required<z.infer<typeof ContentGuidelinesSchema>>;
  confidence: Required<z.infer<typeof ConfidenceSchema>>;
}> {
  const s = data.summary || {};
  const v = data.voice || {};
  const a = data.audience || {};
  const o = data.offer || {};
  const vi = data.visual || {};
  const c = data.constraints || {};
  const m = data.messaging || {};
  const cg = data.contentGuidelines || {};
  const conf = data.confidence || {};
  return {
    summary: {
      tagline: s.tagline || '',
      description: s.description || '',
      industry: s.industry || '',
      targetAudience: s.targetAudience || '',
      missionStatement: s.missionStatement || '',
      valueProposition: s.valueProposition || '',
    },
    voice: {
      tone: v.tone || '',
      style: v.style || '',
      personality: v.personality || '',
      forbiddenWords: v.forbiddenWords || [],
      examplePhrases: v.examplePhrases || [],
    },
    audience: {
      demographics: a.demographics || '',
      painPoints: a.painPoints || [],
      desires: a.desires || [],
      objections: a.objections || [],
      buyerPersonas: (a.buyerPersonas || []).map((p) => ({
        name: p?.name || '',
        description: p?.description || '',
        role: p?.role || '',
      })),
    },
    offer: {
      products: o.products || [],
      services: o.services || [],
      uniqueSellingPoints: o.uniqueSellingPoints || [],
      pricingHint: o.pricingHint ?? null,
      category: o.category ?? null,
      topCompetitors: o.topCompetitors || [],
    },
    visual: {
      colors: vi.colors || [],
      style: vi.style || '',
      typographyHint: vi.typographyHint ?? null,
      imageryStyle: vi.imageryStyle ?? null,
    },
    constraints: {
      do: c.do || [],
      avoid: c.avoid || [],
      requiredElements: c.requiredElements || [],
    },
    messaging: {
      messagingPillars: m.messagingPillars || [],
      keyMessages: m.keyMessages || [],
      callToActionStyle: m.callToActionStyle ?? null,
    },
    contentGuidelines: {
      preferredFormats: cg.preferredFormats || [],
      hashtagsStrategy: cg.hashtagsStrategy ?? null,
      emojiUsage: cg.emojiUsage ?? null,
    },
    confidence: {
      overall: conf.overall ?? 0,
      textual: conf.textual ?? 0,
      visual: conf.visual ?? 0,
      commercial: conf.commercial ?? 0,
      messaging: conf.messaging ?? 0,
      brandValues: conf.brandValues ?? 0,
    },
  };
}
