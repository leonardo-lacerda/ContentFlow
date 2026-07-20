import { z } from 'zod';

export const VERSION = '2.0.0';

/**
 * Platform-specific constraints for social media posts.
 * Includes both min and max hashtag ranges per platform.
 */
export const PLATFORM_CONSTRAINTS: Record<
  string,
  { maxChars: number; minHashtags: number; maxHashtags: number }
> = {
  instagram: { maxChars: 2200, minHashtags: 5, maxHashtags: 30 },
  twitter:   { maxChars: 280,  minHashtags: 3, maxHashtags: 5 },
  linkedin:  { maxChars: 3000, minHashtags: 3, maxHashtags: 5 },
  facebook:  { maxChars: 63206, minHashtags: 1, maxHashtags: 3 },
  tiktok:    { maxChars: 2200, minHashtags: 5, maxHashtags: 8 },
  youtube:   { maxChars: 5000, minHashtags: 5, maxHashtags: 15 },
  threads:   { maxChars: 500,  minHashtags: 3, maxHashtags: 5 },
  pinterest: { maxChars: 500,  minHashtags: 5, maxHashtags: 20 },
};

// ---- Sub-schemas for strategic guidance ----

const VisualGuidanceSchema = z.object({
  type: z.string().describe('Recommended visual type: photo, illustration, screenshot, meme, carousel, infographic, video-thumbnail'),
  description: z.string().describe('Detailed description of what the image should contain'),
  style: z.string().describe('Visual style: minimalist, bold, corporate, playful, cinematic'),
  colors: z.string().nullable().optional().describe('Color palette recommendation'),
  textOverlay: z.string().nullable().optional().describe('Text to overlay on the image, if any'),
});

const EngagementStrategySchema = z.object({
  technique: z.string().describe('Engagement technique used (e.g. question hook, controversial take, story arc, list hook)'),
  explanation: z.string().explain('How this technique drives engagement on this specific platform'),
  expectedOutcome: z.string().describe('What kind of engagement to expect (comments, shares, saves, etc.)'),
});

const PostingStrategySchema = z.object({
  bestTime: z.string().describe('Recommended posting time window'),
  bestDay: z.string().describe('Recommended day of week'),
  frequency: z.string().describe('How often to post similar content'),
  repurposeSuggestions: z.array(z.string()).describe('How to repurpose this content on other platforms or formats'),
});

const GrowthTipSchema = z.object({
  category: z.string().describe('Tip category: content, engagement, algorithm, growth, community, repurposing'),
  tip: z.string().describe('Actionable growth tip specific to this post'),
  impact: z.enum(['quick-win', 'medium-term', 'long-term']).describe('Expected impact timeline'),
});

// ---- Individual post schema ----

export const SocialPostSchema = z.object({
  platform: z
    .string()
    .min(1)
    .describe('The target social media platform (e.g. instagram, twitter, linkedin)'),
  content: z
    .string()
    .min(1)
    .describe('The main post content/body text'),
  caption: z
    .string()
    .nullable().optional()
    .describe('Optional caption (used when the platform separates caption from content)'),
  hashtags: z
    .array(z.string())
    .default([])
    .describe('Hashtags for the post (without the # symbol)'),
  cta: z
    .string()
    .nullable().optional()
    .describe('Call-to-action text for the post'),
  tone: z
    .string()
    .describe('The tone of the post (e.g. professional, casual, urgent)'),
  charCount: z
    .number()
    .int()
    .nonnegative()
    .describe('Approximate character count of the post'),

  // Strategic rationale
  rationale: z.string().describe('WHY this specific post structure, hook, and angle will work for this platform and audience'),
  hookAnalysis: z.string().describe('Analysis of why the opening line/hook will stop the scroll'),
  platformOptimization: z.string().describe('How this post leverages the specific platform algorithm and user behavior'),

  // Visual guidance
  visualGuidance: z.array(VisualGuidanceSchema).min(1).describe('Visual recommendations for this post'),

  // Engagement strategy
  engagementStrategy: EngagementStrategySchema.describe('How this post is designed to drive engagement'),

  // Posting strategy
  postingStrategy: PostingStrategySchema.describe('When and how to post this content for maximum reach'),

  // Growth tips
  growthTips: z.array(GrowthTipSchema).min(2).describe('Actionable tips to maximize this post performance'),

  // Performance expectations
  expectedEngagement: z.object({
    likes: z.string().describe('Expected likes range'),
    comments: z.string().describe('Expected comments range'),
    shares: z.string().describe('Expected shares/saves range'),
    notes: z.string().describe('Context about these expectations'),
  }).describe('Expected engagement metrics for this post'),

  notes: z
    .string()
    .nullable().optional()
    .describe('Internal notes about the post'),
});

export type SocialPost = z.infer<typeof SocialPostSchema>;

// ---- Batch schema ----

export const SocialPostBatchSchema = z.object({
  posts: z
    .array(SocialPostSchema)
    .min(1)
    .describe('Array of generated social media posts'),
});

export type SocialPostBatch = z.infer<typeof SocialPostBatchSchema>;

/**
 * Validate an unknown payload against the SocialPostBatch schema.
 */
export function validate(data: unknown): {
  success: boolean;
  data: SocialPostBatch | null;
  errors: z.ZodError | null;
} {
  const result = SocialPostBatchSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  return { success: false, data: null, errors: result.error };
}

/**
 * Parse an unknown payload against the SocialPostBatch schema.
 * Returns typed data or throws on failure.
 */
export function parse(data: unknown): SocialPostBatch {
  return SocialPostBatchSchema.parse(data);
}
