import {
  paletteById,
  presetById,
  styleFromPreset,
} from './carousel-design-catalogue';

// Concrete default design spec for headless carousel generation.
//
// The Studio's design editor (carousel-design-editor.component.tsx) builds a
// full designSpec — palette, style, typography, layout, background — and the
// backend injects it identically into every slide (see compileDesignPrompt).
// That shared spec is what makes an in-platform carousel read as one cohesive
// set instead of nine unrelated images.
//
// Headless callers (the /mcp-studio MCP agent) have no design editor. Without
// an explicit designSpec, every slide used to fall back to just its own
// free-text imagePrompt plus the brand-identity block: brand and colours
// stayed roughly consistent, but layout, typography, art direction and
// background treatment drifted slide to slide — visibly worse than the
// platform (confirmed against production: MCP carousels stored NO [APPROVED
// DESIGN SPEC] block, platform ones always did). This rebuilds the same
// shape the editor's `createDefaultDesign` produces, so a headless carousel
// gets the identical full-spec treatment — either the editor's default
// ('photo-clean' / 'cobalt-cream'), or an explicit stylePresetId/paletteId
// the MCP agent passed in on the user's behalf (see creativeGenerationTool's
// generate-carousel operation), seeded with the brand's real DNA colours
// when no explicit palette was requested.
const DEFAULT_PRESET_ID = 'photo-clean';

export function buildDefaultCarouselDesignSpec(opts: {
  aspectRatio?: string;
  brandColors?: string[];
  stylePresetId?: string;
  paletteId?: string;
  density?: 'airy' | 'balanced' | 'dense';
  alignment?: 'left' | 'center' | 'right';
}): Record<string, unknown> {
  const aspectRatio = opts.aspectRatio || '4:5';
  const preset = presetById(opts.stylePresetId || DEFAULT_PRESET_ID);

  // An explicit paletteId is the user's own choice (relayed by the MCP
  // agent) and always wins over both the preset's matching palette and any
  // brand-colour inference below. Otherwise fall back to whichever palette
  // the chosen (or default) style preset pairs with.
  const explicitPalette = Boolean(opts.paletteId);
  let palette = paletteById(opts.paletteId || preset.paletteId);

  if (!explicitPalette) {
    // Seed the two accent slots from the brand's real colours when present,
    // so the spec's palette agrees with the brand-identity block instead of
    // pulling the preset's generic accent against it. Background/text stay
    // on the preset's neutral default (a light, legible ground) — exactly
    // what the platform default does before a human customises it.
    const colors = (opts.brandColors || [])
      .map((c) => String(c).trim())
      .filter(Boolean);
    if (colors.length) {
      palette = {
        ...palette,
        ...(colors[0] ? { accent: colors[0] } : {}),
        ...(colors[1] ? { accent2: colors[1] } : {}),
      };
    }
  }

  return {
    version: 2,
    platform: 'Instagram',
    aspectRatio,
    sizeId: aspectRatio === '1:1' ? 'ig-square' : 'ig-portrait',
    style: styleFromPreset(preset),
    palette,
    typography: { alignment: opts.alignment || 'left' },
    layout: { templateId: 'carousel-cover', density: opts.density || preset.density, safePadding: 'balanced' },
    background: { type: 'gradient', value: palette.gradient, opacity: 1 },
    renderMode: 'hybrid',
    // Marks a synthesised default apart from a user-approved spec in stored job
    // payloads (useful when debugging "why does this carousel look generic").
    // compileDesignPrompt only reads known keys, so this extra field is inert
    // at render time.
    source: 'headless-default',
  };
}
