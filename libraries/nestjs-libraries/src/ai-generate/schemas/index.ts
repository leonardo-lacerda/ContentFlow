import { z } from 'zod';

/**
 * Schema registry for AI-generated content validation.
 * Each entry maps a schema name to its Zod schema, version, and helper functions.
 */

// ---- Internal imports for the registry ----
import {
  BrandDnaExtractionSchema,
  validate as _validateBrandDna,
  parse as _parseBrandDna,
} from './brand-dna-extraction.schema';
import {
  CarouselIdeaSchema,
  validate as _validateCarouselIdea,
  parse as _parseCarouselIdea,
} from './carousel-idea.schema';
import {
  CarouselPlanSchema,
  validate as _validateCarouselPlan,
  parse as _parseCarouselPlan,
} from './carousel-plan.schema';
import {
  EditorialReviewSchema,
  validate as _validateEditorialReview,
  parse as _parseEditorialReview,
} from './editorial-review.schema';
import {
  CaptionPackageSchema,
  validate as _validateCaptionPackage,
  parse as _parseCaptionPackage,
} from './caption-package.schema';
import {
  TemplateRecommendationSchema,
  validate as _validateTemplateRecommendation,
  parse as _parseTemplateRecommendation,
} from './template-recommendation.schema';

// ---- Re-exports for consumers ----
export { VERSION as BRAND_DNA_EXTRACTION_VERSION, BrandDnaExtractionSchema, validate as validateBrandDnaExtraction, parse as parseBrandDnaExtraction } from './brand-dna-extraction.schema';
export type { BrandDnaExtraction } from './brand-dna-extraction.schema';

export { VERSION as CAROUSEL_IDEA_VERSION, CarouselIdeaSchema, validate as validateCarouselIdea, parse as parseCarouselIdea } from './carousel-idea.schema';
export type { CarouselIdea, CarouselIdeaItem } from './carousel-idea.schema';

export { VERSION as CAROUSEL_PLAN_VERSION, CarouselPlanSchema, validate as validateCarouselPlan, parse as parseCarouselPlan } from './carousel-plan.schema';
export type { CarouselPlan, CarouselPlanSlide } from './carousel-plan.schema';

export { VERSION as EDITORIAL_REVIEW_VERSION, EditorialReviewSchema, validate as validateEditorialReview, parse as parseEditorialReview } from './editorial-review.schema';
export type { EditorialReview, EditorialIssue } from './editorial-review.schema';

export { VERSION as CAPTION_PACKAGE_VERSION, CaptionPackageSchema, validate as validateCaptionPackage, parse as parseCaptionPackage } from './caption-package.schema';
export type { CaptionPackage } from './caption-package.schema';

export { VERSION as TEMPLATE_RECOMMENDATION_VERSION, TemplateRecommendationSchema, validate as validateTemplateRecommendation, parse as parseTemplateRecommendation } from './template-recommendation.schema';
export type { TemplateRecommendation } from './template-recommendation.schema';

// ---- Registry ----

export interface SchemaEntry {
  name: string;
  version: string;
  schema: z.ZodTypeAny;
  validate: (data: unknown) => { success: boolean; data: unknown; errors: z.ZodError | null };
  parse: (data: unknown) => unknown;
}

export const SCHEMA_REGISTRY: Record<string, SchemaEntry> = {
  'brand-dna-extraction': {
    name: 'Brand DNA Extraction',
    version: '1.0.0',
    schema: BrandDnaExtractionSchema,
    validate: _validateBrandDna,
    parse: _parseBrandDna,
  },
  'carousel-idea': {
    name: 'Carousel Idea',
    version: '1.0.0',
    schema: CarouselIdeaSchema,
    validate: _validateCarouselIdea,
    parse: _parseCarouselIdea,
  },
  'carousel-plan': {
    name: 'Carousel Plan',
    version: '1.0.0',
    schema: CarouselPlanSchema,
    validate: _validateCarouselPlan,
    parse: _parseCarouselPlan,
  },
  'editorial-review': {
    name: 'Editorial Review',
    version: '1.0.0',
    schema: EditorialReviewSchema,
    validate: _validateEditorialReview,
    parse: _parseEditorialReview,
  },
  'caption-package': {
    name: 'Caption Package',
    version: '1.0.0',
    schema: CaptionPackageSchema,
    validate: _validateCaptionPackage,
    parse: _parseCaptionPackage,
  },
  'template-recommendation': {
    name: 'Template Recommendation',
    version: '1.0.0',
    schema: TemplateRecommendationSchema,
    validate: _validateTemplateRecommendation,
    parse: _parseTemplateRecommendation,
  },
};

/**
 * Look up a schema entry by its key in the registry.
 * Returns the entry or throws if not found.
 */
export function getSchema(key: string): SchemaEntry {
  const entry = SCHEMA_REGISTRY[key];
  if (!entry) {
    throw new Error(`Schema not found in registry: "${key}". Available keys: ${Object.keys(SCHEMA_REGISTRY).join(', ')}`);
  }
  return entry;
}

/**
 * List all registered schemas with their names and versions.
 */
export function listSchemas(): Array<{ key: string; name: string; version: string }> {
  return Object.entries(SCHEMA_REGISTRY).map(([key, entry]) => ({
    key,
    name: entry.name,
    version: entry.version,
  }));
}
