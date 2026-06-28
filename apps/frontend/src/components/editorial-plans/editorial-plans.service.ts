'use client';

import { loadVars } from '@gitroom/react/helpers/variable.context';

const BASE = '/editorial-plans';

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

export async function getPlans() {
  return api(BASE);
}

export async function getPlansByBrand(brandId: string) {
  return api(`${BASE}/brand/${brandId}`);
}

export async function getPlan(id: string) {
  return api(`${BASE}/${id}`);
}

export async function createPlan(data: any) {
  return api(BASE, { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePlan(id: string, data: any) {
  return api(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deletePlan(id: string) {
  return api(`${BASE}/${id}`, { method: 'DELETE' });
}

export async function generateCalendar(id: string, days?: number) {
  return api(`${BASE}/${id}/generate-calendar`, {
    method: 'POST',
    body: JSON.stringify({ days }),
  });
}

export async function getSlots(planId: string) {
  return api(`${BASE}/${planId}/slots`);
}

export async function updateSlot(slotId: string, data: any) {
  return api(`${BASE}/slots/${slotId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
