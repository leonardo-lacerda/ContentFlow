'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { getJobs } from './generation-jobs.service';

export function useJobs() {
  const load = useCallback(() => getJobs(), []);
  return useSWR('generation-jobs', load, { refreshInterval: 5000 });
}

export function mutateJobs() {
  return mutate('generation-jobs');
}
