'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import {
  getBrands,
  getSelectedBrand,
  getBrand,
  getDnaSnapshots,
  getLatestDna,
  getAssets,
} from './brand-dna.service';

export function useBrands() {
  const load = useCallback(() => getBrands(), []);
  return useSWR('brands', load, { revalidateOnFocus: false });
}

export function useBrand(id?: string) {
  const load = useCallback(() => getBrand(id!), [id]);
  return useSWR(id ? `brand-${id}` : null, load, { revalidateOnFocus: false });
}

export function useSelectedBrand() {
  const load = useCallback(() => getSelectedBrand(), []);
  return useSWR('brand-selected', load, { revalidateOnFocus: false });
}

export function useDnaSnapshots(brandId?: string) {
  const load = useCallback(() => getDnaSnapshots(brandId!), [brandId]);
  return useSWR(brandId ? `dna-snapshots-${brandId}` : null, load, {
    revalidateOnFocus: false,
  });
}

export function useLatestDna(brandId?: string) {
  const load = useCallback(() => getLatestDna(brandId!), [brandId]);
  return useSWR(brandId ? `dna-latest-${brandId}` : null, load, {
    revalidateOnFocus: false,
  });
}

export function useAssets(brandId?: string) {
  const load = useCallback(() => getAssets(brandId!), [brandId]);
  return useSWR(brandId ? `assets-${brandId}` : null, load, {
    revalidateOnFocus: false,
  });
}

export function mutateBrands() {
  return mutate('brands');
}

export function mutateBrand(id: string) {
  return mutate(`brand-${id}`);
}
