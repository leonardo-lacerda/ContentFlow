import { buildDefaultCarouselDesignSpec } from './carousel-default-design-spec';
import { compileDesignPrompt } from './creative-design-prompt.util';

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

  it('falls back to the default accents when no brand colours are given', () => {
    const spec = buildDefaultCarouselDesignSpec({ aspectRatio: '4:5' });
    const palette = spec.palette as Record<string, unknown>;
    expect(palette.accent).toBe('#1E40FF');
    expect(palette.accent2).toBe('#0B1B3A');
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
});
