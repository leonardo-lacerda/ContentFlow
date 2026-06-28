import { z } from 'zod';

export const VERSION = '1.0.0';

// ---- Main schema ----

export const TemplateRecommendationSchema = z.object({
  templateId: z.string().describe('The unique identifier of the recommended template'),
  name: z.string().describe('The display name of the template'),
  reason: z.string().describe('Why this template was recommended'),
  confidence: z.number().min(0).max(1).describe('Confidence score for this recommendation (0-1)'),
});

export type TemplateRecommendation = z.infer<typeof TemplateRecommendationSchema>;

/**
 * Validate an unknown payload against the TemplateRecommendation schema.
 */
export function validate(data: unknown): {
  success: boolean;
  data: TemplateRecommendation | null;
  errors: z.ZodError | null;
} {
  const result = TemplateRecommendationSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  return { success: false, data: null, errors: result.error };
}

/**
 * Parse an unknown payload against the TemplateRecommendation schema.
 * Returns typed data or throws on failure.
 */
export function parse(data: unknown): TemplateRecommendation {
  return TemplateRecommendationSchema.parse(data);
}
