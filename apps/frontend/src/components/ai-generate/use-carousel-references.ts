'use client';

import { ChangeEvent, useCallback } from 'react';
import type {
  CompanyInspiration,
  CompanyProfile,
  ReferenceImage,
} from './ai-generate-images.types';
import { companyBrandReferences, resizeImageBlobToDataUrl } from './ai-generate-images.utils';
import { aiGenerateImagesApi } from './ai-generate-images.api';

export interface UseCarouselReferencesParams {
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  referenceDataUrlCache: React.MutableRefObject<Map<string, string>>;
  companyProfile: CompanyProfile | null;
  setCompanyProfiles: React.Dispatch<React.SetStateAction<CompanyProfile[]>>;
  setSavingReferenceLibrary: React.Dispatch<React.SetStateAction<string>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  fetch: ReturnType<typeof import('@gitroom/helpers/utils/custom.fetch').useFetch>;
}

export interface UseCarouselReferencesReturn {
  uploadReferenceImages: (event: ChangeEvent<HTMLInputElement>) => void;
  toggleReferenceSelection: (id: string) => void;
  toggleReferenceFavorite: (id: string) => void;
  persistReferenceInCompanyLibrary: (
    image: ReferenceImage,
    overrides?: Partial<CompanyInspiration>
  ) => Promise<void>;
  approveReferenceForCompany: (image: ReferenceImage) => void;
  removeReferenceImage: (id: string) => void;
  syncBrandReferences: (company?: CompanyProfile | null) => void;
}

export function useCarouselReferences({
  referenceImages,
  setReferenceImages,
  referenceDataUrlCache,
  companyProfile,
  setCompanyProfiles,
  setSavingReferenceLibrary,
  setError,
  fetch,
}: UseCarouselReferencesParams): UseCarouselReferencesReturn {
  const syncBrandReferences = useCallback(
    (company?: CompanyProfile | null) => {
      const brandRefs = companyBrandReferences(company);
      setReferenceImages((current) => [
        ...brandRefs,
        ...current.filter(
          (image) => image.source !== 'brand' && image.source !== 'company'
        ),
      ]);
    },
    [setReferenceImages]
  );

  const uploadReferenceImages = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []).filter(
      (file) => file.type.startsWith('image/') && file.size <= 8 * 1024 * 1024
    );

    const resizedFiles = await Promise.all(
      files.slice(0, 12).map(async (file) => ({
        file,
        src: await resizeImageBlobToDataUrl(file, 1024, 0.72),
      }))
    );

    setReferenceImages((current) => {
      let selectedCount = current.filter((image) => image.selected).length;
      const additions = resizedFiles
        .filter((item) => item.src)
        .map(({ file, src }) => {
          const selected = selectedCount < 3;
          if (selected) {
            selectedCount += 1;
          }

          return {
            id: `${file.name}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`,
            name: file.name,
            src,
            source: 'upload' as const,
            favorite: false,
            selected,
            approved: false,
            category: 'upload',
            description: '',
          };
        });

      additions.forEach((image) => {
        referenceDataUrlCache.current.set(image.id, image.src);
      });

      return [...current, ...additions];
    });

    event.target.value = '';
  };

  const toggleReferenceSelection = (id: string) => {
    setReferenceImages((current) => {
      const selectedCount = current.filter((image) => image.selected).length;

      return current.map((image) => {
        if (image.id !== id) {
          return image;
        }

        if (!image.selected && selectedCount >= 3) {
          return image;
        }

        return { ...image, selected: !image.selected };
      });
    });
  };

  const persistReferenceInCompanyLibrary = async (
    image: ReferenceImage,
    overrides: Partial<CompanyInspiration> = {}
  ) => {
    if (!companyProfile?.id || image.source === 'brand') {
      return;
    }

    setSavingReferenceLibrary(image.id);
    setError('');

    const rawId = image.id.replace(`company-${companyProfile.id}-`, '');
    const library = companyProfile.inspirationLibrary || [];
    const previous = library.find(
      (item) =>
        item.id === rawId ||
        item.src === image.src ||
        item.name === image.name
    );
    const nextItem: CompanyInspiration = {
      id: previous?.id || rawId || `inspiration-${Date.now()}`,
      name: image.name,
      src: image.src,
      source: image.source,
      category: overrides.category || image.category || previous?.category || 'geral',
      favorite:
        typeof overrides.favorite === 'boolean'
          ? overrides.favorite
          : image.favorite || previous?.favorite || false,
      approved:
        typeof overrides.approved === 'boolean'
          ? overrides.approved
          : image.approved || previous?.approved || false,
      description: overrides.description || image.description || previous?.description || '',
    };
    const nextLibrary = previous
      ? library.map((item) => (item.id === previous.id ? nextItem : item))
      : [nextItem, ...library].slice(0, 80);
    const nextCompany = {
      ...companyProfile,
      inspirationLibrary: nextLibrary,
    };

    try {
      const { ok, data: savedCompany, message } =
        await aiGenerateImagesApi.saveCompanyProfile(fetch, nextCompany);
      if (!ok || !savedCompany) {
        setError(message || 'Não foi possível salvar a inspiração na empresa.');
        return;
      }

      setCompanyProfiles((current) =>
        current.map((company) =>
          company.id === savedCompany.id ? savedCompany : company
        )
      );
      setReferenceImages((current) =>
        current.map((item) =>
          item.id === image.id
            ? {
                ...item,
                favorite: nextItem.favorite,
                approved: nextItem.approved,
                category: nextItem.category,
                description: nextItem.description,
              }
            : item
        )
      );
    } catch (err) {
      setError('Não foi possível salvar a biblioteca da empresa.');
    } finally {
      setSavingReferenceLibrary('');
    }
  };

  const toggleReferenceFavorite = (id: string) => {
    const image = referenceImages.find((item) => item.id === id);
    const nextFavorite = !image?.favorite;
    setReferenceImages((current) =>
      current.map((item) =>
        item.id === id ? { ...item, favorite: nextFavorite } : item
      )
    );

    if (image && companyProfile) {
      persistReferenceInCompanyLibrary(image, {
        favorite: nextFavorite,
        approved: image.approved,
      });
    }
  };

  const approveReferenceForCompany = (image: ReferenceImage) => {
    persistReferenceInCompanyLibrary(image, {
      approved: !image.approved,
      favorite: true,
    });
  };

  const removeReferenceImage = (id: string) => {
    referenceDataUrlCache.current.delete(id);
    setReferenceImages((current) =>
      current.filter((image) => image.id !== id || image.source === 'global')
    );
  };

  return {
    uploadReferenceImages,
    toggleReferenceSelection,
    toggleReferenceFavorite,
    persistReferenceInCompanyLibrary,
    approveReferenceForCompany,
    removeReferenceImage,
    syncBrandReferences,
  };
}
