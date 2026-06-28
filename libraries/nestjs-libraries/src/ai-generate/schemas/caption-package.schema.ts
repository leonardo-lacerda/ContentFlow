import { z } from 'zod';

export const VERSION = '1.0.0';

// ---- Main schema ----

export const CaptionPackageSchema = z.object({
  caption: z.string().min(1).describe('The generated caption text'),
  hashtags: z.array(z.string()).default([]).describe('Suggested hashtags for the post'),
  platform: z.string().describe('The target platform (e.g. Instagram, LinkedIn, Twitter)'),
});

export type CaptionPackage = z.infer<typeof CaptionPackageSchema>;

/**
 * Validate an unknown payload against the CaptionPackage schema.
 */
export function validate(data: unknown): {
  success: boolean;
  data: CaptionPackage | null;
  errors: z.ZodError | null;
} {
  const result = CaptionPackageSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  return { success: false, data: null, errors: result.error };
}

/**
 * Parse an unknown payload against the CaptionPackage schema.
 * Returns typed data or throws on failure.
 */
export function parse(data: unknown): CaptionPackage {
  return CaptionPackageSchema.parse(data);
}
