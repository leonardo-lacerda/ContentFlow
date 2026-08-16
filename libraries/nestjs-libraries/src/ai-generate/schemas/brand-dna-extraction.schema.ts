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
//
// IMPORTANT: "optional" here means `.nullable()`, NOT `.optional()`. This
// schema is fed through the `openai` SDK's `zodResponseFormat()` helper
// (ai-text.client.ts) purely to generate the JSON Schema description shown to
// the model in the prompt — but that helper enforces OpenAI's real
// Structured Outputs constraint at conversion time, synchronously, regardless
// of which provider actually receives the request: every property must stay
// in the schema's "required" list, so optionality can only be expressed via
// `.nullable()` (value present but null), never `.optional()` (key omitted
// entirely). Using `.optional()` throws immediately - "uses `.optional()`
// without `.nullable()` which is not supported by the API" - before any
// network call is ever made, which is why every analysis failed 3/3 tries
// the moment this schema was loosened with plain `.optional()`.
// https://platform.openai.com/docs/guides/structured-outputs#all-fields-must-be-required

const SummarySchema = z.object({
  tagline: z.string().nullable().describe('A short, catchy tagline for the brand'),
  description: z
    .string()
    .nullable()
    .describe('A concise description of what the brand does'),
  industry: z.string().nullable().describe('The industry the brand operates in'),
  targetAudience: z
    .string()
    .nullable()
    .describe('The primary target audience of the brand'),
  missionStatement: z
    .string()
    .nullable()
    .describe('The brand mission statement, or empty string if not found'),
  valueProposition: z
    .string()
    .nullable()
    .describe(
      'The core value proposition - what unique value the brand delivers to customers'
    ),
});

const VoiceSchema = z.object({
  tone: z
    .string()
    .nullable()
    .describe('The overall tone of the brand voice (e.g. professional, playful)'),
  style: z
    .string()
    .nullable()
    .describe('The writing style (e.g. conversational, technical)'),
  // Accepts either shape: the prompt asks for "2-4 personality adjectives",
  // which models frequently answer as an array even though every frontend
  // consumer (brand-detail-page, onboarding review, brand-company-bridge)
  // renders this as a single string - normalizeBrandDnaExtraction() below
  // joins an array reply into a comma-separated string.
  personality: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .describe('The brand personality adjectives, as a comma-separated string'),
  forbiddenWords: z
    .array(z.string())
    .nullable()
    .describe('Words the brand avoids (empty array if none)'),
  examplePhrases: z
    .array(z.string())
    .nullable()
    .describe(
      '2-3 example sentences written in the brand voice to illustrate tone and style'
    ),
});

const AudienceSchema = z.object({
  demographics: z
    .string()
    .nullable()
    .describe('Key demographic information about the audience'),
  painPoints: z
    .array(z.string())
    .nullable()
    .describe('Primary pain points the audience faces'),
  desires: z.array(z.string()).nullable().describe('What the audience desires'),
  objections: z
    .array(z.string())
    .nullable()
    .describe('Common objections to purchasing/engaging'),
  buyerPersonas: z
    .array(
      z.object({
        name: z.string().nullable().describe('A short persona name (e.g. "Marketing Manager Maria")'),
        description: z.string().nullable().describe('Brief 1-2 sentence persona description'),
        role: z.string().nullable().describe('Typical job role or life context'),
      })
    )
    .nullable()
    .describe('2-3 primary buyer personas identified from the website'),
});

const OfferSchema = z.object({
  products: z.array(z.string()).nullable().describe('Products offered by the brand'),
  services: z.array(z.string()).nullable().describe('Services offered by the brand'),
  uniqueSellingPoints: z
    .array(z.string())
    .nullable()
    .describe('What differentiates the brand from competitors'),
  pricingHint: z
    .string()
    .nullable()
    .describe('Any hints about pricing positioning, or null if unknown'),
  category: z
    .string()
    .nullable()
    .describe(
      'Product/service category classification (e.g. "SaaS", "E-commerce", "Agency")'
    ),
  topCompetitors: z
    .array(z.string())
    .nullable()
    .describe(
      '2-4 main competitor brand names detected from the website content'
    ),
});

const VisualSchema = z.object({
  colors: z.array(z.string()).nullable().describe('Brand colors (hex or named)'),
  style: z
    .string()
    .nullable()
    .describe('Visual style (e.g. minimalist, bold, modern)'),
  typographyHint: z
    .string()
    .nullable()
    .describe('Typography preferences if identifiable, or null'),
  imageryStyle: z
    .string()
    .nullable()
    .describe(
      'Type of imagery used (e.g. "lifestyle photography", "abstract illustrations", "product shots", "team photos")'
    ),
});

