import { describe, expect, it } from 'vitest';
import { stripStudioMarkerBlocks } from './studio-marker-blocks';

describe('stripStudioMarkerBlocks', () => {
  it('strips a content-action block, including a multiline JSON payload', () => {
    const content = [
      'antes',
      '[--content-action--]',
      'ACTION: transform-carousel. Execute this button action now.',
      'PAYLOAD: {"ideaId":"1","nested":{"a":1}}',
      '[--content-action--]',
      'depois',
    ].join('\n');
    const stripped = stripStudioMarkerBlocks(content);
    expect(stripped).toContain('antes');
    expect(stripped).toContain('depois');
    expect(stripped).not.toContain('content-action');
    expect(stripped).not.toContain('transform-carousel');
  });

  it('strips every known marker type by default', () => {
    const content = [
      '[--integrations--]x[--integrations--]',
      '[--creation-options--]y[--creation-options--]',
      '[--contentflow-intent--]z[--contentflow-intent--]',
      '[--content-action--]w[--content-action--]',
    ].join('');
    expect(stripStudioMarkerBlocks(content)).toBe('');
  });

  it('strips multiple occurrences of the same marker independently', () => {
    const content = '[--content-action--]a[--content-action--] middle [--content-action--]b[--content-action--]';
    expect(stripStudioMarkerBlocks(content)).toBe(' middle ');
  });

  it('can be scoped to a subset of marker names', () => {
    const content = '[--integrations--]x[--integrations--][--content-action--]y[--content-action--]';
    const stripped = stripStudioMarkerBlocks(content, ['content-action']);
    expect(stripped).toBe('[--integrations--]x[--integrations--]');
  });

  it('leaves ordinary text without any markers untouched', () => {
    expect(stripStudioMarkerBlocks('Olá! Tudo bem?')).toBe('Olá! Tudo bem?');
  });

  it('does not touch an unrelated bracket pattern like [--Media--]', () => {
    const content = '[--Media--]<img />[--Media--]';
    expect(stripStudioMarkerBlocks(content)).toBe(content);
  });
});
