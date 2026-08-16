export function mergeDesignRecord(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  return {
    ...base,
    ...override,
    palette: { ...(base.palette as Record<string, unknown> | undefined), ...(override.palette as Record<string, unknown> | undefined) },
    typography: { ...(base.typography as Record<string, unknown> | undefined), ...(override.typography as Record<string, unknown> | undefined) },
    layout: { ...(base.layout as Record<string, unknown> | undefined), ...(override.layout as Record<string, unknown> | undefined) },
    background: { ...(base.background as Record<string, unknown> | undefined), ...(override.background as Record<string, unknown> | undefined) },
  } as Record<string, unknown>;
}

// A logo must never be an invented graphic mark, AND — because each carousel
// slide is a separate, independent generation that can't see the others — the
// wordmark drifts between slides (different colour, weight, size, position)
// unless every slide is handed the exact same, fully-specified treatment.
// Every image carries this rule so the brand renders as one identical text
// wordmark across the whole set, never an emblem/icon and never restyled.
const LOGO_RULE_BASE =
  'Logo rule: if any brand logo appears, render it ONLY as the brand name in clean typography (a plain text wordmark). Never invent or draw an icon, symbol, emblem, monogram, badge, mascot or any graphic mark — text only. The wordmark MUST be identical on every slide of the carousel: same fixed position (top-left corner), same single solid colour, same font family and weight, and the same relative size. Never restyle, recolour, resize or reposition it from one slide to another.';

// When the approved palette gives us a concrete text colour, pin the wordmark
// to that exact value so independent per-slide generations can't each pick
// their own colour (the root cause of the "logo looks different every slide"
// report).
const logoRule = (wordmarkColor?: string) =>
  wordmarkColor
    ? `${LOGO_RULE_BASE} The wordmark colour is exactly ${wordmarkColor} on every slide.`
    : LOGO_RULE_BASE;

// A baseline production-quality bar, applied to every generated image
// regardless of whether a design spec or brand identity is present. Cheap to
// state, and it is the difference between an image that reads as "an AI made
// this" and one that reads as a real studio asset: sharp focus, no compression
// artefacts, no mangled/duplicated text, no stray watermark or UI chrome.
const QUALITY_BAR =
  'Quality bar: professional advertising/editorial photography or illustration finish. Sharp focus on the main subject, clean edges, no compression artefacts, no warped anatomy or objects, no garbled or duplicated text, no stray watermark, no visible UI chrome (no browser bars, no platform icons, no placeholder Latin text). The result must look like a finished asset a paid designer delivered, not a rough draft.';

// Injected identically into every slide of a carousel. Because each slide image
// is generated in its own independent request, the model rendering slide N
// cannot see slides 1..N-1 — the only way to keep the carousel coherent is to
// hand every slide the exact same concrete brand identity, plus this rule.
const CAROUSEL_CONSISTENCY_RULE =
  'This image is one slide of a single, cohesive branded carousel. Keep the exact same brand name, the same product/subject and the same visual world as every other slide. Never introduce a different company, a different product, a different logo or an unrelated subject.';

