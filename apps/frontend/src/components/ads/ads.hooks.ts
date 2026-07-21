'use client';

import useSWR from 'swr';
import { listAds, getAdTemplates } from './ads.service';
import type { SavedAdCreative, AdTemplateSummary } from './ads.types';

export function useSavedAds(filters?: { brandProfileId?: string; platform?: string; status?: string }) {
  const key = filters?.brandProfileId
    ? ['saved-ads', filters.brandProfileId, filters.platform || '', filters.status || '']
    : null;

  const { data, error, isLoading, mutate } = useSWR<SavedAdCreative[]>(
    key,
    () => listAds(filters),
    { revalidateOnFocus: false }
  );

  return {
    ads: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useAdTemplates() {
  const { data, error, isLoading } = useSWR<AdTemplateSummary[]>(
    'ad-templates',
    () => getAdTemplates(),
    { revalidateOnFocus: false }
  );

  return {
    templates: data ?? [],
    isLoading,
    isError: !!error,
  };
}
