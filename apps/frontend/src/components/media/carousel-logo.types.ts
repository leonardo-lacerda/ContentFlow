export type CarouselLogoPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'custom';

export type CarouselLogoConfig = {
  mediaId: string;
  url: string;
  position: CarouselLogoPosition;
  // Fractions of the base image's width/height (0-1); the logo's CENTER
  // point. Only meaningful when position === 'custom'.
  x?: number;
  y?: number;
  // Logo width as a percentage of the base image's width (1-100). Height
  // follows the logo's own aspect ratio - never stretched.
  widthPct: number;
  // 0-1.
  opacity: number;
};

export const LOGO_WIDTH_PCT_MIN = 4;
export const LOGO_WIDTH_PCT_MAX = 60;
export const LOGO_WIDTH_PCT_DEFAULT = 18;
export const LOGO_MARGIN_PCT = 4;
