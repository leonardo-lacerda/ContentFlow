import { z } from 'zod';

export const VERSION = '1.0.0';

// Platform constraints
export const AD_PLATFORM_CONSTRAINTS: Record<
  string,
  {
    maxHeadline: number;
    maxPrimaryText: number;
    maxDescription: number;
    supportedCtas: string[];
    maxCarouselSlides: number;
    imageAspectRatios: string[];
  }
> = {
  META_FACEBOOK: {
    maxHeadline: 125,
    maxPrimaryText: 125,
    maxDescription: 30,
    supportedCtas: [
      'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'BOOK_TRAVEL', 'CONTACT_US',
      'DOWNLOAD', 'GET_OFFER', 'SUBSCRIBE', 'WATCH_MORE', 'APPLY_NOW',
      'ORDER_NOW', 'REQUEST_TIME',
    ],
    maxCarouselSlides: 10,
    imageAspectRatios: ['1:1', '4:5', '16:9'],
  },
  META_INSTAGRAM: {
    maxHeadline: 125,
    maxPrimaryText: 125,
    maxDescription: 30,
    supportedCtas: [
      'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'CONTACT_US',
      'DOWNLOAD', 'GET_OFFER', 'WATCH_MORE', 'ORDER_NOW',
    ],
    maxCarouselSlides: 10,
    imageAspectRatios: ['1:1', '4:5'],
  },
  LINKEDIN: {
    maxHeadline: 70,
    maxPrimaryText: 150,
    maxDescription: 100,
    supportedCtas: [
      'LEARN_MORE', 'SIGN_UP', 'DOWNLOAD', 'REQUEST_DEMO',
      'CONTACT_US', 'REGISTER', 'SUBSCRIBE', 'APPLY',
    ],
    maxCarouselSlides: 5,
    imageAspectRatios: ['1:1', '1.91:1'],
  },
};

// ---- Sub-schemas ----

const PolicyWarningSchema = z.object({
  ruleId: z.string().describe('Policy rule identifier'),
  severity: z.enum(['info', 'warning', 'critical']).describe('Severity level'),
  message: z.string().describe('Human-readable warning message'),
  suggestion: z.string().nullable().optional().describe('Suggested fix or alternative'),
  category: z.string().describe('Policy category'),
});

const ClaimFlagSchema = z.object({
  claim: z.string().describe('The flagged claim text'),
  severity: z.enum(['info', 'warning', 'critical']),
  category: z.string().describe('Claim category'),
  platform: z.string().nullable().optional().describe('Platform where restricted'),
});

const AdCarouselSlideSchema = z.object({
  index: z.number().int().nonnegative().describe('Slide position (0-based)'),
  headline: z.string().min(1).max(125).describe('Slide headline'),
  body: z.string().min(1).describe('Slide body text'),
  imageUrl: z.string().nullable().optional().describe('Image URL for this slide'),
  cta: z.string().nullable().optional().describe('Slide-specific CTA override'),
  altText: z.string().nullable().optional().describe('Accessibility alt text'),
});

const AdImagePromptSchema = z.object({
  role: z.string().describe('Image role (e.g. hero, slide-1)'),
  prompt: z.string().describe('Image generation prompt'),
  aspectRatio: z.string().nullable().optional().describe('Recommended aspect ratio'),
});

// ---- Main Ad Creative schema ----

const AdCreativeSchema = z.object({
  type: z.enum(['STATIC', 'CAROUSEL']).describe('Ad creative type'),
  platform: z.string().describe('Target platform (META_FACEBOOK, META_INSTAGRAM, LINKEDIN)'),
  objective: z
    .enum(['AWARENESS', 'CONSIDERATION', 'CONVERSION', 'LEAD_GENERATION', 'TRAFFIC', 'ENGAGEMENT'])
    .describe('Campaign objective'),
  adTemplateId: z.string().nullable().optional().describe('ID of the ad template used'),

  // Ad copy
  headline: z.string().min(1).max(125).describe('Ad headline'),
  primaryText: z.string().min(1).describe('Primary ad text'),
  description: z.string().nullable().optional().describe('Link description'),
  ctaButton: z.string().describe('CTA button type'),
  destinationUrl: z.string().nullable().optional().describe('Destination URL'),

  // Carousel (optional)
  slides: z.array(AdCarouselSlideSchema).min(2).max(10).nullable().optional().describe('Carousel slides'),
  slideCount: z.number().int().nullable().optional().describe('Number of slides'),

  // Image prompts
  imagePrompts: z.array(AdImagePromptSchema).nullable().optional().describe('Prompts for generating images'),

  // Compliance
  policyWarnings: z.array(PolicyWarningSchema).default([]).describe('Ad policy warnings'),
  claimsFlags: z.array(ClaimFlagSchema).default([]).describe('Flagged claims'),

  // Metadata
  tone: z.string().nullable().optional().describe('Tone used'),
  rationale: z.string().nullable().optional().describe('Why this approach'),
  notes: z.string().nullable().optional().describe('Internal notes'),
});

export type AdCreative = z.infer<typeof AdCreativeSchema>;

// ---- Batch schema ----

export const AdCreativeBatchSchema = z.object({
  ads: z.array(AdCreativeSchema).min(1).describe('Array of generated ad creatives'),
});

export type AdCreativeBatch = z.infer<typeof AdCreativeBatchSchema>;

// ---- Ad templates data ----

export const AD_TEMPLATES = [
  { id: 'problem-solution', name: 'Problem → Solution', description: 'Pain point followed by solution' },
  { id: 'social-proof', name: 'Social Proof', description: 'Testimonials, reviews, case studies' },
  { id: 'offer-promotion', name: 'Offer / Promotion', description: 'Direct offer with price/discount' },
  { id: 'comparison', name: 'Comparison', description: 'Before/After or Us vs Them' },
  { id: 'testimonial', name: 'Testimonial', description: 'Customer testimonial story' },
] as const;

// ---- Validation helpers ----

export function validate(data: unknown): {
  success: boolean;
  data: AdCreativeBatch | null;
  errors: z.ZodError | null;
} {
  const result = AdCreativeBatchSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  return { success: false, data: null, errors: result.error };
}

export function parse(data: unknown): AdCreativeBatch {
  return AdCreativeBatchSchema.parse(data);
}
