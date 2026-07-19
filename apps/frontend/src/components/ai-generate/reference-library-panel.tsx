'use client';

import {
  ChangeEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Heart,
  Image as ImageIcon,
  Search,
  Star,
  Upload,
  X,
  ChevronDown,
  Grid3x3,
} from 'lucide-react';
import type { ReferenceImage } from './ai-generate-images.types';
import { REFERENCE_PAGE_SIZE } from './ai-generate-images.constants';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
type ReferenceLibraryPanelProps = {
  referenceImages: ReferenceImage[];
  visibleReferenceImages: ReferenceImage[];
  referenceDisplayLimit: number;
  referenceCategoryFilter: string;
  setReferenceCategoryFilter: (filter: string) => void;
  toggleReferenceSelection: (refId: string) => void;
  toggleReferenceFavorite: (refId: string) => void;
  referenceCategories: string[];
  uploadReferenceImages: (event: ChangeEvent<HTMLInputElement>) => void;
  hiddenReferenceCount: number;
  globalReferencesCount: number;
  uploadReferencesCount: number;
  brandReferencesCount: number;
  companyReferencesCount: number;
  setReferenceDisplayLimit: (limit: number) => void;
};

// ---------------------------------------------------------------------------
// Source filter pill labels
// ---------------------------------------------------------------------------
const SOURCE_FILTERS: { key: string; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'global', label: 'Globais' },
  { key: 'upload', label: 'Uploads' },
  { key: 'brand', label: 'Marca' },
  { key: 'company', label: 'Empresa' },
];

