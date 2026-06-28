import { z } from 'zod';

export const VERSION = '1.0.0';

// ---- Sub-schemas ----

const IssueSchema = z.object({
  type: z.enum(['warning', 'blocker']).describe('Issue severity: warning or blocker'),
  slideIndex: z.number().int().min(0).optional().describe('Slide index where the issue occurs'),
  field: z.string().describe('The field with the issue (headline, body, cta, etc.)'),
  message: z.string().describe('Human-readable description of the issue'),
  suggestion: z.string().optional().describe('Suggested fix for the issue'),
});

// ---- Main schema ----

export const EditorialReviewSchema = z.object({
  verdict: z.string().describe('Overall verdict: approve, needs_changes, or reject'),
  score: z.number().min(0).max(100).describe('Overall quality score (0-100)'),
  issues: z.array(IssueSchema).default([]).describe('List of editorial issues found'),
  summary: z.string().optional().describe('Brief summary of the review'),
  canBeFixed: z.boolean().default(true).describe('Whether the carousel can be auto-fixed'),
});

export type EditorialReview = z.infer<typeof EditorialReviewSchema>;
export type EditorialIssue = z.infer<typeof IssueSchema>;

/**
 * Validate an unknown payload against the EditorialReview schema.
 */
export function validate(data: unknown): {
  success: boolean;
  data: EditorialReview | null;
  errors: z.ZodError | null;
} {
  const result = EditorialReviewSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  return { success: false, data: null, errors: result.error };
}

/**
 * Parse an unknown payload against the EditorialReview schema.
 * Returns typed data or throws on failure.
 */
export function parse(data: unknown): EditorialReview {
  return EditorialReviewSchema.parse(data);
}
