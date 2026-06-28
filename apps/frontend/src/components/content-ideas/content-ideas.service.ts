'use client';

import { loadVars } from '@gitroom/react/helpers/variable.context';

const IDEAS_BASE = '/content-ideas';
const PROJECTS_BASE = '/carousel-projects';

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

// --- Content Ideas ---

export async function getIdeas() {
  return api(IDEAS_BASE);
}

export async function getIdeasByBrand(brandId: string) {
  return api(`${IDEAS_BASE}/brand/${brandId}`);
}

export async function getIdea(id: string) {
  return api(`${IDEAS_BASE}/${id}`);
}

export async function createIdea(data: {
  brandProfileId: string;
  title: string;
  hook: string;
  goal: string;
  angle: string;
  templateSuggestion?: string;
  platformSuggestion?: string;
  score?: number;
}) {
  return api(IDEAS_BASE, { method: 'POST', body: JSON.stringify(data) });
}

export async function approveIdea(id: string) {
  return api(`${IDEAS_BASE}/${id}/approve`, { method: 'PATCH' });
}

export async function rejectIdea(id: string, reason?: string) {
  return api(`${IDEAS_BASE}/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export async function saveIdea(id: string) {
  return api(`${IDEAS_BASE}/${id}/save`, { method: 'PATCH' });
}

export async function archiveIdea(id: string) {
  return api(`${IDEAS_BASE}/${id}/archive`, { method: 'PATCH' });
}

// --- Carousel Projects ---

export async function getProjects() {
  return api(PROJECTS_BASE);
}

export async function getProjectsByBrand(brandId: string) {
  return api(`${PROJECTS_BASE}/brand/${brandId}`);
}

export async function getProject(id: string) {
  return api(`${PROJECTS_BASE}/${id}`);
}

export async function createProject(data: {
  brandProfileId: string;
  contentIdeaId?: string;
  title: string;
  slides: any;
  caption?: string;
  hashtags?: string[];
  metadata?: any;
}) {
  return api(PROJECTS_BASE, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateProject(id: string, data: Record<string, unknown>) {
  return api(`${PROJECTS_BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function updateProjectStatus(id: string, status: string) {
  return api(`${PROJECTS_BASE}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
