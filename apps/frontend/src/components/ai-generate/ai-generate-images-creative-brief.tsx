import type {
  CompanyProfile,
  EditorialReview,
  ReferenceImage,
} from './ai-generate-images.types';

type CreativeBriefPanelProps = {
  allowGenerateWithReviewIssues: boolean;
  applyEditorialQuickFixes: () => void;
  autoReviewBeforeImages: boolean;
  brandColors: string;
  companyProfile: CompanyProfile | null;
  computedCreativeBrief: string;
  correctingEditorial: boolean;
  editorialReview: EditorialReview | null;
  finalCreativeBrief: string;
  fixCarouselWithAi: () => void;
  refreshCreativeBrief: () => void;
  reviewCarouselQuality: () => void;
  reviewingEditorial: boolean;
  selectedReferences: ReferenceImage[];
  setAllowGenerateWithReviewIssues: (value: boolean) => void;
  setAutoReviewBeforeImages: (value: boolean) => void;
  setFinalCreativeBrief: (value: string) => void;
};

export function CreativeBriefPanel(props: CreativeBriefPanelProps) {
  const {
    allowGenerateWithReviewIssues,
    applyEditorialQuickFixes,
    autoReviewBeforeImages,
    brandColors,
    companyProfile,
    computedCreativeBrief,
    correctingEditorial,
    editorialReview,
    finalCreativeBrief,
    fixCarouselWithAi,
    refreshCreativeBrief,
    reviewCarouselQuality,
    reviewingEditorial,
    selectedReferences,
    setAllowGenerateWithReviewIssues,
    setAutoReviewBeforeImages,
    setFinalCreativeBrief,
  } = props;

  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-[28px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
      <div className="mb-[14px] flex flex-col gap-[12px] md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-[12px]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-500/20 bg-stone-500/10 text-[15px] font-[900] text-stone-800 dark:text-stone-100">
            3
          </div>
          <div>
            <h3 className="text-[22px] font-[800] text-black dark:text-white">
              Direção criativa final
            </h3>
            <p className="mt-[4px] max-w-[760px] text-[14px] leading-relaxed text-black/60 dark:text-white/60">
              Este é o ponto onde tudo se conecta: empresa, Brand Kit,
              identidade visual, copy do carrossel e inspirações
              escolhidas. Você pode editar antes de gerar as imagens.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refreshCreativeBrief}
          className="rounded-[10px] border border-black/10 bg-white px-[14px] py-[9px] text-[12px] font-[900] text-black/70 hover:bg-stone-50 dark:border-white/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
        >
          Atualizar com dados atuais
        </button>
      </div>

      <textarea
        value={finalCreativeBrief || computedCreativeBrief}
        onChange={(event) => setFinalCreativeBrief(event.target.value)}
        className="min-h-[190px] w-full resize-y rounded-[12px] border border-black/10 bg-stone-50 p-[16px] text-[13px] leading-relaxed text-black outline-none placeholder:text-black/35 focus:border-stone-500/40 dark:border-white/10 dark:bg-black/25 dark:text-white dark:placeholder:text-white/35"
        maxLength={3000}
      />

      <div className="mt-[12px] grid grid-cols-1 gap-[8px] text-[12px] text-black/55 dark:text-white/60 md:grid-cols-3">
        <span className="rounded-[999px] border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/5 px-[10px] py-[7px]">
          Empresa: {companyProfile?.companyName || 'não selecionada'}
        </span>
        <span className="rounded-[999px] border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/5 px-[10px] py-[7px]">
          Brand Kit:{' '}
          {companyProfile?.visualIdentitySummary || brandColors.trim()
            ? 'ativo'
            : 'básico'}
        </span>
        <span className="rounded-[999px] border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/5 px-[10px] py-[7px]">
          Inspirações: {selectedReferences.length}/3
        </span>
      </div>
      <div className="mt-[14px] flex flex-wrap gap-[10px]">
        <button
          type="button"
          onClick={() => reviewCarouselQuality()}
          disabled={reviewingEditorial}
          className="rounded-[10px] border border-white/10 bg-white/10 px-[14px] py-[9px] text-[12px] font-[900] text-black/70 hover:bg-black/5 dark:text-white dark:hover:bg-white/15 disabled:opacity-50"
        >
          {reviewingEditorial
            ? 'Revisando...'
            : 'Rodar crítica editorial'}
        </button>
        {editorialReview && (
          <span className="rounded-[10px] border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/5 px-[12px] py-[9px] text-[12px] font-[800] text-black/70 dark:text-white/80">
            Score editorial: {editorialReview.score}/100
          </span>
        )}
	                {!!editorialReview?.issues?.length && (
	                  <button
	                    type="button"
	                    onClick={applyEditorialQuickFixes}
            className="rounded-[10px] border border-emerald-500/25 bg-emerald-500/10 px-[14px] py-[9px] text-[12px] font-[900] text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200"
          >
	                    Aplicar correções rápidas
	                  </button>
	                )}
	                {!!editorialReview?.issues?.length && (
	                  <button
	                    type="button"
	                    onClick={fixCarouselWithAi}
	                    disabled={correctingEditorial}
	                    className="rounded-[10px] border border-stone-500/20 bg-stone-500/10 px-[14px] py-[9px] text-[12px] font-[900] text-stone-700 hover:bg-stone-500/15 disabled:opacity-50 dark:text-stone-100"
	                  >
	                    {correctingEditorial
	                      ? 'Corrigindo...'
	                      : 'Corrigir slides'}
	                  </button>
	                )}
	              </div>
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
      <div className="mt-[12px] grid grid-cols-1 gap-[8px] text-[12px] text-black/60 dark:text-white/70 md:grid-cols-2">
        <label className="flex items-center gap-[8px] rounded-[10px] border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/5 px-[10px] py-[8px]">
          <input
            type="checkbox"
            checked={autoReviewBeforeImages}
            onChange={(event) =>
              setAutoReviewBeforeImages(event.target.checked)
            }
          />
          Revisar automaticamente antes de gerar imagens
        </label>
        <label className="flex items-center gap-[8px] rounded-[10px] border border-amber-500/25 bg-amber-500/10 px-[10px] py-[8px] text-amber-700 dark:text-amber-100">
          <input
            type="checkbox"
            checked={allowGenerateWithReviewIssues}
            onChange={(event) =>
              setAllowGenerateWithReviewIssues(event.target.checked)
            }
          />
          Gerar mesmo com alertas editoriais
        </label>
      </div>
    </div>
  );
}
