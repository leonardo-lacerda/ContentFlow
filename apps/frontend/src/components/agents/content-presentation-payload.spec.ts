import { describe, expect, it } from 'vitest';
import { resolveContentPresentation } from './content-presentation-payload';

const ideasPayload = {
  operation: 'ideas',
  title: '3 ideias prontas para usar',
  ideas: [
    {
      title: 'Bastidores do Processo',
      hook: 'Mostre como o trabalho acontece.',
      angle: 'Humanização e confiança.',
      format: 'Reels',
      platform: 'Instagram',
      suggestedCta: 'Comente BASTIDORES.',
    },
  ],
};

describe('resolveContentPresentation', () => {
  it('keeps the same ideas artifact renderable on repeated resolutions', () => {
    const firstRender = resolveContentPresentation(ideasPayload, 'complete');
    const secondRender = resolveContentPresentation(ideasPayload, 'complete');

    expect(firstRender?.operation).toBe('ideas');
    expect(firstRender?.payload.ideas[0].title).toBe('Bastidores do Processo');
    expect(secondRender).toEqual(firstRender);
  });

  it('unwraps the result envelope returned by the backend tool', () => {
    const resolved = resolveContentPresentation(
      { result: { result: ideasPayload } },
      'complete'
    );

    expect(resolved?.operation).toBe('ideas');
    expect(resolved?.payload.ideas).toHaveLength(1);
  });
});
