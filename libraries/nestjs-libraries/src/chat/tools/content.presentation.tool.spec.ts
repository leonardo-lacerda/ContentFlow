import { ContentPresentationTool } from './content.presentation.tool';

// content.presentation.tool is the single backend producer of the Studio's
// idea/carousel cards. Its output shape is a hard contract with the frontend
// consumer (apps/frontend/.../content-presentation-payload.ts →
// resolveContentPresentation) and the card renderers in
// content-artifacts.component.tsx. This tool had zero tests, yet almost every
// Studio regression is a drift between what this emits and what the frontend
// expects. These tests lock the emitted shape so any future change here that
// would break the card has to break a test first.
//
// The mirror of this contract on the consumer side lives in
// apps/frontend/.../content-presentation-contract.spec.ts, which feeds these
// exact shapes through resolveContentPresentation.

const buildContext = () => {
  const store = new Map<string, string>();
  return {
    requestContext: {
      get: (key: string) => store.get(key),
      set: (key: string, value: string) => store.set(key, value),
    },
  };
};

describe('ContentPresentationTool', () => {
  let tool: ReturnType<ContentPresentationTool['run']>;
  const execute = (input: Record<string, any>) =>
    (tool as any).execute(input, buildContext());

  beforeEach(() => {
    tool = new ContentPresentationTool().run();
  });

  describe('operation ideas', () => {
    it('emits the IDEAS envelope the frontend card contract expects', async () => {
      const out = await execute({
        operation: 'ideas',
        ideas: [
          {
            title: 'Bastidores do Processo',
            hook: 'Mostre como o trabalho acontece.',
            angle: 'Humanização e confiança.',
            platform: 'Instagram',
          },
        ],
      });

      expect(out.result.type).toBe('IDEAS');
      expect(out.result.source).toBe('contentPresentationTool');
      expect(out.result.requiresUserSelection).toBe(true);
      expect(out.result.ideas).toHaveLength(1);
      // The frontend infers operation from the presence of ideas[], not from
      // an `operation` field — the envelope must carry the array populated.
      expect(Array.isArray(out.result.ideas)).toBe(true);
    });

    it('backfills omitted fields instead of dropping the idea (permissive schema)', async () => {
      const out = await execute({
        operation: 'ideas',
        // Only a hook — the model routinely omits title/format/objective/cta.
        ideas: [{ hook: 'Uma frase de gancho isolada, sem título.' }],
      });

      const idea = out.result.ideas[0];
      expect(idea.id).toBe('idea-1');
      expect(idea.title).toBeTruthy(); // derived from the hook
      expect(idea.format).toBeTruthy();
      expect(idea.platform).toBeTruthy();
      expect(idea.objective).toBeTruthy();
      expect(idea.suggestedCta).toBeTruthy();
    });

    it('infers operation=ideas when ideas[] is present without an explicit operation', async () => {
      const out = await execute({
        ideas: [{ title: 'Sem campo operation' }],
      });
      expect(out.result.type).toBe('IDEAS');
    });

    it('throws when no idea carries any usable content', async () => {
      await expect(
        execute({ operation: 'ideas', ideas: [{}, { angle: '' }] })
      ).rejects.toThrow(/ideas are required/);
    });

    it('caps the ideas card at 10 even when the model sends more (R4: enforced in code, not just the prompt)', async () => {
      const ideas = Array.from({ length: 15 }, (_, i) => ({ title: `Ideia ${i + 1}` }));
      const out = await execute({ operation: 'ideas', ideas });
      expect(out.result.ideas).toHaveLength(10);
      expect(out.result.ideas[0].title).toBe('Ideia 1');
      expect(out.result.ideas[9].title).toBe('Ideia 10');
    });

    it('keeps exactly 10 ideas untouched (boundary, not off-by-one)', async () => {
      const ideas = Array.from({ length: 10 }, (_, i) => ({ title: `Ideia ${i + 1}` }));
      const out = await execute({ operation: 'ideas', ideas });
      expect(out.result.ideas).toHaveLength(10);
    });
  });

  describe('operation carousel', () => {
    it('emits the CAROUSEL_PREVIEW envelope with normalized slides', async () => {
      const out = await execute({
        operation: 'carousel',
        title: 'Meu carrossel',
        slides: [
          { headline: 'Slide 1', body: 'Corpo 1' },
          { headline: 'Slide 2', body: 'Corpo 2', imagePrompt: 'uma cena' },
        ],
      });

      expect(out.result.type).toBe('CAROUSEL_PREVIEW');
      expect(out.result.source).toBe('contentPresentationTool');
      expect(out.result.slides).toHaveLength(2);
      expect(out.result.platform).toBeTruthy();
      expect(out.result.aspectRatio).toBeTruthy();
      // Every slide must carry the fields the card renders, backfilled if absent.
      out.result.slides.forEach((slide: any, i: number) => {
        expect(slide.id).toBe(`slide-${i + 1}`);
        expect(slide.index).toBe(i + 1);
        expect(slide.headline).toBeTruthy();
        expect(slide.visualDirection).toBeTruthy();
        expect(slide.layout).toBeTruthy();
        expect(slide.imagePrompt).toBeTruthy();
      });
    });

    it('infers operation=carousel when only slides[] is present', async () => {
      const out = await execute({ slides: [{ headline: 'Único slide' }] });
      expect(out.result.type).toBe('CAROUSEL_PREVIEW');
    });

    it('throws when no slide carries any usable content', async () => {
      await expect(
        execute({ operation: 'carousel', slides: [{}, { layout: 'x' }] })
      ).rejects.toThrow(/slides are required/);
    });
  });
});
