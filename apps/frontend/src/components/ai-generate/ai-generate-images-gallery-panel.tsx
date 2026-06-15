import type { ChangeEvent, RefObject } from 'react';
import { ImageIcon, LayoutGrid } from 'lucide-react';

import type { SavedAiProject } from './ai-generate-images.types';

export type GalleryItem = {
  id: string;
  title: string;
  slideCount: number;
  platform: string;
  thumbnail: string;
  project: SavedAiProject;
};

type CompanyGalleryPanelProps = {
  items: GalleryItem[];
  loading: boolean;
  importProjectInputRef: RefObject<HTMLInputElement | null>;
  onImportProjectJson: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpen: (project: SavedAiProject) => void;
  onRefresh: () => void;
};

export function CompanyGalleryPanel({
  items,
  loading,
  importProjectInputRef,
  onImportProjectJson,
  onOpen,
  onRefresh,
}: CompanyGalleryPanelProps) {
  return (
    <div className="rounded-[16px] border border-black/10 bg-white p-[20px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
      <div className="mb-[14px] flex flex-wrap items-center justify-between gap-[12px]">
        <div className="flex items-center gap-[10px]">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-200">
            <LayoutGrid className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="text-[18px] font-[800] text-black dark:text-white">
              Galeria da empresa
            </h3>
            <p className="text-[13px] text-black/55 dark:text-white/55">
              Carrosséis já criados para esta empresa. Clique para reabrir.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-[8px]">
          <input
            ref={importProjectInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onImportProjectJson}
          />
          <button
            type="button"
            onClick={() => importProjectInputRef.current?.click()}
            className="rounded-[10px] border border-black/10 bg-white px-[12px] py-[8px] text-[12px] font-[800] text-black hover:bg-black/5 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            Importar JSON
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-[10px] border border-black/10 bg-black px-[12px] py-[8px] text-[12px] font-[800] text-white hover:bg-black/80 dark:border-white/10"
          >
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.project)}
              className="group flex flex-col overflow-hidden rounded-[12px] border border-black/10 bg-white text-left transition hover:border-stone-500/50 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-black/5 dark:bg-white/5">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-black/25 dark:text-white/25">
                    <ImageIcon className="h-[26px] w-[26px]" />
                  </div>
                )}
                <span className="absolute right-[8px] top-[8px] rounded-full bg-black/65 px-[8px] py-[3px] text-[10px] font-[800] text-white">
                  {item.slideCount} slides
                </span>
              </div>
              <div className="flex flex-col gap-[3px] p-[10px]">
                <span className="line-clamp-2 text-[13px] font-[700] text-black dark:text-white">
                  {item.title}
                </span>
                {item.platform && (
                  <span className="text-[11px] font-[700] uppercase tracking-[0.08em] text-black/40 dark:text-white/40">
                    {item.platform}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-black/10 p-[20px] text-center text-[13px] text-black/50 dark:border-white/10 dark:text-white/50">
          {loading
            ? 'Carregando carrosséis...'
            : 'Nenhum carrossel salvo para esta empresa ainda. Crie um e salve na mídia para vê-lo aqui.'}
        </div>
      )}
    </div>
  );
}
