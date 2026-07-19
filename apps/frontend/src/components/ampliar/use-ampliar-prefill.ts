'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AmpliarPrefill } from './ampliar.types';

/**
 * Lê query de handoff Ampliar (Swipe / carrossel / estúdio).
 */
export function useAmpliarPrefill(): AmpliarPrefill {
  const searchParams = useSearchParams();

  return useMemo(() => {
    const brandId = searchParams.get('brandId')?.trim() || '';
    const ideaId = searchParams.get('ideaId')?.trim() || '';
    const projectId = searchParams.get('projectId')?.trim() || '';
    const topic = searchParams.get('topic')?.trim() || '';
    const hook = searchParams.get('hook')?.trim() || '';
    const angle = searchParams.get('angle')?.trim() || '';
    const goal = searchParams.get('goal')?.trim() || '';
    const objective = searchParams.get('objective')?.trim() || '';
    const emailType = searchParams.get('type')?.trim() || '';
    const format = searchParams.get('format')?.trim() || '';
    const duration = searchParams.get('duration')?.trim() || '';
    const from = searchParams.get('from')?.trim() || '';

    const hasSource = Boolean(
      ideaId || projectId || topic || hook || from === 'swipe' || from === 'carousel'
    );

    return {
      brandId: brandId || undefined,
      ideaId: ideaId || undefined,
      projectId: projectId || undefined,
      topic: topic || undefined,
      hook: hook || undefined,
      angle: angle || undefined,
      goal: goal || undefined,
      objective: objective || undefined,
      emailType: emailType || undefined,
      format: format || undefined,
      duration: duration || undefined,
      from: from || undefined,
      hasSource,
    };
  }, [searchParams]);
}

export function buildContextFromPrefill(prefill: AmpliarPrefill): string {
  const parts: string[] = [];
  if (prefill.topic) parts.push(`Tema: ${prefill.topic}`);
  if (prefill.hook) parts.push(`Hook: ${prefill.hook}`);
  if (prefill.angle) parts.push(`Ângulo: ${prefill.angle}`);
  if (prefill.goal) parts.push(`Objetivo: ${prefill.goal}`);
  return parts.join('\n');
}
