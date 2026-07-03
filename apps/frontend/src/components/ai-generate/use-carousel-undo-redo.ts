'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CarouselPlan, SlideImageResult } from './ai-generate-images.types';
import { createSnapshot, pushSnapshot, restoreSnapshot } from './slide-operations';

export interface UseCarouselUndoRedoParams {
  plan: CarouselPlan | null;
  slideImages: Record<string, SlideImageResult>;
  setPlan: React.Dispatch<React.SetStateAction<CarouselPlan | null>>;
  setSlideImages: React.Dispatch<React.SetStateAction<Record<string, SlideImageResult>>>;
}

export interface UseCarouselUndoRedoReturn {
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Reset both stacks (e.g. when loading a project). */
  resetHistory: () => void;
}

export function useCarouselUndoRedo({
  plan,
  slideImages,
  setPlan,
  setSlideImages,
}: UseCarouselUndoRedoParams): UseCarouselUndoRedoReturn {
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const saveSnapshot = useCallback(() => {
    const snapshot = createSnapshot(plan, slideImages);
    setUndoStack((stack) => pushSnapshot(stack, snapshot));
    setRedoStack([]);
  }, [plan, slideImages]);

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const raw = stack[stack.length - 1];
      setRedoStack((redo) => {
        const snapshot = createSnapshot(plan, slideImages);
        return [...redo, snapshot];
      });
      const { plan: prevPlan, slideImages: prevImages } = restoreSnapshot(raw);
      setPlan(prevPlan);
      setSlideImages(prevImages);
      return stack.slice(0, -1);
    });
  }, [plan, slideImages, setPlan, setSlideImages]);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const raw = stack[stack.length - 1];
      setUndoStack((undo) => {
        const snapshot = createSnapshot(plan, slideImages);
        return [...undo, snapshot];
      });
      const { plan: nextPlan, slideImages: nextImages } = restoreSnapshot(raw);
      setPlan(nextPlan);
      setSlideImages(nextImages);
      return stack.slice(0, -1);
    });
  }, [plan, slideImages, setPlan, setSlideImages]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const resetHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // Keyboard shortcuts for undo (Ctrl+Z) and redo (Ctrl+Shift+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return { saveSnapshot, undo, redo, canUndo, canRedo, resetHistory };
}
