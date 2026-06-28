import { z } from 'zod';

export const VERSION = '1.0.0';

// ---- Sub-schemas ----

const IdeaSchema = z.object({
  title: z.string().describe('The idea title / working name'),
  hook: z.string().describe('The opening hook that grabs attention'),
  goal: z.string().describe('What this carousel aims to achieve'),
  angle: z.string().describe('The unique angle or perspective'),
  templateSuggestion: z.string().optional().describe('Suggested template ID or name'),
  platformSuggestion: z.string().optional().describe('Suggested platform (e.g. Instagram, LinkedIn)'),
  score: z.number().min(0).max(10).optional().describe('Estimated effectiveness score (0-10) — can be calculated heuristically'),
});

// ---- Main schema ----

export const CarouselIdeaSchema = z.object({
  ideas: z.array(IdeaSchema).min(1).describe('List of carousel content ideas'),
});

export type CarouselIdea = z.infer<typeof CarouselIdeaSchema>;
export type CarouselIdeaItem = z.infer<typeof IdeaSchema>;

/**
 * Validate an unknown payload against the CarouselIdea schema.
 */
export function validate(data: unknown): {
  success: boolean;
  data: CarouselIdea | null;
  errors: z.ZodError | null;
} {
  const result = CarouselIdeaSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  return { success: false, data: null, errors: result.error };
}

/**
 * Parse an unknown payload against the CarouselIdea schema.
 * Returns typed data or throws on failure.
 */
export function parse(data: unknown): CarouselIdea {
  return CarouselIdeaSchema.parse(data);
}
