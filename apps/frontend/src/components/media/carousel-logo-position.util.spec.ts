import { describe, expect, it } from 'vitest';
import { pointerToLogoFraction, resolveLogoCssBox } from './carousel-logo-position.util';

describe('resolveLogoCssBox', () => {
  it('places top-left near the top-left corner, inset by the margin', () => {
    const box = resolveLogoCssBox('top-left', 20, 1);
    expect(box.leftPct).toBe(4);
    expect(box.topPct).toBe(4);
    expect(box.widthPct).toBe(20);
  });

  it('places top-right flush against the right edge minus the margin and the logo width', () => {
    const box = resolveLogoCssBox('top-right', 20, 1);
    expect(box.leftPct).toBe(100 - 20 - 4);
    expect(box.topPct).toBe(4);
  });

  it('places bottom-right accounting for the logo\'s own (non-square) height', () => {
    // aspect 0.5 -> a 20%-wide logo is 10% tall.
    const box = resolveLogoCssBox('bottom-right', 20, 0.5);
    expect(box.leftPct).toBe(100 - 20 - 4);
    expect(box.topPct).toBe(100 - 10 - 4);
  });

  it('centres the logo for the "center" preset', () => {
    const box = resolveLogoCssBox('center', 20, 1);
    expect(box.leftPct).toBe(40);
    expect(box.topPct).toBe(40);
  });

  it('places a custom position at the given centre fraction, offset by half the logo size', () => {
    const box = resolveLogoCssBox('custom', 20, 1, 0.75, 0.25);
    expect(box.leftPct).toBe(75 - 10);
    expect(box.topPct).toBe(25 - 10);
  });

  it('defaults a custom position with no x/y to dead centre', () => {
    const box = resolveLogoCssBox('custom', 20, 1);
    expect(box.leftPct).toBe(40);
    expect(box.topPct).toBe(40);
  });

  it('clamps widthPct into the same [4, 60] range the backend enforces', () => {
    expect(resolveLogoCssBox('center', 500, 1).widthPct).toBe(60);
    expect(resolveLogoCssBox('center', 0, 1).widthPct).toBe(4);
  });

  it('never lets the box escape the container, even for an extreme custom position', () => {
    const box = resolveLogoCssBox('custom', 30, 1, 0, 0);
    expect(box.leftPct).toBeGreaterThanOrEqual(0);
    expect(box.topPct).toBeGreaterThanOrEqual(0);

    const box2 = resolveLogoCssBox('custom', 30, 1, 1, 1);
    expect(box2.leftPct).toBeLessThanOrEqual(100 - box2.widthPct);
    expect(box2.topPct).toBeLessThanOrEqual(100 - box2.widthPct);
  });
});

describe('pointerToLogoFraction', () => {
  it('converts a pointer position within the container to a 0-1 fraction', () => {
    expect(pointerToLogoFraction(50, 25, 200, 100)).toEqual({ x: 0.25, y: 0.25 });
  });

  it('clamps out-of-bounds pointer positions into [0, 1]', () => {
    expect(pointerToLogoFraction(-10, 500, 200, 100)).toEqual({ x: 0, y: 1 });
  });

  it('returns the centre for a zero-sized container instead of dividing by zero', () => {
    expect(pointerToLogoFraction(10, 10, 0, 0)).toEqual({ x: 0.5, y: 0.5 });
  });
});
