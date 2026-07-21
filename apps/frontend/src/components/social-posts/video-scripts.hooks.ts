'use client';

import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { videoScriptsApi } from './video-scripts.api';
import type { VideoProject } from './video-scripts.types';

export function useVideoScripts(brandId?: string) {
  const fetch = useFetch();

  const { data, error, isLoading, mutate } = useSWR<VideoProject[]>(
    brandId ? [`/video-scripts/brand`, brandId] : null,
    () => videoScriptsApi.listByBrand(fetch, brandId!)
  );

  return {
    projects: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