const ConstraintsSchema = z.object({
  do: z
    .array(z.string())
    .nullable()
    .describe('Things to do when representing this brand'),
  avoid: z
    .array(z.string())
    .nullable()
    .describe('Things to avoid when representing this brand'),
  requiredElements: z
    .array(z.string())
    .nullable()
    .describe('Elements that must be included in content'),
});

const MessagingSchema = z.object({
  messagingPillars: z
    .array(z.string())
    .nullable()
    .describe(
      '3-5 core messaging pillars / recurring themes the brand emphasizes'
    ),
  keyMessages: z
    .array(z.string())
    .nullable()
    .describe('2-4 key messages the brand consistently communicates across channels'),
  callToActionStyle: z
    .string()
    .nullable()
    .describe(
      'Preferred CTA style (e.g. "urgency-driven", "value-led", "soft invitation", "data-backed")'
    ),
});

const ContentGuidelinesSchema = z.object({
  preferredFormats: z
    .array(z.string())
    .nullable()
    .describe(
      'Content formats the brand favors (e.g. "carousels", "short-form video", "long-form blog", "infographics")'
    ),
  hashtagsStrategy: z
    .string()
    .nullable()
    .describe(
      'Hashtag usage strategy observed (e.g. "branded + 5-10 niche", "minimal 2-3 broad")'
    ),
  emojiUsage: z
    .string()
    .nullable()
    .describe(
      'Emoji usage pattern (e.g. "frequent in captions", "none in formal posts", "sparingly for emphasis")'
    ),
});

const ConfidenceSchema = z.object({
  overall: z.number().min(0).max(1).nullable().describe('Overall confidence score (0-1)'),
  textual: z
    .number()
    .min(0)
    .max(1)
    .nullable()
    .describe('Confidence in text-based analysis (0-1)'),
  visual: z
    .number()
    .min(0)
    .max(1)
    .nullable()
    .describe('Confidence in visual analysis (0-1)'),
  commercial: z
    .number()
    .min(0)
    .max(1)
    .nullable()
    .describe('Confidence in commercial/offer analysis (0-1)'),
  messaging: z
    .number()
    .min(0)
    .max(1)
    .nullable()
    .describe('Confidence in messaging and positioning analysis (0-1)'),
  brandValues: z
    .number()
    .min(0)
    .max(1)
    .nullable()
    .describe('Confidence in brand values and mission extraction (0-1)'),
});

export const BrandDnaExtractionSchema = z.object({
  summary: SummarySchema.nullable().describe('High-level brand summary'),
  voice: VoiceSchema.nullable().describe('Brand voice characteristics'),
  audience: AudienceSchema.nullable().describe('Target audience insights'),
  offer: OfferSchema.nullable().describe('Products, services and differentiators'),
  visual: VisualSchema.nullable().describe('Visual identity guidelines'),
  constraints: ConstraintsSchema.nullable().describe(
    'Content constraints and requirements'
  ),
  messaging: MessagingSchema.nullable().describe(
    'Messaging strategy and communication pillars'
  ),
  contentGuidelines: ContentGuidelinesSchema.nullable().describe(
    'Content format and publishing guidelines'
  ),
  confidence: ConfidenceSchema.nullable().describe(
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
 * Fills every null/missing field left out by the model with the same empty
 * defaults the original fully-required schema effectively guaranteed, so
 * every downstream consumer (Prisma Json columns, the brand detail page's
 * rendering) keeps seeing the full, fully-shaped object it always has —
 * a genuinely partial extraction is still useful and saved, instead of the
 * whole analysis being discarded because the model left one field null.
 */
export function normalizeBrandDnaExtraction(
  data: BrandDnaExtraction
): Required<{
  summary: Required<{ [K in keyof z.infer<typeof SummarySchema>]: string }>;
  voice: {
    tone: string;
    style: string;
    personality: string;
    forbiddenWords: string[];
    examplePhrases: string[];
  };
  audience: {
    demographics: string;
    painPoints: string[];
    desires: string[];
    objections: string[];
    buyerPersonas: Array<{ name: string; description: string; role: string }>;
  };
  offer: {
    products: string[];
    services: string[];
    uniqueSellingPoints: string[];
    pricingHint: string | null;
    category: string | null;
    topCompetitors: string[];
  };
  visual: {
    colors: string[];
    style: string;
    typographyHint: string | null;
    imageryStyle: string | null;
  };
  constraints: { do: string[]; avoid: string[]; requiredElements: string[] };
  messaging: {
    messagingPillars: string[];
    keyMessages: string[];
    callToActionStyle: string | null;
  };
  contentGuidelines: {
    preferredFormats: string[];
    hashtagsStrategy: string | null;
    emojiUsage: string | null;
  };
  confidence: {
    overall: number;
    textual: number;
    visual: number;
    commercial: number;
    messaging: number;
    brandValues: number;
  };
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
      personality: Array.isArray(v.personality)
        ? v.personality.filter(Boolean).join(', ')
        : v.personality || '',
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
