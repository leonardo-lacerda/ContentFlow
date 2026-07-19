import { z } from 'zod';

export const VERSION = '2.0.0';

// ---- Sub-schemas ----

const TransitionSchema = z.enum([
  'cut',
  'crossfade',
  'slide-left',
  'slide-right',
  'zoom-in',
  'zoom-out',
]).describe('Transition type between scenes');

const TextOverlaySchema = z.object({
  text: z.string().describe('Text to display on screen'),
  position: z.enum(['top', 'center', 'bottom']).default('center').describe('Text position on screen'),
  style: z.enum(['bold', 'subtitle', 'caption', 'hook']).default('subtitle').describe('Visual style of text'),
  durationSec: z.number().min(0.5).describe('How long the text is visible'),
  animation: z.enum(['fade-in', 'slide-up', 'typewriter', 'pop']).default('fade-in').describe('Text animation style'),
});

const VideoSceneSchema = z.object({
  index: z.number().int().min(0).describe('Zero-based scene index'),
  durationSec: z.number().min(1).max(60).describe('Scene duration in seconds'),
  headline: z.string().describe('Main text/headline for this scene'),
  body: z.string().nullable().optional().describe('Body text or subtitle'),
  voiceoverText: z.string().nullable().optional().describe('Narration/voiceover text for this scene'),
  imagePrompt: z.string().nullable().optional().describe('AI image generation prompt (if no carousel image)'),
  imageUrl: z.string().nullable().optional().describe('Existing carousel image URL to use'),
  transition: TransitionSchema.default('crossfade').describe('Transition to next scene'),
  textOverlays: z.array(TextOverlaySchema).default([]).describe('Text overlays for this scene'),
  motionNotes: z.string().nullable().optional().describe('Visual motion direction (e.g. "slow zoom into center")'),
  musicCue: z.string().nullable().optional().describe('Music/sound cue for this scene'),
});

export const VideoScriptSchema = z.object({
  title: z.string().describe('Video title'),
  platform: z.string().describe('Target platform (Reels, TikTok, Shorts)'),
  format: z.string().describe('Video format (REELS, TIKTOK, SHORTS, STORIES)'),
  aspectRatio: z.string().default('9:16').describe('Aspect ratio'),
  language: z.string().describe('Language code (e.g. pt-BR, en-US)'),
  totalDurationSec: z.number().min(5).max(180).describe('Total video duration in seconds'),
  scenes: z.array(VideoSceneSchema).min(1).max(30).describe('Scenes in order'),
  scriptNotes: z.string().nullable().optional().describe('Overall direction/notes for the video'),
  musicStyle: z.string().nullable().optional().describe('Suggested music style/mood'),
  cta: z.string().nullable().optional().describe('Call-to-action for the video'),
  hashtags: z.array(z.string()).nullable().optional().describe('Platform hashtags'),
  caption: z.string().nullable().optional().describe('Video caption/description'),
  narration: z.string().nullable().optional().describe('Full narration text for voiceover'),
});

export type VideoScene = z.infer<typeof VideoSceneSchema>;
export type VideoScript = z.infer<typeof VideoScriptSchema>;
export type TextOverlay = z.infer<typeof TextOverlaySchema>;

export const VIDEO_FORMATS = [
  { id: 'REELS', name: 'Instagram Reels', maxDuration: 90, aspectRatio: '9:16' },
  { id: 'TIKTOK', name: 'TikTok', maxDuration: 180, aspectRatio: '9:16' },
  { id: 'SHORTS', name: 'YouTube Shorts', maxDuration: 60, aspectRatio: '9:16' },
  { id: 'STORIES', name: 'Instagram Stories', maxDuration: 15, aspectRatio: '9:16' },
  { id: 'CUSTOM', name: 'Custom', maxDuration: 180, aspectRatio: '9:16' },
] as const;

export function validate(data: unknown) {
  const result = VideoScriptSchema.safeParse(data);
  if (result.success) return { success: true, data: result.data, errors: null };
  return { success: false, data: null, errors: result.error };
}

export function parse(data: unknown): VideoScript {
  return VideoScriptSchema.parse(data);
}
