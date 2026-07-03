'use client';

import { useCallback } from 'react';
import type { CarouselPlan, CarouselSlide, SlideImageResult } from './ai-generate-images.types';
import {
  addSlideToPlan,
  duplicateSlideInPlan,
  moveSlideInPlan,
  removeSlideFromPlan,
} from './slide-operations';

export interface UseCarouselSlideOpsParams {
  saveSnapshot: () => void;
  setPlan: React.Dispatch<React.SetStateAction<CarouselPlan | null>>;
  setSlideImages: React.Dispatch<React.SetStateAction<Record<string, SlideImageResult>>>;
  slideHistory: Record<string, CarouselSlide[]>;
  slideImageHistory: Record<string, SlideImageResult[]>;
  setSavedCarouselCount: React.Dispatch<React.SetStateAction<number>>;
}

export interface UseCarouselSlideOpsReturn {
  updateSlide: (slideId: string, field: keyof CarouselSlide, value: string) => void;
  addSlide: (afterIndex: number) => void;
  removeSlide: (index: number) => void;
  duplicateSlide: (index: number) => void;
  moveSlide: (fromIndex: number, toIndex: number) => void;
  restoreSlideVersion: (slideId: string, versionIndex: number) => void;
  restoreImageVersion: (slideId: string, versionIndex: number) => void;
}

export function useCarouselSlideOps({
  saveSnapshot,
  setPlan,
  setSlideImages,
  slideHistory,
  slideImageHistory,
  setSavedCarouselCount,
}: UseCarouselSlideOpsParams): UseCarouselSlideOpsReturn {
  const updateSlide = (
    slideId: string,
    field: keyof CarouselSlide,
    value: string
  ) => {
    setPlan((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        slides: current.slides.map((slide) =>
          slide.id === slideId ? { ...slide, [field]: value } : slide
        ),
      };
    });
  };

  const addSlide = useCallback(
    (afterIndex: number) => {
      saveSnapshot();
      setPlan((current) => addSlideToPlan(current, afterIndex));
    },
    [saveSnapshot]
  );

  const removeSlide = useCallback(
    (index: number) => {
      saveSnapshot();
      setPlan((current) => removeSlideFromPlan(current, index));
    },
    [saveSnapshot]
  );

  const duplicateSlide = useCallback(
    (index: number) => {
      saveSnapshot();
      setPlan((current) => duplicateSlideInPlan(current, index));
    },
    [saveSnapshot]
  );

  const moveSlide = useCallback(
    (fromIndex: number, toIndex: number) => {
      saveSnapshot();
      setPlan((current) => moveSlideInPlan(current, fromIndex, toIndex));
    },
    [saveSnapshot]
  );

  const restoreSlideVersion = useCallback(
    (slideId: string, versionIndex: number) => {
      const version = slideHistory[slideId]?.[versionIndex];
      if (!version) {
        return;
      }

      setPlan((current) =>
        current
          ? {
              ...current,
              slides: current.slides.map((slide) =>
                slide.id === slideId ? version : slide
              ),
            }
          : current
      );
      setSlideImages((current) => ({ ...current, [slideId]: {} }));
    },
    [slideHistory, setPlan, setSlideImages]
  );

  const restoreImageVersion = useCallback(
    (slideId: string, versionIndex: number) => {
      const version = slideImageHistory[slideId]?.[versionIndex];
      if (!version) {
        return;
      }

      setSlideImages((current) => ({
        ...current,
        [slideId]: version,
      }));
      setSavedCarouselCount(0);
    },
    [slideImageHistory, setSlideImages, setSavedCarouselCount]
  );

  return {
    updateSlide,
    addSlide,
    removeSlide,
    duplicateSlide,
    moveSlide,
    restoreSlideVersion,
    restoreImageVersion,
  };
}
