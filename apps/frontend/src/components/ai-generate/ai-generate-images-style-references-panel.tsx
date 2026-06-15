import type { EditorialReview, StyleReference } from './ai-generate-images.types';
import { Spinner } from './ai-generate-images.loaders';

type StyleReferencePanelProps = {
  references: StyleReference[];
  loading: boolean;
  error: string;
  selectedId: string;
  onSelect: (id: string) => void;
  onRegenerate: () => void;
  // Crítica editorial (parity com o painel antigo).
  applyEditorialQuickFixes?: () => void;
  correctingEditorial?: boolean;
  editorialReview?: EditorialReview | null;
  fixCarouselWithAi?: () => void;
  reviewCarouselQuality?: () => void;
  reviewingEditorial?: boolean;
};

const SKELETON_COUNT = 10;

export function StyleReferencePanel(props: StyleReferencePanelProps) {
  const {
    references,
    loading,
    error,
    selectedId,
    onSelect,
    onRegenerate,
    applyEditorialQuickFixes,
    correctingEditorial,
    editorialReview,
    fixCarouselWithAi,
    reviewCarouselQuality,
    reviewingEditorial,
  } = props;

  const showSkeletons = loading && references.length === 0;

  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-[28px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
      <div className="mb-[14px] flex items-start gap-[12px]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-500/20 bg-stone-500/10 text-[15px] font-[900] text-stone-800 dark:text-stone-100">
          2
        </div>
        <div className="flex-1">
          <h3 className="text-[22px] font-[800] text-black dark:text-white">
            Direção visual
          </h3>
          <p className="mt-[4px] max-w-[760px] text-[14px] leading-relaxed text-black/60 dark:text-white/60">
            Escolha o estilo das suas artes clicando na referência que mais
            combina com a marca. É só apontar a imagem — nós cuidamos do resto.
          </p>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={loading}
          className="shrink-0 rounded-[10px] border border-black/10 bg-white px-[14px] py-[9px] text-[12px] font-[800] text-black/70 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
        >
          {loading ? 'Carregando...' : 'Recarregar'}
        </button>
      </div>

      {error && (
        <div className="mb-[14px] rounded-[12px] border border-red-500/30 bg-red-500/10 px-[14px] py-[10px] text-[13px] font-[600] text-red-500 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && references.length === 0 && (
        <div className="mb-[14px] flex items-center gap-[8px] text-[13px] font-[700] text-stone-600 dark:text-stone-300">
          <Spinner size={14} />
          Carregando referências visuais...
        </div>
      )}

      <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-3 md:grid-cols-5">
        {showSkeletons
          ? Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <div
                key={`style-skel-${index}`}
                className="aspect-square animate-pulse rounded-[14px] border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
              />
            ))
          : references.map((reference) => {
              const active = reference.id === selectedId;
              return (
                <button
                  key={reference.id}
                  type="button"
                  onClick={() => onSelect(reference.id)}
                  aria-pressed={active}
                  aria-label={`Estilo visual${reference.label ? `: ${reference.label}` : ''}`}
                  className={`group relative aspect-square overflow-hidden rounded-[14px] border transition ${
                    active
                      ? 'border-stone-950 ring-2 ring-stone-950 dark:border-white dark:ring-white'
                      : 'border-black/10 hover:border-stone-500/50 dark:border-white/10'
                  }`}
                >
                  <img
                    src={reference.dataUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span
                    className={`pointer-events-none absolute inset-0 transition ${
                      active ? 'bg-black/0' : 'bg-black/0 group-hover:bg-black/10'
                    }`}
                  />
                  {active && (
                    <span className="absolute right-[8px] top-[8px] flex h-[24px] w-[24px] items-center justify-center rounded-full bg-stone-950 text-white dark:bg-white dark:text-stone-950">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
      </div>

      {!loading && references.length > 0 && (
        <p className="mt-[12px] text-[12px] text-black/50 dark:text-white/50">
          {selectedId
            ? 'Estilo selecionado. As artes finais seguirão essa referência.'
            : 'Clique em uma referência para definir o estilo das artes.'}
        </p>
      )}

      {reviewCarouselQuality && (
        <div className="mt-[18px] flex flex-wrap gap-[10px] border-t border-black/10 pt-[16px] dark:border-white/10">
          <button
            type="button"
            onClick={() => reviewCarouselQuality()}
            disabled={reviewingEditorial}
            className="rounded-[10px] border border-black/10 bg-black/[0.03] px-[14px] py-[9px] text-[12px] font-[900] text-black/70 hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/15"
          >
            {reviewingEditorial ? 'Revisando...' : 'Rodar crítica editorial'}
          </button>
          {editorialReview && (
            <span className="rounded-[10px] border border-black/10 bg-black/[0.03] px-[12px] py-[9px] text-[12px] font-[800] text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/80">
              Score editorial: {editorialReview.score}/100
            </span>
          )}
          {!!editorialReview?.issues?.length && applyEditorialQuickFixes && (
            <button
              type="button"
              onClick={applyEditorialQuickFixes}
              className="rounded-[10px] border border-emerald-500/25 bg-emerald-500/10 px-[14px] py-[9px] text-[12px] font-[900] text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200"
            >
              Aplicar correções rápidas
            </button>
          )}
          {!!editorialReview?.issues?.length && fixCarouselWithAi && (
            <button
              type="button"
              onClick={fixCarouselWithAi}
              disabled={correctingEditorial}
              className="rounded-[10px] border border-stone-500/20 bg-stone-500/10 px-[14px] py-[9px] text-[12px] font-[900] text-stone-700 hover:bg-stone-500/15 disabled:opacity-50 dark:text-stone-100"
            >
              {correctingEditorial ? 'Corrigindo...' : 'Corrigir slides'}
            </button>
          )}
        </div>
      )}

      {editorialReview && (
        <div className="mt-[12px] rounded-[14px] border border-black/10 bg-stone-50 p-[14px] dark:border-white/10 dark:bg-black/20">
          <div className="text-[13px] font-[800] text-black dark:text-white">
            {editorialReview.verdict}
          </div>
          {!!editorialReview.strengths?.length && (
            <div className="mt-[8px] text-[12px] text-emerald-700 dark:text-emerald-200">
              Pontos fortes: {editorialReview.strengths.join(', ')}
            </div>
          )}
          {!!editorialReview.issues?.length && (
            <div className="mt-[10px] flex flex-col gap-[6px]">
              {editorialReview.issues.slice(0, 6).map((issue, index) => (
                <div
                  key={`${issue.issue}-${index}`}
                  className="rounded-[10px] bg-white p-[10px] text-[12px] text-black/70 dark:bg-white/5 dark:text-white/75"
                >
                  <strong className="text-amber-700 dark:text-amber-200">
                    {issue.slide ? `Slide ${issue.slide}: ` : ''}
                    {issue.severity}
                  </strong>{' '}
                  {issue.issue} — {issue.suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
