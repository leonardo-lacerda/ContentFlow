'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import {
  getDashboard,
  getPerformance,
  getBrandPerformance,
  getTopPerformers,
  getPerformanceTrend,
} from './carousel-performance.service';

export function useCarouselDashboard(brandProfileId?: string) {
  const load = useCallback(() => getDashboard(brandProfileId), [brandProfileId]);
  return useSWR(
    brandProfileId ? `carousel-dashboard-${brandProfileId}` : 'carousel-dashboard',
    load,
    { revalidateOnFocus: false }
  );
}

export function useCarouselPerformance(filters?: {
  brandProfileId?: string;
  platform?: string;
  startDate?: string;
  endDate?: string;
}) {
  const load = useCallback(() => getPerformance(filters), [JSON.stringify(filters)]);
  return useSWR(`carousel-performance-${JSON.stringify(filters || {})}`, load, {
    revalidateOnFocus: false,
  });
}

export function useBrandCarouselPerformance(brandId?: string) {
  const load = useCallback(() => getBrandPerformance(brandId!), [brandId]);
  return useSWR(
    brandId ? `carousel-brand-${brandId}` : null,
    load,
    { revalidateOnFocus: false }
  );
}

export function useCarouselTopPerformers(limit: number = 10) {
  const load = useCallback(() => getTopPerformers(limit), [limit]);
  return useSWR('carousel-top-performers', load, { revalidateOnFocus: false });
}

export function useCarouselTrend(brandId?: string, days: number = 30) {
  const load = useCallback(() => getPerformanceTrend(brandId!, days), [brandId, days]);
  return useSWR(
    brandId ? `carousel-trend-${brandId}-${days}` : null,
    load,
    { revalidateOnFocus: false }
  );
}

export function mutateCarouselDashboard() {
  return mutate('carousel-dashboard');
}

export function mutateCarouselPerformance() {
  return mutate((key: string) => key.startsWith('carousel-performance-'));
}
