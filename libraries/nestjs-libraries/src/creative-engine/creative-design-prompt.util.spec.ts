import { compileDesignPrompt, mergeDesignRecord } from './creative-design-prompt.util';

const baseSpec = {
  version: 2,
  platform: 'Instagram',
  aspectRatio: '4:5',
  sizeId: 'ig-portrait',
  style: {
    presetId: 'photo-clean',
    presetName: 'Foto limpa',
    visualStyle: 'realistic professional photography, true-to-life textures and materials',
    lighting: 'soft bright studio lighting with gentle, even shadows',
    mood: 'clean, minimal, spacious, premium',
    finish: 'crisp high-end commercial finish, sharp focus',
  },
  palette: {
    paletteId: 'cobalt-cream',
    name: 'Azul & creme',
    background: '#F4F1E9',
    surface: '#FFFFFF',
    text: '#0B1B3A',
    muted: '#5A6B8C',
    accent: '#1E40FF',
    accent2: '#0B1B3A',
    gradient: 'radial-gradient(circle at top left, #dfe5ff, #f4f1e9 62%)',
  },
  typography: { fontPairId: 'archivo-figtree', name: 'Moderna', headingFont: 'Archivo Black', bodyFont: 'Figtree', scale: 'balanced', alignment: 'left' },
  layout: { templateId: 'carousel-cover', density: 'balanced', safePadding: 'balanced' },
  background: { type: 'gradient', opacity: 1 },
  elements: [
    { id: 'logo', type: 'logo', visible: true },
    { id: 'product', type: 'product', visible: true },
    { id: 'icon', type: 'icon', visible: false },
  ],
  renderMode: 'hybrid',
};

describe('compileDesignPrompt', () => {
  it('injects the chosen style fragments into the art direction', () => {
    const compiled = compileDesignPrompt('A single product hero shot', baseSpec, { index: 0, headline: 'H', body: 'B', cta: 'C' });

    expect(compiled).toContain('Visual style: realistic professional photography, true-to-life textures and materials.');
    expect(compiled).toContain('Mood: clean, minimal, spacious, premium.');
    expect(compiled).toContain('Lighting: soft bright studio lighting with gentle, even shadows.');
    expect(compiled).toContain('crisp high-end commercial finish, sharp focus. ');
  });

  it('keeps the generic art direction when the spec has no style block', () => {
    const { style: _style, ...specWithoutStyle } = baseSpec;
    const compiled = compileDesignPrompt('prompt', specWithoutStyle, { index: 1 });

    expect(compiled).not.toContain('Visual style:');
    expect(compiled).not.toContain('Mood:');
    expect(compiled).not.toContain('Lighting:');
    expect(compiled).toContain('Depth and lighting: give the scene real depth');
    expect(compiled).toContain('Finish: Match the "Azul & creme" palette mood');
  });

  it('applies the slide override by slide id and by index 0', () => {
    const spec = {
      ...baseSpec,
      slideOverrides: {
        'slide-1': { style: { ...baseSpec.style, mood: 'energetic, vibrant, punchy' } },
        '0': { style: { ...baseSpec.style, mood: 'sophisticated, elegant, high-end' } },
      },
    };

    const byId = compileDesignPrompt('p', spec, { id: 'slide-1' });
    expect(byId).toContain('Mood: energetic, vibrant, punchy.');

    const byZeroIndex = compileDesignPrompt('p', spec, { index: 0 });
    expect(byZeroIndex).toContain('Mood: sophisticated, elegant, high-end.');
  });

  it('preserves the approved copy verbatim and pins the wordmark colour', () => {
    const compiled = compileDesignPrompt('p', baseSpec, { index: 2, headline: 'Título exato', body: 'Corpo exato', cta: 'CTA exato' });

    expect(compiled).toContain('Approved copy for this slide, preserve verbatim, do not add or drop words: Título exato | Corpo exato | CTA exato');
    expect(compiled).toContain('The wordmark colour is exactly #0B1B3A on every slide.');
  });
});

describe('mergeDesignRecord', () => {
  it('deep-merges the design sub-objects', () => {
    const merged = mergeDesignRecord(
      { palette: { background: '#FFF', text: '#000' }, layout: { density: 'balanced' } },
      { palette: { text: '#111' } },
    ) as Record<string, any>;

    expect(merged.palette).toEqual({ background: '#FFF', text: '#111' });
    expect(merged.layout).toEqual({ density: 'balanced' });
  });
});
