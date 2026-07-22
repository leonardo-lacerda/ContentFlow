import { Button } from '@gitroom/react/form/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { inputClass } from './ai-generate-images.constants';
import { formatCurrency, recommendsDesignSystem } from './ai-generate-images.utils';
import { AnimatedDots, IndeterminateBar, Spinner } from './ai-generate-images.loaders';
import { DesignLivePreview } from './design-live-preview';
import type {
  CarouselImageJob,
  CarouselPlan,
  CarouselRenderMode,
  CostEstimate,
  CostHistoryResponse,
  DesignRecipe,
  SlideImageResult,
} from './ai-generate-images.types';

type ImageGenerationPanelProps = {
  allowOverBudget: boolean;
  brandColors?: string;
  brandFonts?: string;
  canSaveCarousel: boolean;
  cancelCarouselGeneration: () => void;
  costHistory: CostHistoryResponse | null;
  costLimitBrl: number;
  designHandle: string;
  designRecipe?: DesignRecipe | null;
  designSizeId: string;
  error: string;
  estimateGenerationCost: () => void;
  exportCarouselPackage: () => void;
  exportHeight: number;
  exportingPackage: boolean;
  exportWidth: number;
  generateCarouselImages: () => void;
  generatedSlides: number[];
  generatingImages: boolean;
  imageDisabled: boolean;
  imageDisabledReason: string;
  imageJob: CarouselImageJob | null;
  imageJobProgress: number;
  imageModel: string;
  imageProvider: 'ia_generate' | 'openai_official';
  imageQuality: 'draft' | 'final';
  setImageQuality: (value: 'draft' | 'final') => void;
  includePdfExport: boolean;
  isOverSoftLimit: boolean;
  isOverUserLimit: boolean;
  plan: CarouselPlan;
  preflightEstimate: CostEstimate | null;
  projectedCostBrl: number;
  renderMode: CarouselRenderMode;
  saveCarouselToMedia: () => void;
  savedCarouselCount: number;
  savedCarouselProject: string;
  savedCarouselProjectId: string;
  savingCarousel: boolean;
  setAllowOverBudget: (value: boolean) => void;
  setCostLimitBrl: (value: number) => void;
  setDesignHandle: (value: string) => void;
  setDesignSizeId: (value: string) => void;
  setExportHeight: (value: number) => void;
  setExportWidth: (value: number) => void;
  setImageModel: (value: string) => void;
  setImageProvider: (value: 'ia_generate' | 'openai_official') => void;
  setIncludePdfExport: (value: boolean) => void;
  setRenderMode: (value: CarouselRenderMode) => void;
  slideImages: Record<string, SlideImageResult>;
  showAdvanced: boolean;
};