const MAX_SELECTIONS = 3;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ReferenceLibraryPanel({
  referenceImages,
  visibleReferenceImages,
  referenceDisplayLimit,
  referenceCategoryFilter,
  setReferenceCategoryFilter,
  toggleReferenceSelection,
  toggleReferenceFavorite,
  referenceCategories,
  uploadReferenceImages,
  hiddenReferenceCount,
  globalReferencesCount,
  uploadReferencesCount,
  brandReferencesCount,
  companyReferencesCount,
  setReferenceDisplayLimit,
}: ReferenceLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCount = referenceImages.filter((r) => r.selected).length;
  const favoriteCount = referenceImages.filter((r) => r.favorite).length;

  // Extract all unique tags from references
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    referenceImages.forEach((r) => r.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [referenceImages]);

  // Build source counts map
  const sourceCounts = useMemo(
    () => ({
      todas: referenceImages.length,
      global: globalReferencesCount,
      upload: uploadReferencesCount,
      brand: brandReferencesCount,
      company: companyReferencesCount,
    }),
    [
      referenceImages.length,
      globalReferencesCount,
      uploadReferencesCount,
      brandReferencesCount,
      companyReferencesCount,
    ]
  );

  // Local search + favorites filter on top of the hook's visible references
  const displayImages = useMemo(() => {
    let images = visibleReferenceImages;

    if (showFavoritesOnly) {
      images = images.filter((r) => r.favorite);
    }

    if (selectedTag) {
      images = images.filter((r) => r.tags?.includes(selectedTag));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      images = images.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.source?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    return images;
  }, [visibleReferenceImages, showFavoritesOnly, selectedTag, searchQuery]);

  const handleUploadClick = useCallback(() => {
    uploadInputRef.current?.click();
  }, []);

  const handleLoadMore = useCallback(() => {
    setReferenceDisplayLimit(referenceDisplayLimit + REFERENCE_PAGE_SIZE);
  }, [referenceDisplayLimit, setReferenceDisplayLimit]);

  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-[24px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-[16px] flex items-start gap-[12px]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-500/20 bg-stone-500/10 text-stone-800 dark:text-stone-100">
          <Grid3x3 className="h-[18px] w-[18px]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[20px] font-[800] text-black dark:text-white">
            Biblioteca de Referências
          </h3>
          <p className="mt-[2px] text-[13px] text-black/55 dark:text-white/55">
            {referenceImages.length} imagens disponíveis ·{' '}
            <span className="font-[700] text-stone-700 dark:text-stone-200">
              {selectedCount}/{MAX_SELECTIONS}
            </span>{' '}
            selecionadas
          </p>
        </div>
      </div>

      {/* ── Selected references strip ───────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="mb-[14px] rounded-[12px] border border-stone-200 bg-stone-50 p-[12px] dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-[8px] text-[12px] font-[800] uppercase tracking-[0.1em] text-stone-600 dark:text-stone-300">
            Referências selecionadas
          </div>
          <div className="flex gap-[8px]">
            {referenceImages
              .filter((r) => r.selected)
              .slice(0, MAX_SELECTIONS)
              .map((ref) => (
                <div
                  key={ref.id}
                  className="group relative h-[56px] w-[56px] shrink-0 overflow-hidden rounded-[10px] border-2 border-stone-900 dark:border-white"
                >
                  <img
                    src={ref.src}
                    alt={ref.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => toggleReferenceSelection(ref.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100"
                    title="Remover seleção"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Search + Upload + Favorites ────────────────────────────── */}
      <div className="mb-[12px] flex flex-wrap items-center gap-[8px]">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-[12px] top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-black/30 dark:text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, categoria..."
            className="h-[40px] w-full rounded-[10px] border border-black/10 bg-white pl-[36px] pr-[12px] text-[13px] text-black outline-none placeholder:text-black/35 transition focus:border-black/40 focus:ring-4 focus:ring-black/5 dark:border-white/10 dark:bg-[#171717] dark:text-white dark:placeholder:text-white/35 dark:focus:border-white/40 dark:focus:ring-white/5"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-[8px] top-1/2 -translate-y-1/2 rounded-full p-[4px] text-black/40 hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
            >
              <X className="h-[13px] w-[13px]" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFavoritesOnly((prev) => !prev)}
          className={`flex items-center gap-[6px] rounded-[10px] border px-[12px] py-[8px] text-[12px] font-[800] transition ${
            showFavoritesOnly
              ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300'
              : 'border-black/10 bg-white text-black/70 hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10'
          }`}
        >
          <Heart
            className={`h-[14px] w-[14px] ${showFavoritesOnly ? 'fill-amber-400' : ''}`}
          />
          {favoriteCount > 0 && <span>{favoriteCount}</span>}
        </button>

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={uploadReferenceImages}
        />
        <button
          type="button"
          onClick={handleUploadClick}
          className="flex items-center gap-[6px] rounded-[10px] border border-black/10 bg-white px-[12px] py-[8px] text-[12px] font-[800] text-black/70 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
        >
          <Upload className="h-[14px] w-[14px]" />
          Enviar
        </button>
      </div>

      {/* ── Source filter pills ─────────────────────────────────────── */}
      <div className="mb-[12px] flex flex-wrap gap-[6px]">
        {SOURCE_FILTERS.map((sf) => {
          const active = referenceCategoryFilter === sf.key;
          const count = sourceCounts[sf.key as keyof typeof sourceCounts] ?? 0;
          return (
            <button
              key={sf.key}
              type="button"
              onClick={() => setReferenceCategoryFilter(sf.key)}
              className={`flex items-center gap-[5px] rounded-full border px-[12px] py-[6px] text-[11px] font-[800] transition ${
                active
                  ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                  : 'border-black/10 bg-white text-black/60 hover:border-black/20 hover:text-black/80 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:border-white/20 dark:hover:text-white/80'
              }`}
            >
              {sf.label}
              <span
                className={`rounded-full px-[5px] py-[1px] text-[9px] font-[900] ${
                  active
                    ? 'bg-white/20 text-white dark:bg-black/20 dark:text-stone-900'
                    : 'bg-black/5 text-black/50 dark:bg-white/10 dark:text-white/50'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Dynamic category pills from referenceCategories */}
        {referenceCategories
          .filter(
            (cat) =>
              cat !== 'todas' &&
              !SOURCE_FILTERS.some((sf) => sf.key === cat)
          )
          .slice(0, 6)
          .map((cat) => {
            const active = referenceCategoryFilter === cat;
            const count = referenceImages.filter(
              (r) => (r.category || r.source) === cat
            ).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setReferenceCategoryFilter(active ? 'todas' : cat)
                }
                className={`flex items-center gap-[5px] rounded-full border px-[12px] py-[6px] text-[11px] font-[800] transition ${
                  active
                    ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                    : 'border-black/10 bg-white text-black/60 hover:border-black/20 hover:text-black/80 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:border-white/20 dark:hover:text-white/80'
                }`}
              >
                {cat}
                <span
                  className={`rounded-full px-[5px] py-[1px] text-[9px] font-[900] ${
                    active
                      ? 'bg-white/20 text-white dark:bg-black/20 dark:text-stone-900'
                      : 'bg-black/5 text-black/50 dark:bg-white/10 dark:text-white/50'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
      </div>

      {/* ── Tag filter pills ─────────────────────────────────────────── */}
      {allTags.length > 0 && (
        <div className="mb-[12px] flex flex-wrap gap-[6px]">
          <span className="text-[11px] font-[700] text-black/40 dark:text-white/40 self-center mr-[4px]">Tags:</span>
          {allTags.slice(0, 12).map((tag) => {
            const active = selectedTag === tag;
            const count = referenceImages.filter((r) => r.tags?.includes(tag)).length;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(active ? '' : tag)}
                className={`flex items-center gap-[4px] rounded-full border px-[10px] py-[4px] text-[10px] font-[700] transition ${
                  active
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:border-blue-400 dark:bg-blue-400/10 dark:text-blue-400'
                    : 'border-black/10 bg-white text-black/50 hover:border-black/20 dark:border-white/10 dark:bg-white/5 dark:text-white/50'
                }`}
              >
                {tag}
                <span className="text-[9px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Image grid ─────────────────────────────────────────────── */}
      {displayImages.length > 0 ? (
        <div className="grid grid-cols-3 gap-[8px] sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {displayImages.map((ref) => (
            <ReferenceThumbnail
              key={ref.id}
              ref_={ref}
              onToggleSelection={toggleReferenceSelection}
              onToggleFavorite={toggleReferenceFavorite}
              selectionDisabled={!ref.selected && selectedCount >= MAX_SELECTIONS}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-black/10 p-[28px] text-center dark:border-white/10">
          <ImageIcon className="mx-auto mb-[8px] h-[28px] w-[28px] text-black/20 dark:text-white/20" />
          <p className="text-[13px] text-black/50 dark:text-white/50">
            {searchQuery
              ? 'Nenhuma referência encontrada para esta busca.'
              : 'Nenhuma referência disponível nesta categoria.'}
          </p>
        </div>
      )}

      {/* ── Load more ──────────────────────────────────────────────── */}
      {hiddenReferenceCount > 0 && !searchQuery && (
        <div className="mt-[14px] flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            className="flex items-center gap-[6px] rounded-[10px] border border-black/10 bg-white px-[18px] py-[10px] text-[13px] font-[800] text-black/70 transition hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10"
          >
            <ChevronDown className="h-[14px] w-[14px]" />
            Carregar mais ({hiddenReferenceCount} restantes)
          </button>
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────────── */}
      <div className="mt-[12px] flex flex-wrap gap-[12px] text-[11px] text-black/40 dark:text-white/40">
        <span className="flex items-center gap-[4px]">
          <span className="inline-block h-[10px] w-[10px] rounded-full border-2 border-stone-900 dark:border-white" />
          Selecionada
        </span>
        <span className="flex items-center gap-[4px]">
          <Heart className="h-[10px] w-[10px] fill-red-400 text-red-400" />
          Favorita
        </span>
        <span>
          Máximo {MAX_SELECTIONS} seleções por geração.
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thumbnail sub-component
// ---------------------------------------------------------------------------
function ReferenceThumbnail({
  ref_,
  onToggleSelection,
  onToggleFavorite,
  selectionDisabled,
}: {
  ref_: ReferenceImage;
  onToggleSelection: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  selectionDisabled: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[10px] border transition dark:border-white/10">
      {/* Selection border */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 rounded-[10px] border-2 transition ${
          ref_.selected
            ? 'border-stone-900 dark:border-white'
            : 'border-transparent'
        }`}
      />

      {/* Image */}
      <button
        type="button"
        onClick={() =>
          selectionDisabled ? undefined : onToggleSelection(ref_.id)
        }
        className={`relative block aspect-square w-full overflow-hidden ${
          selectionDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        }`}
        title={
          ref_.selected
            ? `Desmarcar: ${ref_.name}`
            : selectionDisabled
            ? 'Máximo de seleções atingido'
            : `Selecionar: ${ref_.name}`
        }
      >
        <img
          src={ref_.src}
          alt={ref_.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Hover overlay */}
        <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
      </button>

      {/* Selection badge (top-left) */}
      {ref_.selected && (
        <span className="absolute left-[6px] top-[6px] z-20 flex h-[20px] w-[20px] items-center justify-center rounded-full bg-stone-900 text-[10px] font-[900] text-white dark:bg-white dark:text-stone-900">
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}

      {/* Favorite heart (top-right) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(ref_.id);
        }}
        className={`absolute right-[6px] top-[6px] z-20 flex h-[22px] w-[22px] items-center justify-center rounded-full transition ${
          ref_.favorite
            ? 'bg-amber-400/90 text-white'
            : 'bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/60'
        }`}
        title={ref_.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      >
        <Heart
          className={`h-[11px] w-[11px] ${ref_.favorite ? 'fill-white' : ''}`}
        />
      </button>

      {/* Source label (bottom-left) */}
      <span className="absolute bottom-[4px] left-[4px] z-20 rounded-[4px] bg-black/55 px-[5px] py-[2px] text-[8px] font-[800] uppercase tracking-[0.08em] text-white/80">
        {ref_.source}
      </span>

      {/* Approved star (bottom-right) */}
      {ref_.approved && (
        <span className="absolute bottom-[4px] right-[4px] z-20 flex h-[16px] w-[16px] items-center justify-center rounded-full bg-emerald-500/80 text-white">
          <Star className="h-[9px] w-[9px] fill-white" />
        </span>
      )}
    </div>
  );
}
