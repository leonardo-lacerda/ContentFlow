import type { GenerateAdsParams, AdCreativeBatch, SavedAdCreative, AdTemplateSummary } from './ads.types';

const BASE = '/ad-creatives';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
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

export async function generateAds(data: GenerateAdsParams): Promise<AdCreativeBatch> {
  return api<AdCreativeBatch>(BASE + '/generate', { method: 'POST', body: JSON.stringify(data) });
}

export async function saveAds(data: {
  ads: AdCreativeBatch;
  brandProfileId: string;
  contentIdeaId?: string;
  carouselProjectId?: string;
  generationJobId?: string;
}): Promise<SavedAdCreative[]> {
  return api<SavedAdCreative[]>(BASE + '/save', { method: 'POST', body: JSON.stringify(data) });
}

export async function listAds(filters?: {
  platform?: string;
  type?: string;
  status?: string;
  brandProfileId?: string;
}): Promise<SavedAdCreative[]> {
  const params = new URLSearchParams();
  if (filters?.platform) params.set('platform', filters.platform);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.brandProfileId) params.set('brandProfileId', filters.brandProfileId);
  const qs = params.toString();
  return api<SavedAdCreative[]>(BASE + (qs ? `?${qs}` : ''));
}

export async function getAd(id: string): Promise<SavedAdCreative> {
  return api<SavedAdCreative>(`${BASE}/${id}`);
}

export async function updateAd(id: string, data: Partial<SavedAdCreative>): Promise<SavedAdCreative> {
  return api<SavedAdCreative>(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteAd(id: string): Promise<void> {
  await api<void>(`${BASE}/${id}`, { method: 'DELETE' });
}

export async function exportAd(adCreativeId: string, format: string): Promise<any> {
  return api<any>(BASE + '/export', {
    method: 'POST',
    body: JSON.stringify({ adCreativeId, format }),
  });
}

export async function getAdTemplates(filters?: {
  category?: string;
  objective?: string;
  platform?: string;
}): Promise<AdTemplateSummary[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.objective) params.set('objective', filters.objective);
  if (filters?.platform) params.set('platform', filters.platform);
  const qs = params.toString();
  return api<AdTemplateSummary[]>(BASE + '/templates' + (qs ? `?${qs}` : ''));
}

export async function getAdTemplatesSummary(): Promise<AdTemplateSummary[]> {
  return api<AdTemplateSummary[]>(BASE + '/templates/summary');
}
