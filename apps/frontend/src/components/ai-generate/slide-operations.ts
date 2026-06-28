/**
 * Pure slide CRUD helpers for the carousel planner.
 *
 * Every function takes the current plan (or slides array) and returns a
 * **new** object — never mutates the input.  The caller is responsible for
 * persisting the result via React state setters.
 */

import type {
  CarouselPlan,
  CarouselSlide,
  SlideImageResult,
} from './ai-generate-images.types';
import { MAX_CAROUSEL_SLIDES, MIN_CAROUSEL_SLIDES } from './ai-generate-images.constants';

/* ------------------------------------------------------------------ */
/*  Snapshot helpers                                                   */
/* ------------------------------------------------------------------ */

export interface SlideSnapshot {
  plan: CarouselPlan | null;
  slideImages: Record<number, SlideImageResult>;
}

const MAX_UNDO = 50;

/**
 * Deep-clone the current plan + slideImages into a JSON string that can be
 * pushed onto the undo stack.  Using JSON round-trip guarantees a truly
 * independent copy without importing structuredClone for older targets.
 */
export function createSnapshot(
  plan: CarouselPlan | null,
  slideImages: Record<number, SlideImageResult>
): string {
  const snapshot: SlideSnapshot = { plan, slideImages };
  return JSON.stringify(snapshot);
}

/**
 * Deserialize a snapshot string back into its plan + slideImages pair.
 */
export function restoreSnapshot(raw: string): SlideSnapshot {
  return JSON.parse(raw) as SlideSnapshot;
}

/** Push a snapshot onto a stack, capping at `MAX_UNDO` entries. */
export function pushSnapshot(stack: string[], snapshot: string): string[] {
  return [...stack.slice(-(MAX_UNDO - 1)), snapshot];
}

/* ------------------------------------------------------------------ */
/*  Slide CRUD (operate on a CarouselPlan)                             */
/* ------------------------------------------------------------------ */

/** Create a blank slide object with the given index. */
export function blankSlide(index: number): CarouselSlide {
  return {
    index,
    headline: '',
    body: '',
    cta: '',
    imagePrompt: '',
    altText: '',
  };
}

/** Re-number slide indices after a mutation. */
export function reindex(slides: CarouselSlide[]): CarouselSlide[] {
  return slides.map((s, i) => ({ ...s, index: i }));
}

/**
 * Add a new empty slide **after** `afterIndex`.
 * Returns `null` when the plan is at the maximum slide limit.
 */
export function addSlideToPlan(
  plan: CarouselPlan | null,
  afterIndex: number
): CarouselPlan | null {
  if (!plan || plan.slides.length >= MAX_CAROUSEL_SLIDES) return plan;
  const slides = [...plan.slides];
  slides.splice(afterIndex + 1, 0, blankSlide(slides.length));
  return { ...plan, slides: reindex(slides) };
}

/**
 * Remove the slide at `index`.
 * Returns `null` when there is only one slide left (minimum invariant).
 */
export function removeSlideFromPlan(
  plan: CarouselPlan | null,
  index: number
): CarouselPlan | null {
  if (!plan || plan.slides.length <= MIN_CAROUSEL_SLIDES) return plan;
  const slides = plan.slides.filter((_, i) => i !== index);
  return { ...plan, slides: reindex(slides) };
}

/**
 * Duplicate the slide at `index`, inserting the copy right after it.
 */
export function duplicateSlideInPlan(
  plan: CarouselPlan | null,
  index: number
): CarouselPlan | null {
  if (!plan || plan.slides.length >= MAX_CAROUSEL_SLIDES) return plan;
  const original = plan.slides[index];
  if (!original) return plan;
  const copy: CarouselSlide = {
    ...original,
    index: plan.slides.length, // temporary — reindex will fix it
  };
  const slides = [...plan.slides];
  slides.splice(index + 1, 0, copy);
  return { ...plan, slides: reindex(slides) };
}

/**
 * Move the slide from `fromIndex` to `toIndex`.
 * Returns `null` when the target index is out of bounds.
 */
export function moveSlideInPlan(
  plan: CarouselPlan | null,
  fromIndex: number,
  toIndex: number
): CarouselPlan | null {
  if (!plan) return null;
  if (toIndex < 0 || toIndex >= plan.slides.length) return plan;
  const slides = [...plan.slides];
  const [moved] = slides.splice(fromIndex, 1);
  slides.splice(toIndex, 0, moved);
  return { ...plan, slides: reindex(slides) };
}
