export type GeneratedImage = {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
  mediaId?: string;
};

// Referência visual de estilo: o usuário vê só a imagem (dataUrl); o prompt
// fica associado internamente e é reutilizado na geração final.
export type StyleReference = {
  id: string;
  label?: string;
  prompt: string;
  dataUrl: string;
  image?: GeneratedImage;
};

export type CostEstimate = {
  usd: number;
  brl: number;
  usdToBrl: number;
  tokens: {
    textInputTokens: number;
    textInputCachedTokens: number;
    imageInputTokens: number;
    imageInputCachedTokens: number;
    imageOutputTokens: number;
    totalTokens: number;
  };
};

export type CarouselSlide = {
  index: number;
  headline: string;
  body: string;
  cta: string;
  imagePrompt: string;
  altText: string;
};

export type CarouselPlan = {
  title: string;
  platform: string;
  language: string;
  caption: string;
  hashtags: string[];
  imageStyleGuide: string;
  slides: CarouselSlide[];
  provider?: string;
  model?: string;
  usage?: Record<string, unknown>;
  cost_estimate?: CostEstimate | null;
};

export type GenerateImageResponse = {
  created: number;
  images: GeneratedImage[];
  provider?: 'ia_generate' | 'openai_official';
  model?: string;
  usage?: Record<string, unknown>;
  cost_estimate?: CostEstimate | null;
};

export type CarouselImageJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  total: number;
  completed: number;
  failed: number;
  slides: Array<{
    slideIndex: number;
    status: 'queued' | 'running' | 'completed' | 'failed';
    result?: GenerateImageResponse;
    error?: string;
  }>;
};

export type CostHistoryResponse = {
  entries: Array<{
    id: string;
    type: 'text' | 'image' | 'estimate';
    label: string;
    createdAt: string;
    cost: CostEstimate;
  }>;
  totals: {
    usd: number;
    brl: number;
    tokens: number;
  };
  softLimitBrl: number;
  hardLimitBrl: number;
};

export type SlideImageResult = {
  image?: GeneratedImage;
  error?: string;
  cost_estimate?: CostEstimate | null;
};

export type CarouselTemplate = {
  id: string;
  label: string;
  goal: string;
  tone: string;
  slideCount: number;
  visualStyle: string;
  instruction: string;
};

export type EditorialIssue = {
  slide: number;
  label: string;
  tone: 'warning' | 'danger';
};

export type ReferenceImage = {
  id: string;
  name: string;
  src: string;
  source: 'global' | 'upload' | 'brand' | 'company';
  favorite: boolean;
  selected: boolean;
  approved?: boolean;
  category?: string;
  description?: string;
};

export type VisualIdentityAsset = {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  description?: string;
};

export type BrandPalette = {
  id: string;
  name: string;
  colors: string[];
  usage: string;
};

export type BrandFontPreset = {
  id: string;
  name: string;
  headline: string;
  body: string;
  usage: string;
};

export type BrandLogoAsset = {
  id: string;
  name: string;
  dataUrl: string;
  usage: string;
  description: string;
};

export type StyleRule = {
  id: string;
  type: 'do' | 'dont';
  text: string;
};

export type CompanyInspiration = {
  id: string;
  name: string;
  src: string;
  source: string;
  category: string;
  favorite: boolean;
  approved: boolean;
  description: string;
};

export type CompanyProfile = {
  id?: string;
  companyName: string;
  website: string;
  industry: string;
  targetAudience: string;
  productsOrServices: string;
  differentials: string;
  toneOfVoice: string;
  summary: string;
  visualIdentitySummary?: string;
  brandColors?: string;
  brandFonts?: string;
  defaultCta?: string;
  forbiddenTerms?: string;
  contentPreferences?: string;
  visualIdentityAssets?: VisualIdentityAsset[];
  brandPalettes?: BrandPalette[];
  brandFontPresets?: BrandFontPreset[];
  brandLogos?: BrandLogoAsset[];
  styleRules?: StyleRule[];
  inspirationLibrary?: CompanyInspiration[];
  ideasLibrary?: CompanyIdea[];
  updatedAt: string;
  hasProfile?: boolean;
};

export type CarouselIdea = {
  title: string;
  hook: string;
  goal: string;
  angle: string;
};

export type CompanyIdea = CarouselIdea & {
  id: string;
  createdAt: string;
};

export type VisualDirectionMode = 'brand' | 'balanced' | 'inspiration';

export type SavedAiProject = {
  id: string;
  originalName?: string;
  carouselProject?: any;
  children?: Array<{
    id: string;
    path: string;
    alt?: string;
  }>;
};

export type EditorialReview = {
  score: number;
  verdict: string;
  issues: Array<{
    slide?: number;
    severity: 'low' | 'medium' | 'high';
    issue: string;
    suggestion: string;
  }>;
  strengths: string[];
};
