'use client';

import { loadVars } from '@gitroom/react/helpers/variable.context';

const BASE = '/carousel-performance';

async function api(path: string, options?: RequestInit) {
  const { backendUrl } = loadVars();
  const res = await fetch(backendUrl + path, {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.error || 'API error');
  }
  return res.json();
}

export async function getDashboard(brandProfileId?: string) {
  const params = brandProfileId ? `?brandProfileId=${brandProfileId}` : '';
  return api(`${BASE}/dashboard${params}`);
}

export async function getPerformance(filters?: {
  brandProfileId?: string;
  platform?: string;
  startDate?: string;
  endDate?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.brandProfileId) params.set('brandProfileId', filters.brandProfileId);
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  const qs = params.toString();
  return api(`${BASE}${qs ? '?' + qs : ''}`);
}

export async function getBrandPerformance(brandId: string) {
  return api(`${BASE}/brand/${brandId}`);
}

export async function getTopPerformers(limit: number = 10) {
  return api(`${BASE}/top-performers?limit=${limit}`);
}

export async function getPerformanceTrend(brandId: string, days: number = 30) {
  return api(`${BASE}/trend/${brandId}?days=${days}`);
}

export async function recordMetrics(data: any) {
  return api(BASE, { method: 'POST', body: JSON.stringify(data) });
}

/**
 * Batch record metrics for multiple carousels.
 */
export async function recordMetricsBatch(items: any[]) {
  return api(`${BASE}/batch`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

/**
 * Get platform-specific scoring weights.
 */
export async function getPlatformWeights(platform?: string) {
  const params = platform ? `?platform=${platform}` : '';
  return api(`${BASE}/weights${params}`);
}

/**
 * Get recommendations for a brand.
 */
export async function getRecommendations(
  brandId: string,
  options?: { platform?: string; limit?: number }
) {
  const params = new URLSearchParams();
  if (options?.platform) params.set('platform', options.platform);
  if (options?.limit) params.set('limit', String(options.limit));
  const qs = params.toString();
  return api(`${BASE}/recommendations/${brandId}${qs ? '?' + qs : ''}`);
}
