'use client';

import { loadVars } from '@gitroom/react/helpers/variable.context';

const BASE = '/brands';

async function api(path: string, options?: RequestInit) {
  const vars = loadVars();
  const backendUrl = vars?.backendUrl || '';
  if (!backendUrl) {
    throw new Error('Backend URL not configured');
  }
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
  // Nest may return an empty body for null — treat as null instead of JSON parse error
  const text = await res.text();
  if (!text || !text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function getBrands() {
  return api(BASE);
}

export async function getSelectedBrand() {
  return api(`${BASE}/selected`);
}

export async function getBrand(id: string) {
  return api(`${BASE}/${id}`);
}

export async function createBrand(data: {
  name: string;
  website?: string;
  industry?: string;
}) {
  return api(BASE, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateBrand(id: string, data: Record<string, unknown>) {
  return api(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteBrand(id: string) {
  return api(`${BASE}/${id}`, { method: 'DELETE' });
}

export async function selectBrand(id: string) {
  return api(`${BASE}/${id}/select`, { method: 'POST' });
}

export async function analyzeBrand(id: string, url: string) {
  return api(`${BASE}/${id}/analyze`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export async function getDnaSnapshots(id: string) {
  return api(`${BASE}/${id}/dna`);
}

export async function getLatestDna(id: string) {
  return api(`${BASE}/${id}/dna/latest`);
}

export async function createDnaSnapshot(
  id: string,
  data: Record<string, unknown>
) {
  return api(`${BASE}/${id}/dna`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAssets(id: string) {
  return api(`${BASE}/${id}/assets`);
}

export async function createAsset(id: string, data: Record<string, unknown>) {
  return api(`${BASE}/${id}/assets`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function approveAsset(brandId: string, assetId: string) {
  return api(`${BASE}/${brandId}/assets/${assetId}/approve`, {
    method: 'POST',
  });
}

export async function deleteAsset(brandId: string, assetId: string) {
  return api(`${BASE}/${brandId}/assets/${assetId}`, {
    method: 'DELETE',
  });
}
