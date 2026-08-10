export type KieCapability =
  | 'image-generation'
  | 'video-generation'
  | 'b-roll'
  | 'text-to-speech'
  | 'talking-actor'
  | 'lip-sync'
  | 'translation';

export interface KieTaskHandle {
  taskId: string;
  endpoint: 'veo' | 'market' | 'image';
  model: string;
}

export interface KieTaskResult {
  taskId: string;
  status: string;
  url?: string;
  audioUrl?: string;
  thumbnailUrl?: string;
  translatedText?: string;
  raw?: unknown;
}

export interface KieVeoInput {
  prompt: string;
  imageUrls?: string[];
  aspectRatio?: string;
  durationSec?: number;
  model?: string;
  callbackUrl?: string;
  generateAudio?: boolean;
  generationType?: string;
  watermark?: string;
}

export interface KieSeedanceInput {
  prompt: string;
  imageUrls?: string[];
  videoUrls?: string[];
  audioUrls?: string[];
  aspectRatio?: string;
  durationSec?: number;
  resolution?: string;
  generateAudio?: boolean;
}
