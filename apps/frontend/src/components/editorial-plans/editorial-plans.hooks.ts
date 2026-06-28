'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { getPlans, getSlots } from './editorial-plans.service';

export function useEditorialPlans() {
  const load = useCallback(() => getPlans(), []);
  return useSWR('editorial-plans', load, { revalidateOnFocus: false });
}

export function useEditorialSlots(planId?: string) {
  const load = useCallback(() => getSlots(planId!), [planId]);
  return useSWR(
    planId ? `editorial-slots-${planId}` : null,
    load,
    { revalidateOnFocus: false }
  );
}

export function mutateEditorialPlans() {
  return mutate('editorial-plans');
}

export function mutateEditorialSlots(planId: string) {
  return mutate(`editorial-slots-${planId}`);
}
