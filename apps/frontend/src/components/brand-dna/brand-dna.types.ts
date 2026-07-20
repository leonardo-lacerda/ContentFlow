export type BrandStatus = 'DRAFT' | 'ANALYZING' | 'NEEDS_REVIEW' | 'ACTIVE' | 'FAILED';

export interface BrandProfile {
  id: string;
  organizationId: string;
  name: string;
  website?: string;
  industry?: string;
  status: BrandStatus;
  selected: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface DnaSummary {
  tagline: string;
  description: string;
  industry: string;
  targetAudience: string;
}

export interface DnaVoice {
  tone: string;
  style: string;
  personality: string;
  forbiddenWords: string[];
}

export interface DnaAudience {
  demographics: string;
  painPoints: string[];
  desires: string[];
  objections: string[];
}

export interface DnaOffer {
  products: string[];
  services: string[];
  uniqueSellingPoints: string[];
  pricingHint?: string;
}

export interface DnaVisual {
  colors: string[];
  style: string;
  typographyHint?: string;
  photographyStyle?: string;
}

export interface DnaConstraints {
  do: string[];
  avoid: string[];
  requiredElements: string[];
}

export interface DnaMessaging {
  brandValues: string[];
  brandStory: string;
  competitors: string[];
  messagingPillars: string[];
  keyCTAs: string[];
  emotionalTriggers: string[];
}

export interface DnaContentGuidelines {
  postLengthHint: string;
  hashtagStrategy: string[];
  emojiUsage: string;
  contentMix: string[];
  bestPractices: string[];
}

export interface DnaConfidence {
  overall: number;
  textual: number;
  visual: number;
  commercial: number;
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


export interface BrandDnaMessaging {
  brandValues?: string[];
  brandStory?: string;
  competitors?: string[];
  messagingPillars?: string[];
  keyCTAs?: string[];
  emotionalTriggers?: string[];
}

export interface BrandDnaContentGuidelines {
  postLengthHint?: string;
  emojiUsage?: string;
  hashtagStrategy?: string[];
  contentMix?: string[];
  bestPractices?: string[];
}
