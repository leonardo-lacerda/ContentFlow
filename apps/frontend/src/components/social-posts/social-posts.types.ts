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

export interface GeneratedSocialPost {
  platform: SocialPlatform;
  content: string;
  caption?: string;
  hashtags: string[];
  cta?: string;
  tone: string;
  charCount: number;
  notes?: string;
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

export const AVAILABLE_PLATFORMS: SocialPlatform[] = [
  'instagram',
  'linkedin',
  'tiktok',
  'twitter',
  'threads',
  'facebook',
];

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
