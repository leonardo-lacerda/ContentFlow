import { z } from 'zod';
import {
  validateBrandDnaExtraction,
  validateCarouselIdea,
  validateCarouselPlan,
  validateEditorialReview,
  validateCaptionPackage,
  validateSocialPost,
  validateAdCreative,
  validateEmailCampaign,
  validateVideoScript,
  BRAND_DNA_EXTRACTION_VERSION,
  CAROUSEL_IDEA_VERSION,
  CAROUSEL_PLAN_VERSION,
  EDITORIAL_REVIEW_VERSION,
  CAPTION_PACKAGE_VERSION,
  SOCIAL_POST_VERSION,
  AD_CREATIVE_VERSION,
  EMAIL_CAMPAIGN_VERSION,
  VIDEO_SCRIPT_VERSION,
} from './schemas';

export type ValidationResult<T> = {
  success: boolean;
  data: T | null;
  errors: z.ZodError | null;
  schemaVersion: string;
  attemptedRepair: boolean;
  repairApplied: boolean;
};

export type SchemaType = 
  | 'brand-dna-extraction'
  | 'carousel-idea'
  | 'carousel-plan'
  | 'editorial-review'
  | 'caption-package'
  | 'social-post'
  | 'ad-creative'
  | 'email-campaign'
  | 'video-script';

const SCHEMA_VERSIONS: Record<SchemaType, string> = {
  'brand-dna-extraction': BRAND_DNA_EXTRACTION_VERSION,
  'carousel-idea': CAROUSEL_IDEA_VERSION,
  'carousel-plan': CAROUSEL_PLAN_VERSION,
  'editorial-review': EDITORIAL_REVIEW_VERSION,
  'caption-package': CAPTION_PACKAGE_VERSION,
  'social-post': SOCIAL_POST_VERSION,
  'ad-creative': AD_CREATIVE_VERSION,
  'email-campaign': EMAIL_CAMPAIGN_VERSION,
  'video-script': VIDEO_SCRIPT_VERSION,
};

const SCHEMA_VALIDATORS: Record<
  SchemaType,
  (data: unknown) => { success: boolean; data: unknown | null; errors: z.ZodError | null }
> = {
  'brand-dna-extraction': validateBrandDnaExtraction,
  'carousel-idea': validateCarouselIdea,
  'carousel-plan': validateCarouselPlan,
  'editorial-review': validateEditorialReview,
  'caption-package': validateCaptionPackage,
  'social-post': validateSocialPost,
  'ad-creative': validateAdCreative,
  'email-campaign': validateEmailCampaign,
  'video-script': validateVideoScript,
};

/**
 * Attempt to repair common JSON issues from AI responses.
 * LLMs sometimes add markdown fences, trailing commas, or extra text.
 */
function attemptJsonRepair(raw: string): string {
  let cleaned = raw.trim();

  // Remove markdown code fences: ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/i, '');

  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Extract JSON from a response that may have surrounding text.
 * Falls back to extracting content between { and }.
 */
function extractJson(raw: string): string {
  const repaired = attemptJsonRepair(raw);

  // Try parsing directly first
  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    // Not valid JSON — try extracting between outermost { }
  }

  const start = repaired.indexOf('{');
  const end = repaired.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const extracted = repaired.slice(start, end + 1);
    try {
      JSON.parse(extracted);
      return extracted;
    } catch {
      // Still invalid, will fail zod validation
    }
  }

  return repaired;
}

/**
 * Validate an AI response against a Zod schema with automatic repair attempts.
 *
 * @param schemaType - Which schema to validate against
 * @param rawResponse - The raw string response from the AI
 * @param maxRetries - Maximum number of repair+retry cycles (default: 0 = no retry)
 * @returns Validated result with schema version info
 */
export function validateAiResponse<T>(
  schemaType: SchemaType,
  rawResponse: string,
  maxRetries: number = 0
): ValidationResult<T> {
  const validator = SCHEMA_VALIDATORS[schemaType];
  const schemaVersion = SCHEMA_VERSIONS[schemaType];

  if (!validator) {
    return {
      success: false,
      data: null,
      errors: null,
      schemaVersion,
      attemptedRepair: false,
      repairApplied: false,
    };
  }

  // Step 1: Extract and parse JSON
  const jsonStr = extractJson(rawResponse);
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return {
      success: false,
      data: null,
      errors: null,
      schemaVersion,
      attemptedRepair: false,
      repairApplied: false,
    };
  }

  // Step 2: Validate with schema
  let result = validator(parsed);

  // Step 3: Attempt repairs if validation fails
  if (!result.success && maxRetries > 0) {
    const repaired = attemptRepairBasedOnErrors(parsed, schemaType);
    if (repaired !== null) {
      const retryResult = validator(repaired);
      if (retryResult.success) {
        return {
          success: true,
          data: retryResult.data as T,
          errors: null,
          schemaVersion,
          attemptedRepair: true,
          repairApplied: true,
        };
      }
      result = retryResult;
    }
  }

  return {
    success: result.success,
    data: result.data as T | null,
    errors: result.errors,
    schemaVersion,
    attemptedRepair: maxRetries > 0,
    repairApplied: false,
  };
}

/**
 * Attempt to repair common Zod validation errors.
 * Handles cases like missing defaults, wrong types, etc.
 */
function attemptRepairBasedOnErrors(
  data: unknown,
  schemaType: SchemaType
): unknown | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const obj = data as Record<string, unknown>;

  switch (schemaType) {
    case 'carousel-idea': {
      // Ensure ideas array exists
      if (!Array.isArray(obj.ideas)) {
        obj.ideas = [];
      }
      break;
    }
    case 'carousel-plan': {
      // Ensure slides array exists with at least 1 slide
      if (!Array.isArray(obj.slides) || obj.slides.length === 0) {
        obj.slides = [{ index: 0, headline: 'Slide', body: '' }];
      }
      // Ensure required fields
      if (!obj.title) obj.title = 'Carrossel';
      if (!obj.platform) obj.platform = 'instagram';
      if (!obj.language) obj.language = 'pt-BR';
      break;
    }
    case 'caption-package': {
      if (!obj.caption) obj.caption = '';
      if (!Array.isArray(obj.hashtags)) obj.hashtags = [];
      break;
    }
    default:
      return null;
  }

  return obj;
}

/**
 * Build the metadata block for AI response tracking.
 */
export function buildAiMetadata(
  schemaType: SchemaType,
  model: string,
  provider: string,
  usage?: Record<string, unknown>,
  costEstimate?: unknown
) {
  return {
    model,
    provider,
    promptVersion: getPromptVersion(schemaType),
    schemaVersion: SCHEMA_VERSIONS[schemaType],
    usage,
    costEstimate,
  };
}

/**
 * Get the current prompt version for a given schema type.
 * This should be bumped when prompts change.
 */
export function getPromptVersion(schemaType: SchemaType): string {
  const promptVersions: Record<SchemaType, string> = {
    'brand-dna-extraction': '1.0.0',
    'carousel-idea': '1.0.0',
    'carousel-plan': '1.0.0',
    'editorial-review': '1.0.0',
    'caption-package': '1.0.0',
    'social-post': '1.0.0',
    'ad-creative': '1.0.0',
    'email-campaign': '1.0.0',
    'video-script': '1.0.0',
  };
  return promptVersions[schemaType] || '0.0.0';
}