export function compileDesignPrompt(
  prompt: string,
  designSpec?: Record<string, unknown>,
  slide?: { id?: string; index?: number; headline?: string; body?: string; cta?: string },
  brand?: string,
) {
  const brandBlock = brand?.trim() || '';
  const lines: string[] = [prompt, ''];
  let wordmarkColor = '';

  if (brandBlock) {
    lines.push('[BRAND IDENTITY — IDENTICAL ON EVERY SLIDE OF THIS CAROUSEL]', brandBlock, '');
  }

  if (designSpec) {
    const overrides = (designSpec.slideOverrides as Record<string, unknown> | undefined) || {};
    const key = slide?.id || String(slide?.index ?? '');
    const override = key && overrides[key] && typeof overrides[key] === 'object'
      ? overrides[key] as Record<string, unknown>
      : undefined;
    const resolved = override ? mergeDesignRecord(designSpec, override) : designSpec;
    const palette = (resolved.palette || {}) as Record<string, unknown>;
    // Pin the brand wordmark to the palette's primary text colour so it stays
    // identical across independently-generated slides.
    wordmarkColor = String(palette.text || palette.accent || '').trim();
    // The style block is chosen in the Studio's design editor (preset or
    // fine-tuned) and stored as concrete English prompt fragments — it is the
    // user's loudest lever on the image, so it goes in verbatim. Every field
    // is optional to stay compatible with specs saved before the block
    // existed (and with slideOverrides that don't touch it).
    const style = (resolved.style || {}) as Record<string, unknown>;
    const visualStyle = String(style.visualStyle || '').trim();
    const lighting = String(style.lighting || '').trim();
    const mood = String(style.mood || '').trim();
    const finish = String(style.finish || '').trim();
    const typography = (resolved.typography || {}) as Record<string, unknown>;
    const layout = (resolved.layout || {}) as Record<string, unknown>;
    const background = (resolved.background || {}) as Record<string, unknown>;
    const elements = Array.isArray(resolved.elements)
      ? resolved.elements
          .map((item) => item && typeof item === 'object' ? item as Record<string, unknown> : null)
          .filter((item) => item?.visible !== false)
          .map((item) => String(item?.type || item?.id))
          .join(', ')
      : 'none';
    const approvedCopy = [slide?.headline, slide?.body, slide?.cta].filter(Boolean).join(' | ');
    const density = String(layout.density || 'balanced');
    const safePadding = String(layout.safePadding || 'balanced');
    const alignment = String(typography.alignment || 'left');

    lines.push(
      '[APPROVED DESIGN SPEC — FOLLOW EXACTLY]',
      `Platform: ${String(resolved.platform || 'social media')}; aspect ratio: ${String(resolved.aspectRatio || '4:5')}; size: ${String(resolved.sizeId || 'default')}.`,
      `Palette: ${String(palette.name || palette.paletteId || 'custom')}; background ${String(palette.background || '')}; surface ${String(palette.surface || '')}; text ${String(palette.text || '')}; secondary text ${String(palette.muted || '')}; accent ${String(palette.accent || '')}; secondary accent ${String(palette.accent2 || '')}.`,
      `Layout: ${String(layout.templateId || 'carousel-cover')}; density ${density}; safe padding ${safePadding}.`,
      `Background: ${String(background.type || 'gradient')}${background.value ? ` (${String(background.value)})` : ''}; overlay ${String(background.overlay || 'none')}; opacity ${String(background.opacity ?? 1)}; render mode ${String(resolved.renderMode || 'hybrid')}.`,
      `Visible elements: ${elements}. Do not add visible elements that are not listed.`,
      '',
      '[ART DIRECTION]',
      'Compose the shot with a clear focal subject and deliberate negative space — never fill the frame edge to edge with dense detail. Use the negative space implied by the layout above as the reserved area for the headline/body/CTA text so nothing competes with it.',
      visualStyle ? `Visual style: ${visualStyle}.` : '',
      mood ? `Mood: ${mood}.` : '',
      `Depth and lighting: give the scene real depth (foreground/midground/background separation) and a single, consistent light direction and colour temperature — avoid flat, evenly-lit stock-photo lighting.${lighting ? ` Lighting: ${lighting}.` : ''}`,
      `Finish: ${finish ? `${finish}. ` : ''}Match the "${String(palette.name || palette.paletteId || 'brand')}" palette mood consistently — do not drift into unrelated hues outside this palette's family.`,
      '',
      '[TYPOGRAPHY DIRECTION]',
      `Rendered text (headline/body/CTA) uses one consistent typeface family per role, ${alignment}-aligned, with a clear size hierarchy: headline largest and boldest, body smaller and lighter, CTA set apart as a distinct button-like element. Keep a generous, even margin ("${safePadding}" safe padding) around all text — never let text touch the frame edge or overlap the subject.`,
      `Content density: ${density} — do not cram in more visual elements or text than the approved copy below requires.`,
      approvedCopy ? `Approved copy for this slide, preserve verbatim, do not add or drop words: ${approvedCopy}` : '',
      'Keep all visual choices consistent with this specification. Do not replace the palette, fonts, layout or visible elements with defaults.',
    );
  }

  lines.push(QUALITY_BAR, logoRule(wordmarkColor));
  if (brandBlock) lines.push(CAROUSEL_CONSISTENCY_RULE);

  return lines.filter(Boolean).join('\n');
}
