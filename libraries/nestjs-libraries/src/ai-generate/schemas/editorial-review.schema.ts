import { z } from 'zod';

export const VERSION = '2.0.0';

// ---- Sub-schemas ----

/**
 * Issue schema that accepts BOTH legacy format (slide, severity, issue)
 * AND new format (slideIndex, type, field, message).
 * Fields are cross-compatible: slideIndex || slide for the slide number,
 * message || issue for the description.
 */
const IssueSchema = z.object({
  type: z.enum(['warning', 'blocker']).optional().describe('Issue severity: warning or blocker'),
  slideIndex: z.number().int().min(0).optional().describe('Slide index where the issue occurs'),
  slide: z.number().int().min(0).optional().describe('Alias for slideIndex (legacy format)'),
  field: z.string().optional().describe('The field with the issue (headline, body, cta, etc.)'),
  severity: z.enum(['low', 'medium', 'high']).optional().describe('Severity level (legacy format)'),
  message: z.string().optional().describe('Human-readable description of the issue'),
  issue: z.string().optional().describe('Alias for message (legacy format)'),
  suggestion: z.string().optional().describe('Suggested fix for the issue'),
});

const TemplateCheckResultSchema = z.object({
  checkId: z.string().describe('ID of the editorial check'),
  passed: z.boolean().describe('Whether the check passed'),
  message: z.string().optional().describe('Detail about the check result'),
  matchedSlide: z.number().int().min(0).optional().describe('Slide that triggered the check'),
});

const ForbiddenTermMatchSchema = z.object({
  term: z.string().describe('The forbidden term found'),
  slideIndex: z.number().int().min(0).describe('Slide where the term was found'),
  field: z.string().describe('Field where the term was found (headline, body, cta)'),
});

// ---- Main schema ----

export const EditorialReviewSchema = z.object({
  verdict: z.string().describe('Overall verdict: approve, needs_changes, or reject'),
  score: z.number().min(0).max(100).describe('Overall quality score (0-100)'),
  issues: z.array(IssueSchema).default([]).describe('List of editorial issues found'),
  strengths: z.array(z.string()).default([]).describe('Strengths of the carousel'),
  summary: z.string().optional().describe('Brief summary of the review'),
  canBeFixed: z.boolean().default(true).describe('Whether the carousel can be auto-fixed'),
  templateCheckResults: z.array(TemplateCheckResultSchema).default([]).describe('Results of template-specific editorial checks'),
  forbiddenTermMatches: z.array(ForbiddenTermMatchSchema).default([]).describe('Forbidden terms found in the content'),
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
