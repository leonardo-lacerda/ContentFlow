import { buildDefaultCarouselDesignSpec, buildSlideStyleOverride } from './carousel-default-design-spec';
import { compileDesignPrompt, mergeDesignRecord } from './creative-design-prompt.util';

describe('buildDefaultCarouselDesignSpec', () => {
  it('produces a spec that compileDesignPrompt renders as a full APPROVED DESIGN SPEC block', () => {
    // This is the whole point of the fix: a headless carousel with no
    // user-approved designSpec must still get the same cohesive spec block the
    // platform injects, not fall through to a bare imagePrompt.
    const spec = buildDefaultCarouselDesignSpec({ aspectRatio: '4:5' });
    const prompt = compileDesignPrompt('a product on a table', spec);
    expect(prompt).toContain('[APPROVED DESIGN SPEC — FOLLOW EXACTLY]');
    expect(prompt).toContain('[ART DIRECTION]');
    expect(prompt).toContain('[TYPOGRAPHY DIRECTION]');
    expect(prompt).toContain('carousel-cover');
  });

  it('defaults to the photo-clean preset and its cobalt-cream palette', () => {
    const spec = buildDefaultCarouselDesignSpec({ aspectRatio: '4:5' });
    const style = spec.style as Record<string, unknown>;
    const palette = spec.palette as Record<string, unknown>;
    expect(style.presetId).toBe('photo-clean');
    expect(palette.paletteId).toBe('cobalt-cream');
    expect(palette.accent).toBe('#1E40FF');
  });

  it('seeds the accent colours from the brand DNA colours when present', () => {
    const spec = buildDefaultCarouselDesignSpec({
      aspectRatio: '4:5',
      brandColors: ['#FF0000', '#00FF00'],
    });
    const palette = spec.palette as Record<string, unknown>;
    expect(palette.accent).toBe('#FF0000');
    expect(palette.accent2).toBe('#00FF00');
    // Background/text stay on the neutral default — the brand-identity block is
    // what pushes brand colours as dominant; the spec palette must stay legible.
    expect(palette.background).toBe('#F4F1E9');
    expect(palette.text).toBe('#0B1B3A');
  });

  it('ignores blank/whitespace brand colours', () => {
    const spec = buildDefaultCarouselDesignSpec({
      aspectRatio: '4:5',
      brandColors: ['   ', '', '#123456'],
    });
    const palette = spec.palette as Record<string, unknown>;
    // First non-blank colour becomes the primary accent.
    expect(palette.accent).toBe('#123456');
    expect(palette.accent2).toBe('#0B1B3A');
  });

  it('maps aspect ratio to the matching Instagram size id', () => {
    expect(buildDefaultCarouselDesignSpec({ aspectRatio: '1:1' }).sizeId).toBe('ig-square');
    expect(buildDefaultCarouselDesignSpec({ aspectRatio: '4:5' }).sizeId).toBe('ig-portrait');
    // Default when unspecified is portrait, matching the editor's default.
    expect(buildDefaultCarouselDesignSpec({}).sizeId).toBe('ig-portrait');
  });

  describe('explicit stylePresetId / paletteId (MCP agent passthrough)', () => {
    it('resolves the requested preset into the style block and its matching palette', () => {
      const spec = buildDefaultCarouselDesignSpec({ stylePresetId: 'dark-premium' });
      const style = spec.style as Record<string, unknown>;
      const palette = spec.palette as Record<string, unknown>;
      expect(style.presetId).toBe('dark-premium');
      expect(style.mood).toContain('sophisticated');
      expect(palette.paletteId).toBe('midnight-neon');
      const layout = spec.layout as Record<string, unknown>;
      expect(layout.density).toBe('balanced');
    });

    it('falls back to the default preset for an unknown stylePresetId', () => {
      const spec = buildDefaultCarouselDesignSpec({ stylePresetId: 'not-a-real-preset' });
      const style = spec.style as Record<string, unknown>;
      expect(style.presetId).toBe('photo-clean');
    });

    it('lets an explicit paletteId override the preset default palette', () => {
      const spec = buildDefaultCarouselDesignSpec({
        stylePresetId: 'dark-premium',
        paletteId: 'mint-fresh',
      });
      const style = spec.style as Record<string, unknown>;
      const palette = spec.palette as Record<string, unknown>;
      // Style still comes from the requested preset...
      expect(style.presetId).toBe('dark-premium');
      // ...but the palette is the explicitly requested one, not dark-premium's own midnight-neon.
      expect(palette.paletteId).toBe('mint-fresh');
    });

    it('an explicit paletteId wins over brand DNA colours', () => {
      const spec = buildDefaultCarouselDesignSpec({
        paletteId: 'mono-ink',
        brandColors: ['#FF0000', '#00FF00'],
      });
      const palette = spec.palette as Record<string, unknown>;
      // The user's explicit palette choice must not be overwritten by inferred
      // brand colours — brand-colour seeding is an inference for when the
      // caller expressed no preference at all.
      expect(palette.paletteId).toBe('mono-ink');
      expect(palette.accent).toBe('#141414');
      expect(palette.accent2).toBe('#8A8A85');
    });

    it('lets explicit density/alignment override the preset default and the left default', () => {
      const spec = buildDefaultCarouselDesignSpec({
        stylePresetId: 'photo-clean', // preset density is 'airy'
        density: 'dense',
        alignment: 'center',
      });
      const layout = spec.layout as Record<string, unknown>;
      const typography = spec.typography as Record<string, unknown>;
      expect(layout.density).toBe('dense');
      expect(typography.alignment).toBe('center');
    });

    it('falls back to the preset density and left alignment when not overridden', () => {
      const spec = buildDefaultCarouselDesignSpec({ stylePresetId: 'photo-clean' });
      const layout = spec.layout as Record<string, unknown>;
      const typography = spec.typography as Record<string, unknown>;
      expect(layout.density).toBe('airy');
      expect(typography.alignment).toBe('left');
    });
  });
});

