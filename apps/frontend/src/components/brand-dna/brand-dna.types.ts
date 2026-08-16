export type BrandStatus = 'DRAFT' | 'ANALYZING' | 'NEEDS_REVIEW' | 'ACTIVE' | 'FAILED';

export interface BrandProfile {
  id: string;
  organizationId: string;
  name: string;
  website?: string;
  industry?: string;
  status: BrandStatus;
  lastAnalysisError?: string | null;
  selected: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ---- DNA v2.0.0 types (matches extraction schema) ----

export interface DnaSummary {
  tagline: string;
  description: string;
  industry: string;
  targetAudience: string;
  missionStatement: string;
  valueProposition: string;
}

export interface DnaVoice {
  tone: string;
  style: string;
  personality: string;
  forbiddenWords: string[];
  examplePhrases: string[];
}

export interface DnaBuyerPersona {
  name: string;
  description: string;
  role: string;
}

export interface DnaAudience {
  demographics: string;
  painPoints: string[];
  desires: string[];
  objections: string[];
  buyerPersonas: DnaBuyerPersona[];
}

export interface DnaOffer {
  products: string[];
  services: string[];
  uniqueSellingPoints: string[];
  pricingHint: string | null;
  category: string | null;
  topCompetitors: string[];
}

export interface DnaVisual {
  colors: string[];
  style: string;
  typographyHint: string | null;
  imageryStyle: string | null;
}

export interface DnaConstraints {
  do: string[];
  avoid: string[];
  requiredElements: string[];
}

export interface DnaMessaging {
  messagingPillars: string[];
  keyMessages: string[];
  callToActionStyle: string | null;
}

export interface DnaContentGuidelines {
  preferredFormats: string[];
  hashtagsStrategy: string | null;
  emojiUsage: string | null;
}

export interface DnaConfidence {
  overall: number;
  textual: number;
  visual: number;
  commercial: number;
  messaging: number;
  brandValues: number;
}

export interface BrandDnaSnapshot {
  id: string;
  brandProfileId: string;
  version: number;
  sourceType: string;
  sourceUrl?: string;
  summary: DnaSummary;
  voice: DnaVoice;
  audience: DnaAudience;
  offer: DnaOffer;
  visual: DnaVisual;
  constraints: DnaConstraints;
  messaging?: DnaMessaging;
  contentGuidelines?: DnaContentGuidelines;
  confidence?: DnaConfidence;
  promptVersion: string;
  model: string;
  createdAt: string;
}

export interface BrandAsset {
  id: string;
  brandProfileId: string;
  mediaId?: string;
  type: string;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
  approved: boolean;
  createdAt: string;
}

// ---- Legacy aliases (backward compat for components using old names) ----

export type BrandDnaMessaging = DnaMessaging;
export type BrandDnaContentGuidelines = DnaContentGuidelines;
