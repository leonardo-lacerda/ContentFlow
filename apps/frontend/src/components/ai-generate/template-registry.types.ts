/**
 * Frontend types for backend carousel template definitions and recommendations.
 */

export type BackendTemplateDefinition = {
  id: string;
  label: string;
  description: string;
  version: string;
  active: boolean;
  category: string;
  goal: string;
  tone: string;
  preferredPlatforms: string[];
  preferredNiches: string[];
  recommendedSlideCount: { min: number; max: number; default: number };
  narrative: {
    name: string;
    description: string;
    promptInstruction: string;
  };
  visualStyle: string;
  textDensity: string;
  recommendedCta: string;
  ctaVariations: string[];
  editorialChecks: Array<{
    id: string;
    description: string;
    severity: string;
    message: string;
  }>;
  instruction: string;
};

export type TemplateRecommendation = {
  templateId: string;
  name: string;
  reason: string;
  confidence: number;
  narrativePreview: string;
};

export type TemplateListResponse = {
  templates: BackendTemplateDefinition[];
  schemaVersion: string;
};

export type TemplateRecommendRequest = {
  topic?: string;
  niche?: string;
  goal?: string;
  platform?: string;
};

export type TemplateRecommendResponse = {
  recommendations: TemplateRecommendation[];
  defaultTemplateId: string;
};

export type TemplateTrackEvent = 'select' | 'generate' | 'complete';

export type TemplateTrackRequest = {
  templateId: string;
  event: TemplateTrackEvent;
};
