export type SocialPlatform = 'instagram' | 'linkedin' | 'tiktok' | 'twitter' | 'threads' | 'facebook';

export type PostTone =
  | 'professional'
  | 'casual'
  | 'humorous'
  | 'inspirational'
  | 'educational'
  | 'urgent'
  | 'playful'
  | 'authentic'
  | 'storytelling';

// ---- Rich strategic fields (aligned with backend Zod schema) ----

export interface VisualGuidance {
  type: string;
  description: string;
  style?: string;
  colors?: string[];
  textOverlay?: string;
}

export interface EngagementStrategy {
  technique: string;
  explanation: string;
  expectedOutcome: string;
}

export interface PostingStrategy {
  bestTime?: string;
  bestDay?: string;
  frequency?: string;
  repurposeSuggestions?: string[];
}

export interface GrowthTip {
  category: string;
  tip: string;
  impact?: string;
}

export interface ExpectedEngagement {
  likes?: string;
  comments?: string;
  shares?: string;
  notes?: string;
}

// ---- Main post type (rich) ----

export interface GeneratedSocialPost {
  platform: SocialPlatform;
  content: string;
  caption?: string;
  hashtags: string[];
  cta?: string;
  tone: string;
  charCount: number;
  notes?: string;
  // Strategic guidance
  rationale?: string;
  hookAnalysis?: string;
  platformOptimization?: string;
  // Visual
  visualGuidance?: VisualGuidance[];
  // Engagement
  engagementStrategy?: EngagementStrategy;
  // Posting
  postingStrategy?: PostingStrategy;
  // Growth
  growthTips?: GrowthTip[];
  // Expected
  expectedEngagement?: ExpectedEngagement;
}

export interface SocialPostBatch {
  posts: GeneratedSocialPost[];
}

export interface GenerateSocialPostsParams {
  brandProfileId?: string;
  contentIdeaId?: string;
  carouselProjectId?: string;
  topic?: string;
  platforms: SocialPlatform[];
  tone?: PostTone;
  language?: string;
  additionalContext?: string;
}

// ---- Constants ----

export const AVAILABLE_PLATFORMS: SocialPlatform[] = [
  'instagram',
  'facebook',
  'linkedin',
  'twitter',
  'tiktok',
];

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  twitter: 'X / Twitter',
  tiktok: 'TikTok',
  threads: 'Threads',
};

export const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  instagram: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-300',
  facebook: 'bg-blue-500/15 text-blue-400',
  linkedin: 'bg-blue-600/15 text-blue-300',
  twitter: 'bg-sky-500/15 text-sky-400',
  tiktok: 'bg-red-500/15 text-red-400',
  threads: 'bg-purple-400/15 text-purple-300',
};

export const AVAILABLE_TONES: { value: PostTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'educational', label: 'Educational' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'playful', label: 'Playful' },
  { value: 'authentic', label: 'Authentic' },
  { value: 'storytelling', label: 'Storytelling' },
];

export const AVAILABLE_LANGUAGES: { value: string; label: string }[] = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'pt-BR', label: 'Português (BR)' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'it-IT', label: 'Italiano' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' },
  { value: 'zh-CN', label: '中文 (简体)' },
];
