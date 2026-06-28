'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import {
  getIdeas,
  getIdeasByBrand,
  getIdea,
  getProjects,
  getProjectsByBrand,
  getProject,
} from './content-ideas.service';

// --- Content Ideas ---

export function useIdeas() {
  const load = useCallback(() => getIdeas(), []);
  return useSWR('content-ideas', load, { revalidateOnFocus: false });
}

export function useIdeasByBrand(brandId?: string) {
  const load = useCallback(() => getIdeasByBrand(brandId!), [brandId]);
  return useSWR(brandId ? `content-ideas-brand-${brandId}` : null, load, {
    revalidateOnFocus: false,
  });
}

export function useIdea(id?: string) {
  const load = useCallback(() => getIdea(id!), [id]);
  return useSWR(id ? `content-idea-${id}` : null, load, {
    revalidateOnFocus: false,
  });
}

export function mutateIdeas() {
  return mutate('content-ideas');
}

export function mutateIdeasByBrand(brandId: string) {
  return mutate(`content-ideas-brand-${brandId}`);
}

export function mutateIdea(id: string) {
  return mutate(`content-idea-${id}`);
}

// --- Carousel Projects ---

export function useProjects() {
  const load = useCallback(() => getProjects(), []);
  return useSWR('carousel-projects', load, { revalidateOnFocus: false });
}

export function useProjectsByBrand(brandId?: string) {
  const load = useCallback(() => getProjectsByBrand(brandId!), [brandId]);
  return useSWR(brandId ? `carousel-projects-brand-${brandId}` : null, load, {
    revalidateOnFocus: false,
  });
}

export function useProject(id?: string) {
  const load = useCallback(() => getProject(id!), [id]);
  return useSWR(id ? `carousel-project-${id}` : null, load, {
    revalidateOnFocus: false,
  });
}

export function mutateProjects() {
  return mutate('carousel-projects');
}

export function mutateProjectsByBrand(brandId: string) {
  return mutate(`carousel-projects-brand-${brandId}`);
}

export function mutateProject(id: string) {
  return mutate(`carousel-project-${id}`);
}