describe('buildSlideStyleOverride', () => {
  it('returns an empty object when nothing is overridden (no-op merge)', () => {
    expect(buildSlideStyleOverride({})).toEqual({});
  });

  it('resolves stylePresetId to a complete style block, not a partial one', () => {
    const override = buildSlideStyleOverride({ stylePresetId: 'dark-premium' });
    expect(override.style).toEqual({
      presetId: 'dark-premium',
      presetName: 'Premium escuro',
      visualStyle: 'cinematic realistic product photography, rich reflective materials',
      lighting: expect.any(String),
      mood: expect.any(String),
      finish: expect.any(String),
    });
    // Only style was requested — no other fields should appear.
    expect(Object.keys(override)).toEqual(['style']);
  });

  it('resolves paletteId to the full palette object', () => {
    const override = buildSlideStyleOverride({ paletteId: 'mono-ink' });
    expect((override.palette as Record<string, unknown>).paletteId).toBe('mono-ink');
    expect(Object.keys(override)).toEqual(['palette']);
  });

  it('sets only density/alignment when that is all that was requested', () => {
    const override = buildSlideStyleOverride({ density: 'dense', alignment: 'center' });
    expect(override.layout).toEqual({ density: 'dense' });
    expect(override.typography).toEqual({ alignment: 'center' });
    expect(override.style).toBeUndefined();
    expect(override.palette).toBeUndefined();
  });

  it('merges on top of a base spec the same way compileDesignPrompt does, preserving unrelated base fields', () => {
    const base = buildDefaultCarouselDesignSpec({ stylePresetId: 'photo-clean' });
    const override = buildSlideStyleOverride({ paletteId: 'sunset-pop' });
    const merged = mergeDesignRecord(base, override);
    // The override's palette wins for this slide...
    expect((merged.palette as Record<string, unknown>).paletteId).toBe('sunset-pop');
    // ...but the base style (photo-clean) is untouched, since only palette was overridden.
    expect((merged.style as Record<string, unknown>).presetId).toBe('photo-clean');
  });
});
