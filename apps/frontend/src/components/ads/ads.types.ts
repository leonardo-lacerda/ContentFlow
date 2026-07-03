export type AdPlatform = 'META_FACEBOOK' | 'META_INSTAGRAM' | 'LINKEDIN';
export type AdCreativeType = 'STATIC' | 'CAROUSEL';
export type AdObjective = 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'LEAD_GENERATION' | 'TRAFFIC' | 'ENGAGEMENT';
export type AdCreativeStatus = 'DRAFT' | 'APPROVED' | 'EXPORTED';

export interface AdTemplateSummary {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  category: string;
  objective: string[];
  active: boolean;
  preferredPlatforms: string[];
}

export interface GeneratedAdCreative {
  type: AdCreativeType;
  platform: AdPlatform;
  objective: AdObjective;
  adTemplateId?: string;
  headline: string;
  primaryText: string;
  description?: string;
  ctaButton: string;
  destinationUrl?: string;
  slides?: AdCarouselSlide[];
  slideCount?: number;
  imagePrompts?: AdImagePrompt[];
  policyWarnings: PolicyWarning[];
  claimsFlags: ClaimFlag[];
  tone?: string;
  rationale?: string;
  notes?: string;
}

export interface AdCarouselSlide {
  index: number;
  headline: string;
  body: string;
  imageUrl?: string;
  cta?: string;
  altText?: string;
}

export interface AdImagePrompt {
  role: string;
  prompt: string;
  aspectRatio?: string;
}

export interface PolicyWarning {
  ruleId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestion?: string;
  category: string;
}

export interface ClaimFlag {
  claim: string;
  severity: 'info' | 'warning' | 'critical';
  category: string;
  platform?: string;
}

export interface AdCreativeBatch {
  ads: GeneratedAdCreative[];
}

export interface GenerateAdsParams {
  brandProfileId: string;
  contentIdeaId?: string;
  carouselProjectId?: string;
  contentObjective?: string;
  productOrService?: string;
  platforms: string[];
  objective: string;
  adType: 'STATIC' | 'CAROUSEL' | 'AUTO';
  adTemplateId?: string;
  variants?: number;
  destinationUrl?: string;
  additionalContext?: string;
  ctaButton?: string;
  generateImagePrompts?: boolean;
}

export interface SavedAdCreative {
  id: string;
  type: AdCreativeType;
  platform: AdPlatform;
  objective: AdObjective;
  headline: string;
  primaryText: string;
  description?: string;
  ctaButton: string;
  destinationUrl?: string;
  status: AdCreativeStatus;
  policyWarnings?: any;
  claimsFlags?: any;
  createdAt: string;
}