export function ImageGenerationPanel(props: ImageGenerationPanelProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const {
    allowOverBudget,
    brandColors,
    brandFonts,
    canSaveCarousel,
    cancelCarouselGeneration,
    costHistory,
    costLimitBrl,
    designRecipe,
    error,
    estimateGenerationCost,
    exportCarouselPackage,
    exportHeight,
    exportingPackage,
    exportWidth,
    generateCarouselImages,
    generatedSlides,
    generatingImages,
    imageDisabled,
    imageDisabledReason,
    imageJob,
    imageJobProgress,
    imageModel,
    imageProvider,
    imageQuality,
    setImageQuality,
    plan,
    preflightEstimate,
    projectedCostBrl,
    renderMode,
    designSizeId,
    designHandle,
    saveCarouselToMedia,
    savedCarouselCount,
    savedCarouselProject,
    savedCarouselProjectId,
    savingCarousel,
    setAllowOverBudget,
    setCostLimitBrl,
    setDesignHandle,
    setDesignSizeId,
    setExportHeight,
    setExportWidth,
    setImageModel,
    setImageProvider,
    setIncludePdfExport,
    setRenderMode,
    slideImages,
    showAdvanced,
    includePdfExport,
    isOverSoftLimit,
    isOverUserLimit,
  } = props;

  const hasGeneratedImages = Object.keys(slideImages).length > 0;
  // D — sugere o modo sem custo de imagem quando o conteúdo é template-friendly.
  const designSystemHint =
    renderMode !== 'design_system'
      ? recommendsDesignSystem(plan)
      : { recommend: false, reason: '' };

  const handleCreatePost = async () => {
    setNavigating(true);
    try {
      if (savedCarouselCount === 0) {
        await saveCarouselToMedia();
      }
      const params = new URLSearchParams();
      if (savedCarouselProjectId) {
        params.set('carouselProjectId', savedCarouselProjectId);
      }
      router.push(`/launches?${params.toString()}`);
    } catch {
      setNavigating(false);
    }
  };

  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-[32px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
      <div className="mb-[24px] flex flex-col gap-[8px]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-500/20 bg-stone-500/10 font-bold text-stone-800 dark:text-stone-100">
            4
          </div>
          <h3 className="text-[24px] font-[700] text-black dark:text-white">
            Gerar Imagens
          </h3>
        </div>
      </div>

      <div className="ml-11">
        <div className="mb-[20px] grid grid-cols-1 gap-[12px] md:grid-cols-2">
          <div className="flex flex-col gap-[8px]">
            <span className="text-[14px] font-[500]">Modo de render</span>
            <div className="flex flex-wrap gap-[8px]">
              <button
                type="button"
                onClick={() => setRenderMode('design_system')}
                className={`rounded-[10px] border px-[12px] py-[8px] text-[13px] font-[600] transition ${
                  renderMode === 'design_system'
                    ? 'border-stone-800 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-black/10 bg-white text-black/70 dark:border-white/15 dark:bg-transparent dark:text-white/70'
                }`}
              >
                Sistema de design
              </button>
              <button
                type="button"
                onClick={() => setRenderMode('ai_hybrid')}
                className={`rounded-[10px] border px-[12px] py-[8px] text-[13px] font-[600] transition ${
                  renderMode === 'ai_hybrid'
                    ? 'border-stone-800 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-black/10 bg-white text-black/70 dark:border-white/15 dark:bg-transparent dark:text-white/70'
                }`}
              >
                Híbrido
              </button>
              <button
                type="button"
                onClick={() => setRenderMode('ai_image')}
                className={`rounded-[10px] border px-[12px] py-[8px] text-[13px] font-[600] transition ${
                  renderMode === 'ai_image'
                    ? 'border-stone-800 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-black/10 bg-white text-black/70 dark:border-white/15 dark:bg-transparent dark:text-white/70'
                }`}
              >
                Imagem IA
              </button>
            </div>
            <p className="text-[12px] text-black/55 dark:text-white/55">
              {renderMode === 'design_system'
                ? 'Templates HTML + tipografia real → PNG via Playwright (qualidade editorial, custo baixo).'
                : renderMode === 'ai_hybrid'
                ? 'A IA cria só o fundo (sem texto); a tipografia entra por cima em HTML — texto sempre nítido e no lugar.'
                : 'Modelo de imagem com texto baked-in (fluxo clássico).'}
            </p>

            {/* A — Qualidade por estágio (só nos modos que gastam tokens) */}
            {renderMode !== 'design_system' && (
              <div className="mt-[4px] flex flex-col gap-[6px]">
                <span className="text-[13px] font-[500]">Qualidade</span>
                <div className="flex flex-wrap gap-[8px]">
                  <button
                    type="button"
                    onClick={() => setImageQuality('draft')}
                    className={`rounded-[10px] border px-[12px] py-[8px] text-[13px] font-[600] transition ${
                      imageQuality === 'draft'
                        ? 'border-stone-800 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-black/10 bg-white text-black/70 dark:border-white/15 dark:bg-transparent dark:text-white/70'
                    }`}
                  >
                    Rascunho · barato
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageQuality('final')}
                    className={`rounded-[10px] border px-[12px] py-[8px] text-[13px] font-[600] transition ${
                      imageQuality === 'final'
                        ? 'border-stone-800 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-black/10 bg-white text-black/70 dark:border-white/15 dark:bg-transparent dark:text-white/70'
                    }`}
                  >
                    Final · alta
                  </button>
                </div>
                <p className="text-[12px] text-black/55 dark:text-white/55">
                  {imageQuality === 'draft'
                    ? 'Gera em baixa resolução (~7x mais barato) para você escolher a composição antes de investir no final.'
                    : renderMode === 'ai_hybrid'
                    ? 'Fundo em qualidade média — o texto nítido vem do HTML, então não precisa de alta.'
                    : 'Qualidade máxima do modelo (texto queimado na imagem precisa de nitidez).'}
                </p>
              </div>
            )}
          </div>
          {renderMode === 'design_system' ? (
            <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
              <label className="flex flex-col gap-[8px]">
                <span className="text-[14px] font-[500]">Formato</span>
                <select
                  value={designSizeId}
                  onChange={(event) => setDesignSizeId(event.target.value)}
                  className={inputClass}
                >
                  <option value="ig-portrait">Instagram 4:5</option>
                  <option value="ig-square">Instagram 1:1</option>
                  <option value="ig-story">Stories 9:16</option>
                  <option value="linkedin-portrait">LinkedIn 4:5</option>
                  <option value="linkedin-landscape">LinkedIn landscape</option>
                </select>
              </label>
              <label className="flex flex-col gap-[8px]">
                <span className="text-[14px] font-[500]">Handle (@)</span>
                <input
                  value={designHandle}
                  onChange={(event) => setDesignHandle(event.target.value)}
                  placeholder="@suamarca"
                  className={inputClass}
                />
              </label>
            </div>
          ) : null}

          {/* D — dica de economia: rotear conteúdo template-friendly */}
          {designSystemHint.recommend && (
            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-[10px] rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 px-[14px] py-[10px]">
              <span className="text-[12px] font-[600] text-emerald-700 dark:text-emerald-200">
                💡 {designSystemHint.reason}
              </span>
              <button
                type="button"
                onClick={() => setRenderMode('design_system')}
                className="shrink-0 rounded-[8px] border border-emerald-500/40 bg-emerald-500/15 px-[12px] py-[6px] text-[12px] font-[800] text-emerald-800 transition hover:bg-emerald-500/25 dark:text-emerald-100"
              >
                Usar Sistema de design
              </button>
            </div>
          )}

          {/* Fase 1 — preview verdadeiro (mesmo HTML do PNG final) */}
          {renderMode === 'design_system' && plan?.slides?.length ? (
            <DesignLivePreview
              plan={plan}
              designSizeId={designSizeId}
              designHandle={designHandle}
              brandColors={brandColors || ''}
              brandFonts={brandFonts}
              designRecipe={designRecipe}
              query={plan.title}
            />
          ) : null}
        </div>

	                {showAdvanced && renderMode === 'ai_image' && (
	                  <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2 mb-[20px] p-[16px] bg-newBgColorInner rounded-[12px] border border-newTableBorder">
            <label className="flex flex-col gap-[8px]">
              <span className="text-[14px] font-[500]">
                Provedor de imagem
              </span>
              <select
                value={imageProvider}
                onChange={(event) =>
                  setImageProvider(event.target.value as 'ia_generate' | 'openai_official')
                }
                className={inputClass}
              >
                <option value="openai_official">OpenAI oficial</option>
                <option value="ia_generate">
                  Gerador interno
                </option>
              </select>
            </label>

            <label className="flex flex-col gap-[8px]">
              <span className="text-[14px] font-[500]">
                Modelo de imagem
              </span>
              <input
                value={imageModel}
                onChange={(event) => setImageModel(event.target.value)}
                className={inputClass}
                maxLength={128}
              />
            </label>

	                  </div>
	                )}

	                <div className="mb-[18px] rounded-[16px] border border-newTableBorder bg-newBgColorInner p-[16px]">
	                  <div className="mb-[12px] flex flex-wrap items-center justify-between gap-[10px]">
	                    <div>
	                      <div className="text-[14px] font-[900] text-textPrimary">
	                        Exportação profissional
	                      </div>
	                      <p className="text-[12px] text-textItemBlur">
	                        O pacote exporta PNGs redimensionados, PDF, legenda e JSON do projeto.
	                      </p>
	                    </div>
	                    <label className="flex items-center gap-[8px] text-[12px] font-[800] text-textItemBlur">
	                      <input
	                        type="checkbox"
	                        checked={includePdfExport}
	                        onChange={(event) =>
	                          setIncludePdfExport(event.target.checked)
	                        }
	                      />
	                      Incluir PDF
	                    </label>
	                  </div>
	                  <div className="grid grid-cols-1 gap-[10px] md:grid-cols-[1fr_100px_100px]">
	                    <div className="flex flex-wrap gap-[8px]">
	                      {[
	                        { label: 'Instagram 1:1', width: 1080, height: 1080 },
	                        { label: 'Instagram 4:5', width: 1080, height: 1350 },
	                        { label: 'LinkedIn 1:1', width: 1200, height: 1200 },
	                      ].map((preset) => (
	                        <button
	                          key={preset.label}
	                          type="button"
	                          onClick={() => {
	                            setExportWidth(preset.width);
	                            setExportHeight(preset.height);
	                          }}
	                          className={`rounded-[10px] border px-[10px] py-[8px] text-[12px] font-[800] ${
	                            exportWidth === preset.width &&
	                            exportHeight === preset.height
	                              ? 'border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950'
	                              : 'border-newTableBorder hover:border-stone-500/50'
	                          }`}
	                        >
	                          {preset.label}
	                        </button>
	                      ))}
	                    </div>
	                    <input
	                      type="number"
	                      value={exportWidth}
	                      onChange={(event) =>
	                        setExportWidth(
	                          Math.max(600, Math.min(2400, Number(event.target.value) || 1080))
	                        )
	                      }
	                      className={inputClass}
	                      aria-label="Largura da exportação"
	                    />
	                    <input
	                      type="number"
	                      value={exportHeight}
	                      onChange={(event) =>
	                        setExportHeight(
	                          Math.max(600, Math.min(2400, Number(event.target.value) || 1080))
	                        )
	                      }
	                      className={inputClass}
	                      aria-label="Altura da exportação"
	                    />
		                  </div>
		                </div>

		                <div className="mb-[18px] rounded-[16px] border border-black/10 bg-stone-50 p-[16px] dark:border-white/10 dark:bg-white/5">
		                  <div className="mb-[12px] flex flex-wrap items-start justify-between gap-[12px]">
		                    <div>
		                      <div className="text-[14px] font-[900] text-black dark:text-white">
		                        Custos e limites
		                      </div>
		                      <p className="text-[12px] text-black/55 dark:text-white/55">
		                        Estimativa antes da geração, consumo da sessão e alerta de orçamento.
		                      </p>
		                    </div>
		                    <button
		                      type="button"
		                      onClick={estimateGenerationCost}
		                      className="rounded-[10px] border border-black/10 bg-white px-[12px] py-[8px] text-[12px] font-[900] text-black/70 hover:bg-stone-50 dark:border-white/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
		                    >
		                      Recalcular estimativa
		                    </button>
		                  </div>
		                  <div className="grid grid-cols-1 gap-[10px] md:grid-cols-4">
		                    <div className="rounded-[12px] border border-black/10 bg-white p-[12px] dark:border-white/10 dark:bg-black/20">
		                      <div className="text-[11px] font-[800] uppercase text-black/45 dark:text-white/50">
		                        Estimativa próxima geração
		                      </div>
		                      <div className="mt-[5px] text-[15px] font-[900] text-black dark:text-white">
		                        {preflightEstimate
		                          ? formatCurrency(preflightEstimate.brl, 'BRL')
		                          : 'Calculando...'}
		                      </div>
		                    </div>
		                    <div className="rounded-[12px] border border-black/10 bg-white p-[12px] dark:border-white/10 dark:bg-black/20">
		                      <div className="text-[11px] font-[800] uppercase text-black/45 dark:text-white/50">
		                        Consumo da sessão
		                      </div>
		                      <div className="mt-[5px] text-[15px] font-[900] text-black dark:text-white">
		                        {formatCurrency(costHistory?.totals.brl || 0, 'BRL')}
		                      </div>
		                    </div>
		                    <label className="rounded-[12px] border border-black/10 bg-white p-[12px] dark:border-white/10 dark:bg-black/20">
		                      <span className="text-[11px] font-[800] uppercase text-black/45 dark:text-white/50">
		                        Limite alerta BRL
		                      </span>
		                      <input
		                        type="number"
		                        value={costLimitBrl}
		                        onChange={(event) =>
		                          setCostLimitBrl(Math.max(1, Number(event.target.value) || 1))
		                        }
		                        className="mt-[6px] h-[34px] w-full rounded-[8px] border border-black/10 bg-white px-[9px] text-[13px] font-[800] text-black outline-none dark:border-white/10 dark:bg-black/30 dark:text-white"
		                      />
		                    </label>
		                    <label className="flex items-center gap-[8px] rounded-[12px] border border-black/10 bg-white p-[12px] dark:border-white/10 dark:bg-black/20 text-[12px] font-[800] text-yellow-100">
		                      <input
		                        type="checkbox"
		                        checked={allowOverBudget}
		                        onChange={(event) =>
		                          setAllowOverBudget(event.target.checked)
		                        }
		                      />
		                      Gerar mesmo acima do limite
		                    </label>
		                  </div>
		                  {(isOverUserLimit || isOverSoftLimit) && (
		                    <div className="mt-[10px] rounded-[10px] border border-red-400/30 bg-red-500/10 px-[12px] py-[9px] text-[12px] font-[800] text-red-100">
		                      Alerta: a projeção chega a{' '}
		                      {formatCurrency(projectedCostBrl, 'BRL')}. Revise o
		                      limite antes de gerar.
		                    </div>
		                  )}
		                  {!!costHistory?.entries?.length && (
		                    <div className="mt-[10px] max-h-[120px] overflow-y-auto rounded-[10px] border border-black/10 bg-white p-[10px] dark:border-white/10 dark:bg-black/20">
		                      {costHistory.entries.slice(0, 6).map((entry) => (
		                        <div
		                          key={entry.id}
		                          className="flex items-center justify-between gap-[10px] border-b border-black/5 py-[6px] text-[11px] text-black/60 dark:border-white/5 dark:text-white/60 last:border-b-0"
		                        >
		                          <span className="truncate">{entry.label}</span>
		                          <strong>{formatCurrency(entry.cost.brl, 'BRL')}</strong>
		                        </div>
		                      ))}
		                    </div>
		                  )}
		                </div>

		                {generatingImages &&
		                  !(imageJob && ['queued', 'running'].includes(imageJob.status)) && (
		                  <div className="mb-[18px] flex flex-col gap-[10px] rounded-[16px] border border-primary/20 bg-primary/5 p-[16px]">
		                    <div className="flex items-center gap-[10px] text-[13px] font-[800] text-primary">
		                      <Spinner size={16} />
		                      <span className="flex items-center">
		                        Preparando a fila de imagens
		                        <AnimatedDots />
		                      </span>
		                    </div>
		                    <IndeterminateBar />
		                  </div>
		                )}

		                {imageJob && ['queued', 'running'].includes(imageJob.status) && (
	                  <div className="mb-[18px] rounded-[16px] border border-stone-500/20 bg-stone-500/10 p-[16px]">
	                    <div className="mb-[10px] flex items-center justify-between gap-[12px] text-[13px] font-[900] text-stone-800 dark:text-stone-100">
	                      <span>Fila de imagens em andamento</span>
	                      <span>{imageJobProgress}%</span>
	                    </div>
	                    <div className="h-[8px] overflow-hidden rounded-full bg-white/10">
	                      <div
	                        className="h-full rounded-full bg-stone-900 transition-all dark:bg-stone-100"
	                        style={{ width: `${imageJobProgress}%` }}
	                      />
	                    </div>
	                    <div className="mt-[10px] text-[12px] text-stone-700 dark:text-stone-200">
	                      {imageJob.completed} concluídas, {imageJob.failed} com erro, {imageJob.total} no total.
	                    </div>
	                  </div>
	                )}

	                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-[16px]">
          <Button
            type="button"
            loading={generatingImages}
            disabled={imageDisabled}
            title={imageDisabledReason || undefined}
            onClick={generateCarouselImages}
            className="rounded-[10px] !h-[48px] !px-8 text-[15px] font-[700]"
          >
            Criar {plan.slides.length} imagens com texto
          </Button>
          {imageDisabled && imageDisabledReason && !generatingImages && (
            <div className="max-w-[320px] rounded-[10px] border border-yellow-500/20 bg-yellow-500/10 px-[12px] py-[9px] text-[12px] font-[800] text-yellow-700 dark:text-yellow-100">
              {imageDisabledReason}
            </div>
          )}

          {generatingImages && (
            <button
              type="button"
              onClick={cancelCarouselGeneration}
              className="rounded-[10px] border border-red-500/30 bg-red-500/10 px-5 py-[12px] text-[14px] font-[700] text-red-600 hover:bg-red-500/15 dark:text-red-300"
            >
              Cancelar geração
            </button>
          )}

          <Button
            type="button"
            loading={savingCarousel}
            disabled={!canSaveCarousel}
            onClick={saveCarouselToMedia}
            className="rounded-[10px] !h-[48px] !px-8 text-[15px] font-[700]"
          >
            Salvar carrossel na mídia
          </Button>

          <Button
            type="button"
            loading={exportingPackage}
            disabled={!plan}
            onClick={exportCarouselPackage}
            className="rounded-[10px] !h-[48px] !px-8 text-[15px] font-[700]"
          >
            Exportar pacote .zip
          </Button>
          <Button
            type="button"
            loading={savingCarousel || navigating}
            disabled={!hasGeneratedImages || savingCarousel || generatingImages}
            onClick={handleCreatePost}
            className="rounded-[10px] !h-[48px] !px-8 text-[15px] font-[700]"
          >
            Criar post / Agendar
          </Button>

          {Object.keys(slideImages).length > 0 && (
            <span className="text-[14px] font-[500] text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {generatedSlides.length} de {plan.slides.length} imagens
              prontas
            </span>
          )}
        </div>
        {error && (
          <div className="mt-[12px] flex items-start gap-2 rounded-[10px] border border-red-500/40 bg-red-500/10 px-[14px] py-[10px] text-[13px] font-[600] text-red-500 dark:text-red-300">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-[1px] shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        {savedCarouselCount > 0 && (
          <div className="mt-[12px] rounded-[10px] border border-emerald-500/25 bg-emerald-500/10 px-[14px] py-[10px] text-[13px] font-[600] text-emerald-700 dark:text-emerald-300">
            Carrossel salvo em /media como projeto com{' '}
            {savedCarouselCount} slides
            {savedCarouselProject ? `: ${savedCarouselProject}` : ''}.
            <span className="mt-[4px] block text-[12px] font-[500] text-emerald-700/80 dark:text-emerald-300/80">
              Inclui empresa, Brand Kit, brief final, inspirações,
              copy, modelos e estimativa de custo.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
