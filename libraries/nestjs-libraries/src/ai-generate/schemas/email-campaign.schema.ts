import { z } from 'zod';

export const VERSION = '1.0.0';

// ---- Email block types ----

const EmailTextBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string().describe('Text content with HTML tags allowed (b, i, a, strong, em)'),
  alignment: z.enum(['left', 'center', 'right']).default('left'),
  fontSize: z.number().nullable().optional().describe('Font size in px'),
  color: z.string().nullable().optional().describe('Text color hex'),
  marginTop: z.number().nullable().optional(),
  marginBottom: z.number().nullable().optional(),
});

const EmailHeadingBlockSchema = z.object({
  type: z.literal('heading'),
  level: z.enum(['h1', 'h2', 'h3']).describe('Heading level'),
  content: z.string().describe('Heading text'),
  text: z.string().nullable().optional().describe('Alias for content (backward compat)'),
  alignment: z.enum(['left', 'center', 'right']).default('center'),
  color: z.string().nullable().optional(),
  marginTop: z.number().nullable().optional(),
  marginBottom: z.number().nullable().optional(),
});

const EmailImageBlockSchema = z.object({
  type: z.literal('image'),
  src: z.string().describe('Image URL'),
  url: z.string().nullable().optional().describe('Alias for src (backward compat)'),
  alt: z.string().describe('Alt text for accessibility'),
  width: z.number().nullable().optional().describe('Width in px (auto if not set)'),
  alignment: z.enum(['left', 'center', 'right']).default('center'),
  linkUrl: z.string().nullable().optional().describe('Click-through URL'),
  marginTop: z.number().nullable().optional(),
  marginBottom: z.number().nullable().optional(),
});

const EmailDividerBlockSchema = z.object({
  type: z.literal('divider'),
  color: z.string().default('#cccccc').describe('Divider color hex'),
  marginTop: z.number().nullable().optional(),
  marginBottom: z.number().nullable().optional(),
});

const EmailCtaBlockSchema = z.object({
  type: z.literal('cta'),
  text: z.string().describe('CTA button text'),
  url: z.string().describe('CTA destination URL'),
  color: z.string().default('#007bff').describe('Button background color hex'),
  textColor: z.string().default('#ffffff').describe('Button text color hex'),
  alignment: z.enum(['left', 'center', 'right']).default('center'),
  borderRadius: z.number().default(4).describe('Button border radius in px'),
  marginTop: z.number().nullable().optional(),
  marginBottom: z.number().nullable().optional(),
});

const EmailCarouselCardSchema = z.object({
  type: z.literal('carousel_card'),
  imageUrl: z.string().describe('Card image URL'),
  title: z.string().describe('Card title'),
  summary: z.string().describe('Card summary text'),
  linkUrl: z.string().nullable().optional().describe('Card click-through URL'),
});

const EmailCarouselBlockSchema = z.object({
  type: z.literal('carousel'),
  cards: z.array(EmailCarouselCardSchema).min(2).max(10).describe('Carousel cards (rendered as horizontal cards in email)'),
  layout: z.enum(['horizontal', 'stacked']).default('horizontal'),
  marginTop: z.number().nullable().optional(),
  marginBottom: z.number().nullable().optional(),
  // Backward compat: slides from older schema
  slides: z.array(z.object({
    image: z.string(),
    title: z.string(),
    text: z.string().nullable().optional(),
  })).nullable().optional(),
});

const EmailSpacerBlockSchema = z.object({
  type: z.literal('spacer'),
  height: z.number().default(20).describe('Spacer height in px'),
});

const EmailSocialLinksBlockSchema = z.object({
  type: z.literal('social_links'),
  networks: z.array(z.object({
    name: z.string().describe('Network name (e.g., instagram, twitter, linkedin)'),
    url: z.string().url(),
    icon: z.string().nullable().optional().describe('Icon URL or icon name'),
  })).describe('Social media links to display'),
  alignment: z.enum(['left', 'center', 'right']).default('center'),
  marginTop: z.number().nullable().optional(),
  marginBottom: z.number().nullable().optional(),
});

export const EmailBlockSchema = z.discriminatedUnion('type', [
  EmailTextBlockSchema,
  EmailHeadingBlockSchema,
  EmailImageBlockSchema,
  EmailDividerBlockSchema,
  EmailCtaBlockSchema,
  EmailCarouselBlockSchema,
  EmailSpacerBlockSchema,
  EmailSocialLinksBlockSchema,
]);

// ---- Main email campaign schema ----

export const EmailCampaignSchema = z.object({
  type: z.enum(['NEWSLETTER', 'WELCOME_SEQUENCE', 'PROMOTIONAL']).describe('Campaign type'),
  name: z.string().describe('Campaign name for internal reference'),

  subject: z.string().min(1).max(150).describe('Email subject line'),
  preheader: z.string().max(150).nullable().optional().describe('Preheader text (shown in inbox preview)'),

  blocks: z.array(EmailBlockSchema).min(1).describe('Email body blocks (ordered top to bottom)'),

  // CTA at email level
  ctaText: z.string().nullable().optional().describe('Primary CTA text'),
  ctaUrl: z.string().nullable().optional().describe('Primary CTA URL'),
  ctaColor: z.string().nullable().optional().describe('Primary CTA color hex'),

  // Welcome sequence specific
  sequenceIndex: z.number().int().nonnegative().nullable().optional().describe('Position in welcome sequence (0-based)'),
  sequenceTotal: z.number().int().positive().nullable().optional().describe('Total emails in sequence'),
  sequenceDelayDays: z.number().int().nonnegative().nullable().optional().describe('Days delay before sending'),

  // Visual customization
  headerImageUrl: z.string().nullable().optional().describe('Header/banner image URL'),
  logoUrl: z.string().nullable().optional().describe('Logo image URL'),
  primaryColor: z.string().nullable().optional().describe('Brand primary color hex'),
  secondaryColor: z.string().nullable().optional().describe('Brand secondary color hex'),

  // Generation metadata
  tone: z.string().nullable().optional().describe('Tone used for generation'),
  rationale: z.string().nullable().optional().describe('Why this approach was chosen'),
  notes: z.string().nullable().optional().describe('Internal notes'),
  plainText: z.string().nullable().optional().describe('Plain text version for fallback'),
});

export type EmailCampaignData = z.infer<typeof EmailCampaignSchema>;
export type EmailBlock = z.infer<typeof EmailBlockSchema>;

// ---- Batch schema for welcome sequences ----

export const WelcomeSequenceSchema = z.object({
  emails: z.array(EmailCampaignSchema).min(2).max(7).describe('Welcome sequence emails (ordered by sequenceIndex)'),
});

export type WelcomeSequence = z.infer<typeof WelcomeSequenceSchema>;

// ---- Campaign type metadata ----

export const EMAIL_CAMPAIGN_TYPES = [
  { id: 'newsletter', name: 'Newsletter', description: 'Content digest based on carousel' },
  { id: 'welcome_sequence', name: 'Sequência de Boas-vindas', description: 'Multi-email welcome drip' },
  { id: 'promotional', name: 'Campanha Promocional', description: 'Single high-impact promotional email' },
] as const;

// ---- Validation helpers ----

export function validate(data: unknown): {
  success: boolean;
  data: EmailCampaignData | null;
  errors: z.ZodError | null;
} {
  const result = EmailCampaignSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  return { success: false, data: null, errors: result.error };
}

export function parse(data: unknown): EmailCampaignData {
  return EmailCampaignSchema.parse(data);
}
