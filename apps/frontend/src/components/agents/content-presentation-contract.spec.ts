import { describe, expect, it } from 'vitest';
import { resolveContentPresentation } from './content-presentation-payload';

// Consumer side of the tool→card contract. The fixtures below are the EXACT
// envelopes produced by the backend tool's execute() in
// libraries/nestjs-libraries/src/chat/tools/content.presentation.tool.ts
// (see its own spec, content.presentation.tool.spec.ts, which asserts the
// producer emits this shape). If either side drifts, one of these two specs
// fails — which is the whole point: the Studio's #1 class of regression is the
// backend and frontend silently disagreeing about the card payload shape.
//
// Note the two contract-critical facts these lock in:
//   1. The envelope is single-wrapped: `{ result: { ...ideas/slides... } }`.
//   2. The inner object has NO `operation` field — the frontend must infer it
//      from the presence of ideas[] / slides[].

const backendIdeasEnvelope = {
  result: {
    type: 'IDEAS',
    source: 'contentPresentationTool',
    title: '1 ideias prontas para usar',
    requiresUserSelection: true,
    ideas: [
      {
        id: 'idea-1',
        title: 'Bastidores do Processo',
        hook: 'Mostre como o trabalho acontece.',
        angle: 'Humanização e confiança.',
        format: 'Post para redes sociais',
        platform: 'Instagram',
        objective: 'Engajamento e autoridade',
        suggestedCta: 'Salve este conteúdo para consultar depois.',
      },
    ],
  },
};

const backendCarouselEnvelope = {
  result: {
    type: 'CAROUSEL_PREVIEW',
    source: 'contentPresentationTool',
    title: 'Seu carrossel',
    platform: 'Instagram',
    aspectRatio: '4:5',
    caption: undefined,
    hashtags: [],
    requiresUserSelection: true,
    slides: [
      {
        id: 'slide-1',
        index: 1,
        headline: 'Slide 1',
        visualDirection: 'Direção visual para: Slide 1',
        layout: 'text-card',
        imagePrompt: 'Direção visual para: Slide 1',
      },
      {
        id: 'slide-2',
        index: 2,
        headline: 'Slide 2',
        visualDirection: 'uma cena',
        layout: 'text-card',
        imagePrompt: 'uma cena',
      },
    ],
  },
};

describe('tool→card contract: resolveContentPresentation on real backend envelopes', () => {
  it('resolves the exact backend IDEAS envelope (no operation field, single wrap)', () => {
    const resolved = resolveContentPresentation(backendIdeasEnvelope, 'complete');
    expect(resolved).not.toBeNull();
    expect(resolved?.operation).toBe('ideas');
    expect(resolved?.payload.ideas).toHaveLength(1);
    expect(resolved?.payload.ideas[0].title).toBe('Bastidores do Processo');
  });

  it('resolves the exact backend CAROUSEL_PREVIEW envelope', () => {
    const resolved = resolveContentPresentation(backendCarouselEnvelope, 'complete');
    expect(resolved).not.toBeNull();
    expect(resolved?.operation).toBe('carousel');
    expect(resolved?.payload.slides).toHaveLength(2);
    expect(resolved?.payload.slides[1].imagePrompt).toBe('uma cena');
  });

  it('never resolves a card while the tool call is still streaming', () => {
    expect(resolveContentPresentation(backendIdeasEnvelope, 'inProgress')).toBeNull();
    expect(resolveContentPresentation(backendCarouselEnvelope, 'inProgress')).toBeNull();
  });

  it('yields null (not a broken card) on an empty or malformed envelope', () => {
    expect(resolveContentPresentation({}, 'complete')).toBeNull();
    expect(resolveContentPresentation({ result: {} }, 'complete')).toBeNull();
    expect(resolveContentPresentation({ result: { ideas: [] } }, 'complete')).toBeNull();
    expect(resolveContentPresentation(undefined, 'complete')).toBeNull();
  });
});
