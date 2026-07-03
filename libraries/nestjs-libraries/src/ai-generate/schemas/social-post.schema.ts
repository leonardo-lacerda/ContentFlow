import { z } from 'zod';

export const VERSION = '1.0.0';

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
    .optional()
    .describe('Optional caption (used when the platform separates caption from content)'),
  hashtags: z
    .array(z.string())
    .default([])
    .describe('Hashtags for the post (without the # symbol)'),
  cta: z
    .string()
    .optional()
    .describe('Call-to-action text for the post'),
  tone: z
    .string()
    .describe('The tone of the post (e.g. professional, casual, urgent)'),
  charCount: z
    .number()
    .int()
    .nonnegative()
    .describe('Approximate character count of the post'),
  notes: z
    .string()
    .optional()
    .describe('Internal notes about the post (e.g. best time to post, strategy)'),
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
