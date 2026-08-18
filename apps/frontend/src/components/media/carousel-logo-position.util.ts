import {
  CarouselLogoPosition,
  LOGO_MARGIN_PCT,
  LOGO_WIDTH_PCT_MAX,
  LOGO_WIDTH_PCT_MIN,
} from './carousel-logo.types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type LogoCssBox = {
  widthPct: number; // CSS width, as a % of the container
  leftPct: number; // CSS left, as a % of the container (top-left anchored)
  topPct: number; // CSS top, as a % of the container
};

/**
 * Client-side mirror of the backend compositor's resolvePosition (see
 * carousel-image-compositor.service.ts) — same preset semantics and the same
 * custom-position "x/y is the logo's centre, as a fraction of the canvas"
 * contract, translated to CSS percentages instead of pixels, so the live
 * preview the user drags around matches what the server actually bakes into
 * the downloaded file. widthPct is clamped the same way the backend clamps
 * it, so the preview never shows a size the server would refuse to honour.
 *
 * `logoAspect` (logo height / logo width) is needed because CSS `top`
 * placement for a corner/edge preset depends on the logo's rendered height,
 * which depends on its own aspect ratio once width is fixed by widthPct -
 * unlike the backend, which reads real pixel dimensions from the file, the
 * browser needs this passed in (from the uploaded image's naturalWidth/
 * naturalHeight) since nothing has decoded the image server-side yet at
 * preview time.
 */
export function resolveLogoCssBox(
  position: CarouselLogoPosition,
  widthPct: number,
  logoAspect: number,
  x?: number,
  y?: number
): LogoCssBox {
  const clampedWidthPct = clamp(widthPct || LOGO_WIDTH_PCT_MIN, LOGO_WIDTH_PCT_MIN, LOGO_WIDTH_PCT_MAX);
  const heightPct = clampedWidthPct * logoAspect;
  const margin = LOGO_MARGIN_PCT;

  const clampBox = (left: number, top: number): LogoCssBox => ({
    widthPct: clampedWidthPct,
    leftPct: clamp(left, 0, Math.max(0, 100 - clampedWidthPct)),
    topPct: clamp(top, 0, Math.max(0, 100 - heightPct)),
  });

  switch (position) {
    case 'top-left':
      return clampBox(margin, margin);
    case 'top-right':
      return clampBox(100 - clampedWidthPct - margin, margin);
    case 'bottom-left':
      return clampBox(margin, 100 - heightPct - margin);
    case 'bottom-right':
      return clampBox(100 - clampedWidthPct - margin, 100 - heightPct - margin);
    case 'center':
      return clampBox((100 - clampedWidthPct) / 2, (100 - heightPct) / 2);
    case 'custom':
    default: {
      const cx = (x ?? 0.5) * 100;
      const cy = (y ?? 0.5) * 100;
      return clampBox(cx - clampedWidthPct / 2, cy - heightPct / 2);
    }
  }
}

/**
 * Converts a pointer position within the preview container (both in the same
 * pixel space, e.g. from a drag event's clientX/Y minus the container's
 * bounding rect) into the 0-1 x/y fractions the 'custom' position stores.
 */
export function pointerToLogoFraction(
  pointerX: number,
  pointerY: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  if (!containerWidth || !containerHeight) return { x: 0.5, y: 0.5 };
  return {
    x: clamp(pointerX / containerWidth, 0, 1),
    y: clamp(pointerY / containerHeight, 0, 1),
  };
}
