/**
 * Pure slide CRUD, snapshot, and reindex utilities.
 *
 * All plan-level functions operate on `CarouselPlan | null` and return a new
 * plan (or null). They never mutate.
 *
 * Snapshot helpers serialize/deserialize the full state (plan + slideImages)
 * using JSON strings stored in a `string[]` stack.
 */

import type { CarouselPlan, CarouselSlide, SlideImageResult } from './ai-generate-images.types';
import { MAX_UNDO_HISTORY, MIN_CAROUSEL_SLIDES, MAX_CAROUSEL_SLIDES } from './ai-generate-images.constants';

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

export function createSlideId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Reindex
// ---------------------------------------------------------------------------

function reindexSlides(slides: CarouselSlide[]): CarouselSlide[] {
  return slides.map((slide, i) => ({ ...slide, index: i + 1 }));
}

// ---------------------------------------------------------------------------
// Snapshot system (serialize ↔ JSON string)
// ---------------------------------------------------------------------------

type SnapshotData = {
  plan: CarouselPlan;
  slideImages: Record<string, SlideImageResult>;
};

export function createSnapshot(
  plan: CarouselPlan | null,
  slideImages: Record<string, SlideImageResult>
): string {
  return JSON.stringify({ plan, slideImages });
}

export function restoreSnapshot(raw: string): SnapshotData {
  const data = JSON.parse(raw) as SnapshotData;
  return data;
}

export function pushSnapshot(stack: string[], snapshot: string): string[] {
  const next = [...stack, snapshot];
  if (next.length > MAX_UNDO_HISTORY) {
    return next.slice(next.length - MAX_UNDO_HISTORY);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Plan-level slide CRUD
// ---------------------------------------------------------------------------

/**
 * Add a blank slide after `afterIndex` (1-based).
 * If `afterIndex` >= length, appends at the end.
 */
export function addSlideToPlan(
  plan: CarouselPlan | null,
  afterIndex: number
): CarouselPlan | null {
  if (!plan) return null;
  if (plan.slides.length >= MAX_CAROUSEL_SLIDES) return plan;

  const insertAt = Math.max(0, Math.min(afterIndex, plan.slides.length));
  const newSlide: CarouselSlide = {
    id: createSlideId(),
    index: 0,
    headline: '',
    body: '',
    cta: '',
    imagePrompt: '',
    altText: '',
  };
  const next = [...plan.slides];
  next.splice(insertAt, 0, newSlide);
  return { ...plan, slides: reindexSlides(next) };
}

/**
 * Remove the slide at `index` (1-based).
 */
export function removeSlideFromPlan(
  plan: CarouselPlan | null,
  index: number
): CarouselPlan | null {
  if (!plan) return null;
  if (plan.slides.length <= MIN_CAROUSEL_SLIDES) return plan;

  const pos = index - 1;
  if (pos < 0 || pos >= plan.slides.length) return plan;
  const next = plan.slides.filter((_, i) => i !== pos);
  return { ...plan, slides: reindexSlides(next) };
}

/**
 * Duplicate the slide at `index` (1-based).
 * The copy gets a fresh ID and is inserted right after the original.
 */
export function duplicateSlideInPlan(
  plan: CarouselPlan | null,
  index: number
): CarouselPlan | null {
  if (!plan) return null;
  if (plan.slides.length >= MAX_CAROUSEL_SLIDES) return plan;

  const pos = index - 1;
  if (pos < 0 || pos >= plan.slides.length) return plan;
  const original = plan.slides[pos];
  const copy: CarouselSlide = {
    ...original,
    id: createSlideId(),
  };
  const next = [...plan.slides];
  next.splice(pos + 1, 0, copy);
  return { ...plan, slides: reindexSlides(next) };
}

/**
 * Move a slide from `fromIndex` to `toIndex` (both 1-based).
 */
export function moveSlideInPlan(
  plan: CarouselPlan | null,
  fromIndex: number,
  toIndex: number
): CarouselPlan | null {
  if (!plan) return plan;
  const from = fromIndex - 1;
  const to = toIndex - 1;
  if (
    from < 0 || from >= plan.slides.length ||
    to < 0 || to >= plan.slides.length ||
    from === to
  ) return plan;

  const next = [...plan.slides];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return { ...plan, slides: reindexSlides(next) };
}

// ---------------------------------------------------------------------------
// Helpers for loading legacy projects
// ---------------------------------------------------------------------------

/**
 * Ensure every slide has an `id` field.
 * Used when loading legacy projects saved without IDs.
 */
export function ensureSlideIds(slides: CarouselSlide[]): CarouselSlide[] {
  return slides.map((slide, i) => ({
    ...slide,
    id: slide.id || createSlideId(),
    index: slide.index || i + 1,
  }));
}
