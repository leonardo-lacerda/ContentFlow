export interface VideoTextOverlay {
  text: string;
  position: 'top' | 'center' | 'bottom';
  style: 'bold' | 'subtitle' | 'caption' | 'hook';
  durationSec: number;
  animation: 'fade-in' | 'slide-up' | 'typewriter' | 'pop';
}

export interface VideoScene {
  index: number;
  durationSec: number;
  headline: string;
  body?: string | null;
  voiceoverText?: string | null;
  imagePrompt?: string | null;
  imageUrl?: string | null;
  transition: string;
  textOverlays: VideoTextOverlay[];
  motionNotes?: string | null;
  musicCue?: string | null;
}

export interface VideoScriptData {
  title: string;
  platform: string;
  format: string;
  aspectRatio: string;
  language: string;
  totalDurationSec: number;
  scenes: VideoScene[];
  scriptNotes?: string | null;
  musicStyle?: string | null;
  cta?: string | null;
  hashtags?: string[] | null;
  caption?: string | null;
  narration?: string | null;
}

export type VideoFormat = 'REELS' | 'TIKTOK' | 'SHORTS' | 'STORIES' | 'CUSTOM';
export type VideoStatus = 'DRAFT' | 'SCRIPT_GENERATED' | 'RENDERING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface VideoProject {
  id: string;
  organizationId: string;
  brandProfileId?: string | null;
  carouselProjectId?: string | null;
  contentIdeaId?: string | null;
  name: string;
  format: VideoFormat;
  status: VideoStatus;
  aspectRatio: string;
  maxDurationSec: number;
  script: VideoScriptData | null;
  totalDurationSec?: number | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  renderProvider?: string | null;
  renderJobId?: string | null;
  scriptCostEstimate?: number | null;
  renderCostEstimate?: number | null;
  totalCostEstimate?: number | null;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  carouselProject?: { id: string; title: string } | null;
  brandProfile?: { id: string; name: string } | null;
}

export const VIDEO_FORMAT_OPTIONS = [
  { id: 'REELS' as const, name: 'Instagram Reels', maxDuration: 90, aspectRatio: '9:16' },
  { id: 'TIKTOK' as const, name: 'TikTok', maxDuration: 180, aspectRatio: '9:16' },
  { id: 'SHORTS' as const, name: 'YouTube Shorts', maxDuration: 60, aspectRatio: '9:16' },
  { id: 'STORIES' as const, name: 'Instagram Stories', maxDuration: 15, aspectRatio: '9:16' },
  { id: 'CUSTOM' as const, name: 'Custom', maxDuration: 180, aspectRatio: '9:16' },
];

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  DRAFT: 'Rascunho',
  SCRIPT_GENERATED: 'Roteiro pronto',
  RENDERING: 'Renderizando',
  COMPLETED: 'Concluído',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
};

export const VIDEO_STATUS_COLORS: Record<VideoStatus, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400',
  SCRIPT_GENERATED: 'bg-green-500/20 text-green-400',
  RENDERING: 'bg-amber-500/20 text-amber-400',
  COMPLETED: 'bg-blue-500/20 text-blue-400',
  FAILED: 'bg-red-500/20 text-red-400',
  CANCELLED: 'bg-gray-500/20 text-gray-500',
};
