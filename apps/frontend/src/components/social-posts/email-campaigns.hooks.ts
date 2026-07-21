'use client';

import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { emailCampaignsApi } from './email-campaigns.api';
import type { EmailCampaign } from './email-campaigns.types';

export function useEmailCampaigns(type?: string) {
  const fetch = useFetch();

  const { data, error, isLoading, mutate } = useSWR<EmailCampaign[]>(
    ['email-campaigns', type || 'all'],
    () => emailCampaignsApi.list(fetch, type)
  );

  return {
    campaigns: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useEmailCampaign(id: string | null) {
  const fetch = useFetch();

  const { data, error, isLoading, mutate } = useSWR<EmailCampaign>(
    id ? [`email-campaign`, id] : null,
    () => emailCampaignsApi.getById(fetch, id!)
  );

  return {
    campaign: data ?? null,
    isLoading,
    isError: !!error,
    mutate,
  };
}
