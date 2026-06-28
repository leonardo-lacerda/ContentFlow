import { z } from 'zod';

export const VERSION = '1.0.0';

// ---- Sub-schemas ----

const SlideSchema = z.object({
  index: z.number().int().min(0).describe('Zero-based slide index'),
  headline: z.string().describe('The slide headline/title'),
  body: z.string().describe('The slide body text'),
  cta: z.string().optional().describe('Call-to-action text for this slide'),
  imagePrompt: z.string().optional().describe('AI image generation prompt for this slide'),
  altText: z.string().optional().describe('Accessible alt text for the slide image'),
});

// ---- Main schema ----

export const CarouselPlanSchema = z.object({
  title: z.string().describe('The carousel title'),
  platform: z.string().describe('Target platform (e.g. Instagram, LinkedIn, Twitter)'),
  language: z.string().describe('Language code (e.g. pt-BR, en-US)'),
  caption: z.string().describe('The main post caption'),
  hashtags: z.array(z.string()).default([]).describe('Suggested hashtags'),
  imageStyleGuide: z.string().optional().describe('Visual style guide for image generation'),
  slides: z.array(SlideSchema).min(1).describe('The carousel slides in order'),
});

export type CarouselPlan = z.infer<typeof CarouselPlanSchema>;
export type CarouselPlanSlide = z.infer<typeof SlideSchema>;

/**
 * Validate an unknown payload against the CarouselPlan schema.
 */
export function validate(data: unknown): {
  success: boolean;
  data: CarouselPlan | null;
  errors: z.ZodError | null;
} {
  const result = CarouselPlanSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  return { success: false, data: null, errors: result.error };
}

/**
 * Parse an unknown payload against the CarouselPlan schema.
 * Returns typed data or throws on failure.
 */
export function parse(data: unknown): CarouselPlan {
  return CarouselPlanSchema.parse(data);
}
