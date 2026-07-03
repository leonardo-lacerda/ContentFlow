import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { CarouselPlan, CarouselSlide, SlideImageResult } from './ai-generate-images.types';
import { MAX_UNDO_HISTORY, MIN_CAROUSEL_SLIDES, MAX_CAROUSEL_SLIDES } from './ai-generate-images.constants';
import {
  createSlideId,
  ensureSlideIds,
  createSnapshot,
  restoreSnapshot,
  pushSnapshot,
  addSlideToPlan,
  removeSlideFromPlan,
  duplicateSlideInPlan,
  moveSlideInPlan,
} from './slide-operations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSlide(overrides: Partial<CarouselSlide> = {}): CarouselSlide {
  return {
    id: `slide-${Math.random().toString(36).slice(2, 8)}`,
    index: 0,
    headline: '',
    body: '',
    cta: '',
    imagePrompt: '',
    altText: '',
    ...overrides,
  };
}

function makePlan(slideCount: number, overrides: Partial<CarouselPlan> = {}): CarouselPlan {
  const slides = Array.from({ length: slideCount }, (_, i) =>
    makeSlide({ id: `s${i + 1}`, index: i + 1, headline: `Slide ${i + 1}` })
  );
  return {
    title: 'Test Plan',
    platform: 'instagram',
    language: 'pt-BR',
    caption: '',
    hashtags: [],
    imageStyleGuide: '',
    slides,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('slide-operations', () => {
  // =========================================================================
  // createSlideId
  // =========================================================================
  describe('createSlideId', () => {
    it('returns a string', () => {
      const id = createSlideId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('produces unique ids on successive calls', () => {
      const ids = new Set(Array.from({ length: 100 }, () => createSlideId()));
      expect(ids.size).toBe(100);
    });

    it('uses crypto.randomUUID when available', () => {
      const spy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('fake-uuid' as any);
      const id = createSlideId();
      expect(id).toBe('fake-uuid');
      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });

    it('falls back to timestamp+random when crypto is unavailable', () => {
      const original = (globalThis as any).crypto;
      // Temporarily remove crypto.randomUUID
      const mockCrypto = { ...original, randomUUID: undefined };
      vi.stubGlobal('crypto', mockCrypto);

      const id = createSlideId();
      expect(typeof id).toBe('string');
      expect(id.startsWith('s_')).toBe(true);

      vi.stubGlobal('crypto', original);
    });
  });

  // =========================================================================
  // ensureSlideIds
  // =========================================================================
  describe('ensureSlideIds', () => {
    it('preserves existing ids', () => {
      const slides = [
        makeSlide({ id: 'existing-1', index: 1 }),
        makeSlide({ id: 'existing-2', index: 2 }),
      ];
      const result = ensureSlideIds(slides);
      expect(result[0].id).toBe('existing-1');
      expect(result[1].id).toBe('existing-2');
    });

    it('assigns new id when id is empty string', () => {
      const slides = [makeSlide({ id: '', index: 1 })];
      const result = ensureSlideIds(slides);
      expect(result[0].id).not.toBe('');
      expect(typeof result[0].id).toBe('string');
      expect(result[0].id.length).toBeGreaterThan(0);
    });

    it('assigns new id when id is falsy (undefined)', () => {
      const slides = [{ index: 1, headline: 'H', body: '', cta: '', imagePrompt: '', altText: '' } as CarouselSlide];
      const result = ensureSlideIds(slides);
      expect(typeof result[0].id).toBe('string');
      expect(result[0].id.length).toBeGreaterThan(0);
    });

    it('preserves existing index when non-zero', () => {
      const slides = [makeSlide({ id: 'a', index: 5 })];
      const result = ensureSlideIds(slides);
      expect(result[0].index).toBe(5);
    });

    it('assigns sequential index when index is 0 or falsy', () => {
      const slides = [
        makeSlide({ id: 'a', index: 0 }),
        makeSlide({ id: 'b', index: 0 }),
        makeSlide({ id: 'c', index: 0 }),
      ];
      const result = ensureSlideIds(slides);
      expect(result[0].index).toBe(1);
      expect(result[1].index).toBe(2);
      expect(result[2].index).toBe(3);
    });

    it('handles empty array', () => {
      expect(ensureSlideIds([])).toEqual([]);
    });

    it('does not mutate the original slides', () => {
      const slides = [makeSlide({ id: '', index: 0 })];
      const copy = { ...slides[0] };
      ensureSlideIds(slides);
      expect(slides[0]).toEqual(copy);
    });
  });

  // =========================================================================
  // Snapshot system
  // =========================================================================
  describe('createSnapshot / restoreSnapshot', () => {
    it('round-trips plan + slideImages', () => {
      const plan = makePlan(3);
      const slideImages: Record<string, SlideImageResult> = {
        s1: { image: { url: 'https://img.test/1.png' } },
        s2: { error: 'timeout' },
      };

      const raw = createSnapshot(plan, slideImages);
      const restored = restoreSnapshot(raw);

      expect(restored.plan).toEqual(plan);
      expect(restored.slideImages).toEqual(slideImages);
    });

    it('round-trips null plan', () => {
      const raw = createSnapshot(null, {});
      const restored = restoreSnapshot(raw);
      expect(restored.plan).toBeNull();
      expect(restored.slideImages).toEqual({});
    });

    it('produces valid JSON', () => {
      const raw = createSnapshot(makePlan(2), {});
      expect(() => JSON.parse(raw)).not.toThrow();
    });

    it('preserves all slide fields exactly', () => {
      const plan = makePlan(1, {
        title: 'Título com acentos: ão ç ü',
        caption: 'Caption 🎉',
        hashtags: ['#test', '#emoji🔥'],
      });
      plan.slides[0] = makeSlide({
        id: 'preserved',
        index: 1,
        headline: 'Headline "quotes" & <tags>',
        body: 'Body\nwith\nnewlines',
        cta: 'Click here!',
        imagePrompt: 'A cat wearing a hat',
        altText: 'Alt text',
      });

      const raw = createSnapshot(plan, {});
      const { plan: restored } = restoreSnapshot(raw);
      expect(restored.slides[0]).toEqual(plan.slides[0]);
      expect(restored.title).toBe('Título com acentos: ão ç ü');
    });

    it('preserves slideImages with cost_estimate', () => {
      const slideImages: Record<string, SlideImageResult> = {
        s1: {
          image: { url: 'url', b64_json: 'base64', revised_prompt: 'revised' },
          cost_estimate: { usd: 0.02, brl: 0.10, usdToBrl: 5, tokens: {} as any },
        },
      };
      const raw = createSnapshot(makePlan(1), slideImages);
      const restored = restoreSnapshot(raw);
      expect(restored.slideImages.s1.cost_estimate?.usd).toBe(0.02);
    });
  });

  // =========================================================================
  // pushSnapshot
  // =========================================================================
  describe('pushSnapshot', () => {
    it('appends snapshot to empty stack', () => {
      const result = pushSnapshot([], 'snap1');
      expect(result).toEqual(['snap1']);
    });

    it('appends snapshot to existing stack', () => {
      const result = pushSnapshot(['snap1', 'snap2'], 'snap3');
      expect(result).toEqual(['snap1', 'snap2', 'snap3']);
    });

    it('does not mutate the original stack', () => {
      const stack = ['snap1'];
      const result = pushSnapshot(stack, 'snap2');
      expect(stack).toEqual(['snap1']);
      expect(result).toEqual(['snap1', 'snap2']);
    });

    it('trims from the front when exceeding MAX_UNDO_HISTORY', () => {
      const stack = Array.from({ length: MAX_UNDO_HISTORY }, (_, i) => `snap${i}`);
      const result = pushSnapshot(stack, 'newest');
      expect(result.length).toBe(MAX_UNDO_HISTORY);
      expect(result[0]).toBe('snap1'); // oldest dropped
      expect(result[result.length - 1]).toBe('newest');
    });

    it('exactly at MAX_UNDO_HISTORY does not trim', () => {
      const stack = Array.from({ length: MAX_UNDO_HISTORY - 1 }, (_, i) => `snap${i}`);
      const result = pushSnapshot(stack, 'snap-last');
      expect(result.length).toBe(MAX_UNDO_HISTORY);
    });
  });

  // =========================================================================
  // addSlideToPlan
  // =========================================================================
  describe('addSlideToPlan', () => {
    it('returns null for null plan', () => {
      expect(addSlideToPlan(null, 0)).toBeNull();
    });

    it('adds a slide after the specified index (1-based)', () => {
      const plan = makePlan(3);
      const result = addSlideToPlan(plan, 1);
      expect(result).not.toBeNull();
      expect(result!.slides.length).toBe(4);
      // New slide should be at position 2 (after index 1)
      expect(result!.slides[1].headline).toBe('');
      expect(result!.slides[1].index).toBe(2);
    });

    it('appends when afterIndex >= length', () => {
      const plan = makePlan(3);
      const result = addSlideToPlan(plan, 99);
      expect(result!.slides.length).toBe(4);
      expect(result!.slides[3].headline).toBe('');
    });

    it('clamps negative afterIndex to 0 (prepend)', () => {
      const plan = makePlan(3);
      const result = addSlideToPlan(plan, -5);
      expect(result!.slides.length).toBe(4);
      expect(result!.slides[0].headline).toBe('');
    });

    it('new slide has empty fields and a unique id', () => {
      const plan = makePlan(2);
      const result = addSlideToPlan(plan, 1);
      const newSlide = result!.slides[1];
      expect(newSlide.headline).toBe('');
      expect(newSlide.body).toBe('');
      expect(newSlide.cta).toBe('');
      expect(newSlide.imagePrompt).toBe('');
      expect(newSlide.altText).toBe('');
      expect(typeof newSlide.id).toBe('string');
      expect(newSlide.id.length).toBeGreaterThan(0);
    });

    it('reindexes slides after adding', () => {
      const plan = makePlan(3);
      const result = addSlideToPlan(plan, 1);
      result!.slides.forEach((s, i) => {
        expect(s.index).toBe(i + 1);
      });
    });

    it('preserves existing slide ids after adding', () => {
      const plan = makePlan(3);
      const result = addSlideToPlan(plan, 2);
      expect(result!.slides[0].id).toBe('s1');
      expect(result!.slides[1].id).toBe('s2');
      // slides[2] is the new one
      expect(result!.slides[3].id).toBe('s3');
    });

    it('returns the same plan reference when at MAX_CAROUSEL_SLIDES', () => {
      const plan = makePlan(MAX_CAROUSEL_SLIDES);
      const result = addSlideToPlan(plan, 1);
      expect(result).toBe(plan); // same reference, no mutation
      expect(result!.slides.length).toBe(MAX_CAROUSEL_SLIDES);
    });

    it('allows adding when one below max', () => {
      const plan = makePlan(MAX_CAROUSEL_SLIDES - 1);
      const result = addSlideToPlan(plan, 1);
      expect(result!.slides.length).toBe(MAX_CAROUSEL_SLIDES);
    });

    it('adding to a plan with 1 slide (below MIN) still works', () => {
      const plan = makePlan(1);
      const result = addSlideToPlan(plan, 0);
      expect(result!.slides.length).toBe(2);
    });

    it('does not mutate original plan', () => {
      const plan = makePlan(3);
      const originalLength = plan.slides.length;
      addSlideToPlan(plan, 1);
      expect(plan.slides.length).toBe(originalLength);
    });
  });

  // =========================================================================
  // removeSlideFromPlan
  // =========================================================================
  describe('removeSlideFromPlan', () => {
    it('returns null for null plan', () => {
      expect(removeSlideFromPlan(null, 1)).toBeNull();
    });

    it('removes the slide at the given 1-based index', () => {
      const plan = makePlan(4);
      const result = removeSlideFromPlan(plan, 2);
      expect(result!.slides.length).toBe(3);
      expect(result!.slides.find((s) => s.id === 's2')).toBeUndefined();
    });

    it('removes the first slide', () => {
      const plan = makePlan(3);
      const result = removeSlideFromPlan(plan, 1);
      expect(result!.slides.length).toBe(2);
      expect(result!.slides[0].id).toBe('s2');
    });

    it('removes the last slide', () => {
      const plan = makePlan(3);
      const result = removeSlideFromPlan(plan, 3);
      expect(result!.slides.length).toBe(2);
      expect(result!.slides[1].id).toBe('s2');
    });

    it('reindexes after removal', () => {
      const plan = makePlan(4);
      const result = removeSlideFromPlan(plan, 2);
      result!.slides.forEach((s, i) => {
        expect(s.index).toBe(i + 1);
      });
    });

    it('returns same plan when at MIN_CAROUSEL_SLIDES', () => {
      const plan = makePlan(MIN_CAROUSEL_SLIDES);
      const result = removeSlideFromPlan(plan, 1);
      expect(result).toBe(plan);
      expect(result!.slides.length).toBe(MIN_CAROUSEL_SLIDES);
    });

    it('returns same plan when below MIN_CAROUSEL_SLIDES', () => {
      const plan = makePlan(1);
      const result = removeSlideFromPlan(plan, 1);
      expect(result).toBe(plan);
    });

    it('allows removal when above MIN', () => {
      const plan = makePlan(MIN_CAROUSEL_SLIDES + 1);
      const result = removeSlideFromPlan(plan, 1);
      expect(result!.slides.length).toBe(MIN_CAROUSEL_SLIDES);
    });

    it('returns same plan for out-of-range index (too high)', () => {
      const plan = makePlan(3);
      const result = removeSlideFromPlan(plan, 10);
      expect(result).toBe(plan);
      expect(result!.slides.length).toBe(3);
    });

    it('returns same plan for index 0 (below 1-based range)', () => {
      const plan = makePlan(3);
      const result = removeSlideFromPlan(plan, 0);
      expect(result).toBe(plan);
    });

    it('returns same plan for negative index', () => {
      const plan = makePlan(3);
      const result = removeSlideFromPlan(plan, -1);
      expect(result).toBe(plan);
    });

    it('does not mutate original plan', () => {
      const plan = makePlan(4);
      removeSlideFromPlan(plan, 2);
      expect(plan.slides.length).toBe(4);
    });
  });

  // =========================================================================
  // duplicateSlideInPlan
  // =========================================================================
  describe('duplicateSlideInPlan', () => {
    it('returns null for null plan', () => {
      expect(duplicateSlideInPlan(null, 1)).toBeNull();
    });

    it('duplicates the slide at the given index', () => {
      const plan = makePlan(3);
      const result = duplicateSlideInPlan(plan, 2);
      expect(result!.slides.length).toBe(4);
      // Original at index 2 (id s2) should be followed by its copy
      expect(result!.slides[1].id).toBe('s2');
      expect(result!.slides[2].headline).toBe('Slide 2'); // copy has same content
      expect(result!.slides[2].id).not.toBe('s2'); // but different id
    });

    it('copy has a fresh unique id', () => {
      const plan = makePlan(2);
      const result = duplicateSlideInPlan(plan, 1);
      const ids = result!.slides.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length); // all ids unique
    });

    it('copy preserves all content fields', () => {
      const plan = makePlan(1);
      plan.slides[0] = makeSlide({
        id: 'orig',
        index: 1,
        headline: 'My Headline',
        body: 'Body text',
        cta: 'Click me',
        imagePrompt: 'A prompt',
        altText: 'Alt text',
      });
      const result = duplicateSlideInPlan(plan, 1);
      const copy = result!.slides[1];
      expect(copy.headline).toBe('My Headline');
      expect(copy.body).toBe('Body text');
      expect(copy.cta).toBe('Click me');
      expect(copy.imagePrompt).toBe('A prompt');
      expect(copy.altText).toBe('Alt text');
    });

    it('reindexes after duplication', () => {
      const plan = makePlan(3);
      const result = duplicateSlideInPlan(plan, 1);
      result!.slides.forEach((s, i) => {
        expect(s.index).toBe(i + 1);
      });
    });

    it('duplicates the first slide', () => {
      const plan = makePlan(3);
      const result = duplicateSlideInPlan(plan, 1);
      expect(result!.slides.length).toBe(4);
      expect(result!.slides[0].id).toBe('s1');
      expect(result!.slides[1].headline).toBe('Slide 1');
    });

    it('duplicates the last slide', () => {
      const plan = makePlan(3);
      const result = duplicateSlideInPlan(plan, 3);
      expect(result!.slides.length).toBe(4);
      expect(result!.slides[2].id).toBe('s3');
      expect(result!.slides[3].headline).toBe('Slide 3');
    });

    it('returns same plan when at MAX_CAROUSEL_SLIDES', () => {
      const plan = makePlan(MAX_CAROUSEL_SLIDES);
      const result = duplicateSlideInPlan(plan, 1);
      expect(result).toBe(plan);
      expect(result!.slides.length).toBe(MAX_CAROUSEL_SLIDES);
    });

    it('returns same plan for out-of-range index (too high)', () => {
      const plan = makePlan(3);
      const result = duplicateSlideInPlan(plan, 10);
      expect(result).toBe(plan);
    });

    it('returns same plan for index 0', () => {
      const plan = makePlan(3);
      const result = duplicateSlideInPlan(plan, 0);
      expect(result).toBe(plan);
    });

    it('returns same plan for negative index', () => {
      const plan = makePlan(3);
      const result = duplicateSlideInPlan(plan, -3);
      expect(result).toBe(plan);
    });

    it('does not mutate original plan', () => {
      const plan = makePlan(3);
      duplicateSlideInPlan(plan, 1);
      expect(plan.slides.length).toBe(3);
    });
  });

  // =========================================================================
  // moveSlideInPlan
  // =========================================================================
  describe('moveSlideInPlan', () => {
    it('returns null for null plan', () => {
      expect(moveSlideInPlan(null, 1, 2)).toBeNull();
    });

    it('moves a slide forward', () => {
      const plan = makePlan(4);
      const result = moveSlideInPlan(plan, 1, 3);
      expect(result!.slides.length).toBe(4);
      expect(result!.slides[0].id).toBe('s2');
      expect(result!.slides[1].id).toBe('s3');
      expect(result!.slides[2].id).toBe('s1'); // moved here
      expect(result!.slides[3].id).toBe('s4');
    });

    it('moves a slide backward', () => {
      const plan = makePlan(4);
      const result = moveSlideInPlan(plan, 4, 1);
      expect(result!.slides[0].id).toBe('s4'); // moved to front
      expect(result!.slides[1].id).toBe('s1');
      expect(result!.slides[2].id).toBe('s2');
      expect(result!.slides[3].id).toBe('s3');
    });

    it('reindexes after move', () => {
      const plan = makePlan(4);
      const result = moveSlideInPlan(plan, 1, 4);
      result!.slides.forEach((s, i) => {
        expect(s.index).toBe(i + 1);
      });
    });

    it('returns same plan when from === to', () => {
      const plan = makePlan(3);
      const result = moveSlideInPlan(plan, 2, 2);
      expect(result).toBe(plan);
    });

    it('returns same plan for fromIndex out of range (too high)', () => {
      const plan = makePlan(3);
      const result = moveSlideInPlan(plan, 10, 1);
      expect(result).toBe(plan);
    });

    it('returns same plan for toIndex out of range (too high)', () => {
      const plan = makePlan(3);
      const result = moveSlideInPlan(plan, 1, 10);
      expect(result).toBe(plan);
    });

    it('returns same plan for fromIndex 0', () => {
      const plan = makePlan(3);
      const result = moveSlideInPlan(plan, 0, 2);
      expect(result).toBe(plan);
    });

    it('returns same plan for toIndex 0', () => {
      const plan = makePlan(3);
      const result = moveSlideInPlan(plan, 1, 0);
      expect(result).toBe(plan);
    });

    it('returns same plan for negative indices', () => {
      const plan = makePlan(3);
      expect(moveSlideInPlan(plan, -1, 2)).toBe(plan);
      expect(moveSlideInPlan(plan, 1, -1)).toBe(plan);
    });

    it('adjacent swap (forward)', () => {
      const plan = makePlan(3);
      const result = moveSlideInPlan(plan, 1, 2);
      expect(result!.slides[0].id).toBe('s2');
      expect(result!.slides[1].id).toBe('s1');
      expect(result!.slides[2].id).toBe('s3');
    });

    it('adjacent swap (backward)', () => {
      const plan = makePlan(3);
      const result = moveSlideInPlan(plan, 2, 1);
      expect(result!.slides[0].id).toBe('s2');
      expect(result!.slides[1].id).toBe('s1');
      expect(result!.slides[2].id).toBe('s3');
    });

    it('does not mutate original plan', () => {
      const plan = makePlan(4);
      const originalIds = plan.slides.map((s) => s.id);
      moveSlideInPlan(plan, 1, 4);
      expect(plan.slides.map((s) => s.id)).toEqual(originalIds);
    });

    it('preserves all other plan fields', () => {
      const plan = makePlan(3, {
        title: 'Special Title',
        caption: 'A caption',
        hashtags: ['#a', '#b'],
      });
      const result = moveSlideInPlan(plan, 1, 3);
      expect(result!.title).toBe('Special Title');
      expect(result!.caption).toBe('A caption');
      expect(result!.hashtags).toEqual(['#a', '#b']);
    });
  });

  // =========================================================================
  // Immutability guarantee (cross-cutting)
  // =========================================================================
  describe('immutability', () => {
    it('all CRUD operations return new plan objects', () => {
      const plan = makePlan(4);

      const added = addSlideToPlan(plan, 1);
      expect(added).not.toBe(plan);

      const removed = removeSlideFromPlan(plan, 1);
      expect(removed).not.toBe(plan);

      const duplicated = duplicateSlideInPlan(plan, 1);
      expect(duplicated).not.toBe(plan);

      const moved = moveSlideInPlan(plan, 1, 3);
      expect(moved).not.toBe(plan);
    });

    it('slides array is a new reference after CRUD', () => {
      const plan = makePlan(4);

      const added = addSlideToPlan(plan, 1);
      expect(added!.slides).not.toBe(plan.slides);

      const removed = removeSlideFromPlan(plan, 1);
      expect(removed!.slides).not.toBe(plan.slides);
    });
  });

  // =========================================================================
  // Edge cases: MIN/MAX boundaries
  // =========================================================================
  describe('boundary: MIN/MAX slide counts', () => {
    it('can add up to MAX from below MAX', () => {
      const plan = makePlan(MAX_CAROUSEL_SLIDES - 1);
      const result = addSlideToPlan(plan, 0);
      expect(result!.slides.length).toBe(MAX_CAROUSEL_SLIDES);
    });

    it('cannot add beyond MAX', () => {
      const plan = makePlan(MAX_CAROUSEL_SLIDES);
      const result = addSlideToPlan(plan, 0);
      expect(result).toBe(plan);
    });

    it('can remove down to MIN from above MIN', () => {
      const plan = makePlan(MIN_CAROUSEL_SLIDES + 1);
      const result = removeSlideFromPlan(plan, 1);
      expect(result!.slides.length).toBe(MIN_CAROUSEL_SLIDES);
    });

    it('cannot remove below MIN', () => {
      const plan = makePlan(MIN_CAROUSEL_SLIDES);
      const result = removeSlideFromPlan(plan, 1);
      expect(result).toBe(plan);
    });

    it('cannot duplicate at MAX', () => {
      const plan = makePlan(MAX_CAROUSEL_SLIDES);
      const result = duplicateSlideInPlan(plan, 1);
      expect(result).toBe(plan);
    });

    it('can duplicate when at MAX - 1', () => {
      const plan = makePlan(MAX_CAROUSEL_SLIDES - 1);
      const result = duplicateSlideInPlan(plan, 1);
      expect(result!.slides.length).toBe(MAX_CAROUSEL_SLIDES);
    });
  });
});
