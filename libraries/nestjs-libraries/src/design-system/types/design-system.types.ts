export type DesignSlideRole =
  | 'cover'
  | 'content'
  | 'recap'
  | 'cta'
  | 'hook'
  | 'proof';

export type DesignPalette = {
  id: string;
  name: string;
  tags?: string[];
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accent2?: string;
  gradient: string;
};

export type DesignFontPairing = {
  id: string;
  name: string;
  tags?: string[];
  display: string;
  body: string;
  link: string;
};

export type DesignDirection = {
  id: string;
  name: string;
  tags?: string[];
  vibe: string;
  type?: string;
  bg?: string;
  example_palettes?: string[];
  example_fonts?: string[];
  motifs?: string[];
  layout?: string;
  avoid?: string;
};

export type DesignTemplateMeta = {
  id: string;
  file: string;
  name: string;
  use?: string;
  best_formats?: string[];
  tags?: string[];
};

export type DesignSize = {
  id: string;
  label: string;
  platform: string;
  width: number;
  height: number;
  tags?: string[];
};

export type DesignRecipe = {
  directionId: string;
  directionName: string;
  paletteId: string;
  fontId: string;
  motifs: string[];
  sizeId: string;
  width: number;
  height: number;
  handle: string;
  vibe?: string;
  avoid?: string;
  seed?: number;
};

export type DesignSlideInput = {
  slideIndex: number;
  role?: DesignSlideRole;
  templateId?: string;
  headline?: string;
  body?: string;
  cta?: string;
  eyebrow?: string;
  subhead?: string;
  bigword?: string;
  index?: string;
  handle?: string;
};

export type DesignTokens = Record<string, string>;

export type DesignSlideResult = {
  slideIndex: number;
  status: 'queued' | 'running' | 'completed' | 'failed';
  templateId?: string;
  role?: DesignSlideRole;
  result?: {
    images: Array<{
      url?: string;
      b64_json?: string;
      mediaId?: string;
      revised_prompt?: string;
    }>;
  };
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

export type DesignJobProgress = {
  total: number;
  completed: number;
  failed: number;
  currentSlide?: number;
  recipe?: DesignRecipe;
  slides: DesignSlideResult[];
};

export type IdeateRequest = {
  query?: string;
  count?: number;
  seed?: number;
  directionId?: string;
  sizeId?: string;
  handle?: string;
  brandColors?: string[];
};

export type IdeateOption = DesignRecipe & {
  score?: number;
  designRead: string;
};
