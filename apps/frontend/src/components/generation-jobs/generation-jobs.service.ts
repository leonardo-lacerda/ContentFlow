'use client';

import { loadVars } from '@gitroom/react/helpers/variable.context';

const BASE = '/generation-jobs';

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

export async function getJobs() {
  return api(BASE);
}

export async function getJob(id: string) {
  return api(`${BASE}/${id}`);
}

export async function createJob(data: {
  brandProfileId?: string;
  carouselProjectId?: string;
  type: string;
  idempotencyKey?: string;
  model?: string;
  provider?: string;
  promptVersion?: string;
  schemaVersion?: string;
  costEstimate?: number;
}) {
  return api(BASE, { method: 'POST', body: JSON.stringify(data) });
}

export async function cancelJob(id: string) {
  return api(`${BASE}/${id}/cancel`, { method: 'PATCH' });
}

export async function getActiveJobCount() {
  return api(`${BASE}/active/count`);
}
