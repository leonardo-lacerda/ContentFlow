import { describe, expect, it, beforeEach } from 'vitest';
import {
  artifactSignature,
  claimArtifactCard,
  resetArtifactCardOwners,
  resolveContentPresentation,
} from './content-presentation-payload';

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

describe('claimArtifactCard', () => {
  beforeEach(() => resetArtifactCardOwners());

  it('lets the first structured claimant render and suppresses a second, genuinely duplicate structured claimant', () => {
    const signature = artifactSignature('ideas', ideasPayload);
    // Two different tool-call instances (distinct owner ids) emitting the same
    // content is exactly the bug this guards against: the model re-emitting
    // the same ideas card. First wins, second is suppressed.
    expect(claimArtifactCard(signature, 'structured:instance-1', true)).toBe(true);
    expect(claimArtifactCard(signature, 'structured:instance-2', true)).toBe(false);
  });

  it('lets the same owner keep rendering across repeated calls (status re-renders)', () => {
    const signature = artifactSignature('ideas', ideasPayload);
    expect(claimArtifactCard(signature, 'structured:instance-1', true)).toBe(true);
    expect(claimArtifactCard(signature, 'structured:instance-1', true)).toBe(true);
    expect(claimArtifactCard(signature, 'structured:instance-1', true)).toBe(true);
  });

  it('lets a structured render take over from a stale text-fallback owner', () => {
    const signature = artifactSignature('ideas', ideasPayload);
    expect(claimArtifactCard(signature, 'text:message-1', false)).toBe(true);
    expect(claimArtifactCard(signature, 'structured:instance-1', true)).toBe(true);
  });

  it('never lets a text-fallback owner take over from a structured owner', () => {
    const signature = artifactSignature('ideas', ideasPayload);
    expect(claimArtifactCard(signature, 'structured:instance-1', true)).toBe(true);
    // A later text-fallback parse of the same content must not win, even
    // without takeOver, since a different owner already holds it.
    expect(claimArtifactCard(signature, 'text:message-2', false)).toBe(false);
  });

  it('suppresses a second text-fallback owner for identical content, same as before', () => {
    const signature = artifactSignature('ideas', ideasPayload);
    expect(claimArtifactCard(signature, 'text:message-1', false)).toBe(true);
    expect(claimArtifactCard(signature, 'text:message-2', false)).toBe(false);
  });
});

describe('artifactSignature', () => {
  it('gives a carousel a different signature once a slide gains an imageUrl', () => {
    const before = {
      slides: [{ headline: 'Slide 1' }, { headline: 'Slide 2' }],
    };
    const after = {
      slides: [
        { headline: 'Slide 1', imageUrl: 'https://example.com/1.png' },
        { headline: 'Slide 2' },
      ],
    };
    expect(artifactSignature('carousel', before)).not.toBe(artifactSignature('carousel', after));
  });

  it('gives an identical carousel payload the same signature', () => {
    const payload = { slides: [{ headline: 'Slide 1' }, { headline: 'Slide 2' }] };
    expect(artifactSignature('carousel', payload)).toBe(artifactSignature('carousel', { ...payload }));
  });
});
