// Concrete default design spec for headless carousel generation.
//
// The Studio's design editor (carousel-design-editor.component.tsx) builds a
// full designSpec — palette, style, typography, layout, background — and the
// backend injects it identically into every slide (see compileDesignPrompt).
// That shared spec is what makes an in-platform carousel read as one cohesive
// set instead of nine unrelated images.
//
// Headless callers (the /mcp-studio MCP agent) have no design editor and pass
// no designSpec, so every slide used to fall back to just its own free-text
// imagePrompt plus the brand-identity block: brand and colours stayed roughly
// consistent, but layout, typography, art direction and background treatment
// drifted slide to slide — visibly worse than the platform (confirmed against
// production: MCP carousels stored NO [APPROVED DESIGN SPEC] block, platform
// ones always did). This rebuilds the same shape the editor's
// `createDefaultDesign` produces (its 'photo-clean' / 'cobalt-cream' default),
// seeded with the brand's real DNA colours when available, so a headless
// carousel gets the identical full-spec treatment.
//
// Values are duplicated from the frontend editor on purpose, not imported: the
// editor is a client component and must never be pulled into the backend
// bundle. This is a single, deliberately-chosen professional default — not the
// whole palette/preset catalogue.

const DEFAULT_PALETTE = {
  paletteId: 'cobalt-cream',
  name: 'Azul & creme',
  background: '#F4F1E9',
  surface: '#FFFFFF',
  text: '#0B1B3A',
  muted: '#5A6B8C',
  accent: '#1E40FF',
  accent2: '#0B1B3A',
  gradient: 'radial-gradient(circle at top left, #dfe5ff, #f4f1e9 62%)',
};

export function buildDefaultCarouselDesignSpec(opts: {
  aspectRatio?: string;
  brandColors?: string[];
}): Record<string, unknown> {
  const aspectRatio = opts.aspectRatio || '4:5';
  const colors = (opts.brandColors || [])
    .map((c) => String(c).trim())
    .filter(Boolean);
  // Seed the two accent slots from the brand's real colours when present, so
  // the spec's palette agrees with the brand-identity block instead of pulling
  // the generic cobalt accent against it. Background/text stay on the neutral
  // default (a light, legible ground) — exactly what the platform default does
  // before a human customises it.
  const palette = {
    ...DEFAULT_PALETTE,
    ...(colors[0] ? { accent: colors[0] } : {}),
    ...(colors[1] ? { accent2: colors[1] } : {}),
  };
  return {
    version: 2,
    platform: 'Instagram',
    aspectRatio,
    sizeId: aspectRatio === '1:1' ? 'ig-square' : 'ig-portrait',
    style: {
      presetId: 'photo-clean',
      presetName: 'Foto limpa',
      visualStyle:
        'realistic professional photography, true-to-life textures and materials',
      lighting: 'soft bright studio lighting with gentle, even shadows',
      mood: 'clean, minimal, spacious, premium',
      finish: 'crisp high-end commercial finish, sharp focus',
    },
    palette,
    typography: { alignment: 'left' },
    layout: { templateId: 'carousel-cover', density: 'balanced', safePadding: 'balanced' },
    background: { type: 'gradient', value: palette.gradient, opacity: 1 },
    renderMode: 'hybrid',
    // Marks a synthesised default apart from a user-approved spec in stored job
    // payloads (useful when debugging "why does this carousel look generic").
    // compileDesignPrompt only reads known keys, so this extra field is inert
    // at render time.
    source: 'headless-default',
  };
}
