import { describe, expect, it } from 'vitest';
import { createDefaultDesign, effectiveDesign, removeSlideOverride } from './carousel-design-editor.component';

// Regression test for the "Restaurar IA" bug: the reset button used to always
// replace the whole DesignSpec, wiping every slide's override regardless of
// which scope ("Somente este slide" vs "Todos os slides") was selected — so
// resetting one slide silently reset every other slide too.

describe('removeSlideOverride', () => {
  it('drops only the targeted slide\'s override, leaving other overrides untouched', () => {
    const base = createDefaultDesign('4:5');
    const design = {
      ...base,
      slideOverrides: {
        'slide-1': { style: { ...base.style, visualStyle: 'dark stock-photo finance chart' } },
        'slide-2': { style: { ...base.style, visualStyle: 'minimalist 3D render' } },
      },
    };

    const result = removeSlideOverride(design, 'slide-1');

    expect(result.slideOverrides).not.toHaveProperty('slide-1');
    expect(result.slideOverrides).toHaveProperty('slide-2');
    expect(result.slideOverrides!['slide-2']).toEqual(design.slideOverrides['slide-2']);
  });

  it('leaves the shared (non-override) design fields untouched', () => {
    const base = createDefaultDesign('4:5');
    const design = { ...base, slideOverrides: { 'slide-1': { style: base.style } } };
    const result = removeSlideOverride(design, 'slide-1');
    expect(result.palette).toEqual(base.palette);
    expect(result.layout).toEqual(base.layout);
  });

  it('is a no-op when the key has no override', () => {
    const design = { ...createDefaultDesign('4:5'), slideOverrides: { 'slide-2': {} } };
    const result = removeSlideOverride(design, 'slide-1');
    expect(result).toEqual(design);
  });

  it('is a no-op when there are no overrides at all', () => {
    const design = createDefaultDesign('4:5');
    expect(removeSlideOverride(design, 'slide-1')).toEqual(design);
  });

  it('makes effectiveDesign fall back to the shared design after the override is removed', () => {
    const base = createDefaultDesign('4:5');
    const design = {
      ...base,
      slideOverrides: {
        'slide-1': { style: { ...base.style, visualStyle: 'dark stock-photo finance chart' } },
      },
    };
    const slide = { id: 'slide-1' };

    expect(effectiveDesign(design, slide, 0).style.visualStyle).toBe('dark stock-photo finance chart');

    const reset = removeSlideOverride(design, 'slide-1');
    expect(effectiveDesign(reset, slide, 0).style.visualStyle).toBe(base.style.visualStyle);
  });
});
