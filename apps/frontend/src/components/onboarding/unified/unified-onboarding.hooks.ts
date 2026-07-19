'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import type {
  OnboardingProgress,
  OnboardingStatus,
} from './unified-onboarding.types';

export function useOnboardingStatus() {
  const fetch = useFetch();

  const loader = useCallback(async () => {
    const res = await fetch('/settings/onboarding');
    if (!res.ok) {
      return { completedAt: null, progress: null } as OnboardingStatus;
    }
    return (await res.json()) as OnboardingStatus;
  }, [fetch]);

  const { data, error, isLoading, mutate } = useSWR(
    'settings-onboarding',
    loader,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const patch = useCallback(
    async (body: {
      progress?: Partial<OnboardingProgress>;
      complete?: boolean;
      reset?: boolean;
    }) => {
      const res = await fetch('/settings/onboarding', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update onboarding');
      }
      const next = (await res.json()) as OnboardingStatus;
      await mutate(next, { revalidate: false });
      return next;
    },
    [fetch, mutate]
  );

  return {
    status: data,
    error,
    isLoading,
    mutate,
    patch,
  };
}

export async function dualWriteCompanyProfile(
  _fetch: (url: string, options?: any) => Promise<Response>,
  _data: Record<string, unknown>
) {
  // ContentFlow v1: Company Profile dual-write desligado — Brand DNA é a fonte da verdade
  return { skipped: true as const };
}
