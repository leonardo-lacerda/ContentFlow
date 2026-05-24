import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from 'react';
import { LayoutTemplate } from 'lucide-react';

import type {
  CarouselPlan,
  SavedAiProject,
  SlideImageResult,
} from './ai-generate-images.types';
import { formatCurrency, imageSrc } from './ai-generate-images.utils';

export function AiGenerateImagesHeader() {
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-black/10 bg-[#f7f2ea] p-[32px] shadow-sm dark:border-white/10 dark:bg-[#141312]">
      <div className="relative z-10 flex flex-col gap-[12px]">
        <div className="inline-flex w-fit items-center gap-[8px] rounded-full border border-black/10 bg-white/70 px-[12px] py-[6px] dark:border-white/10 dark:bg-white/5">
          <LayoutTemplate className="h-[14px] w-[14px] text-stone-700 dark:text-stone-200" />
          <span className="text-[12px] font-[800] uppercase tracking-[0.14em] text-stone-700 dark:text-stone-200">
            Estúdio editorial
          </span>
        </div>
        <h2 className="text-[36px] font-[800] tracking-tight text-black dark:text-white leading-tight">
          Estúdio de Carrosséis
        </h2>
        <p className="max-w-[760px] text-[16px] leading-[26px] text-black/60 dark:text-white/60">
          Crie slides de carrossel com copy dentro da imagem, tipografia
          editorial e direção visual pronta para gerar os criativos usando a
          identidade da sua marca.
        </p>
      </div>
    </div>
  );
}

type SavedProjectsPanelProps = {
  importProjectInputRef: RefObject<HTMLInputElement | null>;
  loadingSavedProjects: boolean;
  savedProjects: SavedAiProject[];
  onImportProjectJson: (event: ChangeEvent<HTMLInputElement>) => void;
  onLoadProjectIntoStudio: (project: SavedAiProject) => void;
  onLoadSavedProjects: () => void;
};

export function SavedProjectsPanel({
  importProjectInputRef,
  loadingSavedProjects,
  savedProjects,
  onImportProjectJson,
  onLoadProjectIntoStudio,
  onLoadSavedProjects,
}: SavedProjectsPanelProps) {
  return (
    <div className="rounded-[16px] border border-black/10 bg-white p-[20px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
      <div className="mb-[12px] flex flex-wrap items-center justify-between gap-[12px]">
        <div>
          <h3 className="text-[18px] font-[800] text-black dark:text-white">
            Projetos salvos
          </h3>
          <p className="text-[13px] text-black/55 dark:text-white/55">
            Reabra um carrossel salvo para continuar editando copy, brief e
            imagens.
          </p>
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
            onClick={onLoadSavedProjects}
            className="rounded-[10px] border border-black/10 bg-black px-[12px] py-[8px] text-[12px] font-[800] text-white hover:bg-black/80 dark:border-white/10"
          >
            {loadingSavedProjects ? 'Carregando...' : 'Atualizar projetos'}
          </button>
        </div>
      </div>
      {savedProjects.length > 0 ? (
        <div className="flex gap-[10px] overflow-x-auto pb-[4px]">
          {savedProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => onLoadProjectIntoStudio(project)}
              className="min-w-[240px] rounded-[12px] border border-black/10 bg-black/[0.03] p-[12px] text-left transition hover:border-stone-500/50 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <div className="mb-[6px] text-[13px] font-[900] text-black dark:text-white">
                {project.carouselProject?.plan?.title ||
                  project.originalName?.replace('Carrossel: ', '') ||
                  'Projeto salvo'}
              </div>
              <div className="text-[12px] text-black/55 dark:text-white/55">
                {project.carouselProject?.company?.name || 'Sem empresa'} ·{' '}
                {project.children?.length || 0} slides
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-black/10 p-[14px] text-[13px] text-black/50 dark:border-white/10 dark:text-white/50">
          Nenhum projeto salvo encontrado ainda.
        </div>
      )}
    </div>
  );
}

type ErrorBannerProps = {
  message: string;
};

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-[12px] border border-red-500/40 bg-red-500/10 p-[16px] text-[14px] text-red-400 font-[500] flex items-center gap-3">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {message}
    </div>
  );
}

type EmptyStudioStateProps = {
  visible: boolean;
};

export function EmptyStudioState({ visible }: EmptyStudioStateProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-newTableBorder bg-newBgColorInner/50 p-[48px] text-center mt-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <h4 className="text-[18px] font-[600] text-textPrimary mb-2">
        Pronto para criar?
      </h4>
      <p className="text-[14px] text-textItemBlur max-w-[400px]">
        Preencha o formulário acima para gerar a copy que vai dentro dos slides
        e a direção visual das imagens.
      </p>
    </div>
  );
}

type SessionCostSummaryProps = {
  brl: number;
  visible: boolean;
};

export function SessionCostSummary({ brl, visible }: SessionCostSummaryProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="flex justify-end mt-2">
      <div className="rounded-[12px] bg-newBgColorInner border border-newTableBorder px-[16px] py-[12px] text-[13px] flex items-center gap-4">
        <span className="text-textItemBlur flex items-center gap-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Custo estimado desta sessão:
        </span>
        <span className="font-[700] text-[15px] text-textPrimary">
          {formatCurrency(brl, 'BRL')}
        </span>
      </div>
    </div>
  );
}

type CarouselLightboxProps = {
  lightboxIndex: number | null;
  plan: CarouselPlan | null;
  slideImages: Record<number, SlideImageResult>;
  setLightboxIndex: Dispatch<SetStateAction<number | null>>;
};

export function CarouselLightbox({
  lightboxIndex,
  plan,
  slideImages,
  setLightboxIndex,
}: CarouselLightboxProps) {
  if (lightboxIndex === null || !plan?.slides?.[lightboxIndex]) {
    return null;
  }

  const currentSlide = plan.slides[lightboxIndex];
  const currentImage = imageSrc(slideImages[currentSlide.index]?.image);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setLightboxIndex(null)}
        className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="relative flex max-w-6xl w-full h-[90vh] items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setLightboxIndex((prev) =>
              prev !== null && prev > 0 ? prev - 1 : prev
            )
          }
          className={`p-4 text-white hover:text-primary transition-colors ${
            lightboxIndex === 0 ? 'opacity-30 cursor-not-allowed' : ''
          }`}
          disabled={lightboxIndex === 0}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div className="relative flex-1 h-full flex items-center justify-center mx-4">
          {currentImage ? (
            <img
              src={currentImage}
              alt={currentSlide.altText || currentSlide.headline}
              className="max-w-full max-h-full object-contain rounded-[8px] shadow-xl"
            />
          ) : (
            <div className="text-textItemBlur flex flex-col items-center">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-4 opacity-30"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>Imagem não gerada ainda</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setLightboxIndex((prev) =>
              prev !== null && prev < plan.slides.length - 1 ? prev + 1 : prev
            )
          }
          className={`p-4 text-white hover:text-primary transition-colors ${
            lightboxIndex === plan.slides.length - 1
              ? 'opacity-30 cursor-not-allowed'
              : ''
          }`}
          disabled={lightboxIndex === plan.slides.length - 1}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-[600] tracking-wider text-[14px]">
        {lightboxIndex + 1} / {plan.slides.length}
      </div>
    </div>
  );
}
