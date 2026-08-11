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

export function compileDesignPrompt(
  prompt: string,
  designSpec?: Record<string, unknown>,
  slide?: { id?: string; index?: number; headline?: string; body?: string; cta?: string },
) {
  if (!designSpec) return prompt;
  const overrides = (designSpec.slideOverrides as Record<string, unknown> | undefined) || {};
  const key = slide?.id || String(slide?.index || '');
  const override = key && overrides[key] && typeof overrides[key] === 'object'
    ? overrides[key] as Record<string, unknown>
    : undefined;
  const resolved = override ? mergeDesignRecord(designSpec, override) : designSpec;
  const palette = (resolved.palette || {}) as Record<string, unknown>;
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
  return [
    prompt,
    '',
    '[APPROVED DESIGN SPEC — FOLLOW EXACTLY]',
    `Platform: ${String(resolved.platform || 'social media')}; aspect ratio: ${String(resolved.aspectRatio || '4:5')}; size: ${String(resolved.sizeId || 'default')}.`,
    `Palette: ${String(palette.name || palette.paletteId || 'custom')}; background ${String(palette.background || '')}; surface ${String(palette.surface || '')}; text ${String(palette.text || '')}; secondary text ${String(palette.muted || '')}; accent ${String(palette.accent || '')}; secondary accent ${String(palette.accent2 || '')}.`,
    `Typography: heading ${String(typography.headingFont || 'sans-serif')}; body ${String(typography.bodyFont || 'sans-serif')}; scale ${String(typography.scale || 'balanced')}; alignment ${String(typography.alignment || 'left')}.`,
    `Layout: ${String(layout.templateId || 'carousel-cover')}; density ${String(layout.density || 'balanced')}; safe padding ${String(layout.safePadding || 'balanced')}.`,
    `Background: ${String(background.type || 'gradient')}${background.value ? ` (${String(background.value)})` : ''}; overlay ${String(background.overlay || 'none')}; opacity ${String(background.opacity ?? 1)}; render mode ${String(resolved.renderMode || 'hybrid')}.`,
    `Visible elements: ${elements}. Do not add visible elements that are not listed.`,
    approvedCopy ? `Approved copy for this slide, preserve verbatim: ${approvedCopy}` : '',
    'Keep all visual choices consistent with this specification. Do not replace the palette, fonts, layout or visible elements with defaults.',
  ].filter(Boolean).join('\n');
}
