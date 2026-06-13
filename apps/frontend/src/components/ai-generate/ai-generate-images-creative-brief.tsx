import { useState } from 'react';
import type {
  CompanyProfile,
  EditorialReview,
  ReferenceImage,
} from './ai-generate-images.types';
import {
  colorPresets,
  structurePresets,
  stylePresets,
  typographyPresets,
} from './ai-generate-images.presets';

type CreativeBriefPanelProps = {
  applyEditorialQuickFixes: () => void;
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
  setFinalCreativeBrief: (value: string) => void;
  structurePreset: string;
  setStructurePreset: (id: string) => void;
  colorPreset: string;
  setColorPreset: (id: string) => void;
  stylePreset: string;
  setStylePreset: (id: string) => void;
  typographyPreset: string;
  setTypographyPreset: (id: string) => void;
  inspirationsLeadVisual: boolean;
  setInspirationsLeadVisual: (value: boolean) => void;
};

type ChipOption = { id: string; label: string; swatch?: string[] };

function PresetRow({
  title,
  hint,
  options,
  value,
  onChange,
  disabled,
}: {
  title: string;
  hint?: string;
  options: ChipOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
      <div className="flex items-baseline gap-[8px]">
        <span className="text-[12px] font-[800] text-black dark:text-white">
          {title}
        </span>
        {hint && (
          <span className="text-[11px] text-black/45 dark:text-white/45">
            {hint}
          </span>
        )}
      </div>
      <div className="mt-[6px] flex flex-wrap gap-[6px]">
        {options.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`flex items-center gap-[6px] rounded-[999px] border px-[11px] py-[6px] text-[12px] font-[700] transition ${
                active
                  ? 'border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950'
                  : 'border-black/10 bg-white text-black/70 hover:border-stone-500/40 hover:bg-stone-50 dark:border-white/15 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10'
              }`}
            >
              {!!option.swatch?.length && (
                <span className="flex">
                  {option.swatch.slice(0, 3).map((color, index) => (
                    <span
                      key={`${option.id}-${index}`}
                      className="h-[12px] w-[12px] rounded-full border border-black/10 dark:border-white/20"
                      style={{
                        backgroundColor: color,
                        marginLeft: index ? -4 : 0,
                      }}
                    />
                  ))}
                </span>
              )}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CreativeBriefPanel(props: CreativeBriefPanelProps) {
  const {
    applyEditorialQuickFixes,
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
    setFinalCreativeBrief,
    structurePreset,
    setStructurePreset,
    colorPreset,
    setColorPreset,
    stylePreset,
    setStylePreset,
    typographyPreset,
    setTypographyPreset,
    inspirationsLeadVisual,
    setInspirationsLeadVisual,
  } = props;

  const [showAdvancedBrief, setShowAdvancedBrief] = useState(false);

  const hasInspirations = selectedReferences.length > 0;
  const inspirationsLead = hasInspirations && inspirationsLeadVisual;

  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-[28px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
      <div className="mb-[14px] flex items-start gap-[12px]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-500/20 bg-stone-500/10 text-[15px] font-[900] text-stone-800 dark:text-stone-100">
          2
        </div>
        <div>
          <h3 className="text-[22px] font-[800] text-black dark:text-white">
            Estilo das artes
          </h3>
          <p className="mt-[4px] max-w-[760px] text-[14px] leading-relaxed text-black/60 dark:text-white/60">
            Escolha blocos prontos — o sistema monta o prompt perfeito por
            você. Não precisa escrever nada. A estrutura define o layout; cor,
            estilo e tipografia definem o visual.
          </p>
        </div>
      </div>

      {/* Inspirações no comando */}
      {hasInspirations && (
        <div className="mb-[14px] flex items-center justify-between gap-[12px] rounded-[14px] border border-stone-500/20 bg-stone-500/[0.06] p-[14px] dark:border-white/10 dark:bg-white/[0.04]">
          <div>
            <div className="text-[13px] font-[800] text-black dark:text-white">
              Deixar as {selectedReferences.length} inspiração(ões) comandarem o
              visual
            </div>
            <p className="mt-[2px] text-[12px] text-black/55 dark:text-white/60">
              Ligado, as artes seguem fielmente as imagens selecionadas (cor,
              estilo e tipografia vêm delas). Desligado, valem os blocos abaixo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInspirationsLeadVisual(!inspirationsLeadVisual)}
            className={`relative h-[28px] w-[50px] shrink-0 rounded-full transition ${
              inspirationsLeadVisual
                ? 'bg-stone-950 dark:bg-white'
                : 'bg-black/15 dark:bg-white/20'
            }`}
            aria-pressed={inspirationsLeadVisual}
          >
            <span
              className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-all dark:bg-stone-950 ${
                inspirationsLeadVisual ? 'left-[25px]' : 'left-[3px]'
              }`}
            />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-[16px] rounded-[14px] border border-black/10 bg-stone-50 p-[16px] dark:border-white/10 dark:bg-black/20">
        <PresetRow
          title="Estrutura do slide"
          hint="layout do texto"
          options={structurePresets}
          value={structurePreset}
          onChange={setStructurePreset}
        />
        <PresetRow
          title="Cores"
          hint={inspirationsLead ? 'definidas pelas inspirações' : undefined}
          options={colorPresets.map((preset) =>
            preset.id === 'brand'
              ? {
                  ...preset,
                  swatch: brandColors
                    .split(',')
                    .map((color) => color.trim())
                    .filter(Boolean)
                    .slice(0, 3),
                }
              : preset
          )}
          value={colorPreset}
          onChange={setColorPreset}
          disabled={inspirationsLead}
        />
        <PresetRow
          title="Estilo visual"
          hint={inspirationsLead ? 'definido pelas inspirações' : undefined}
          options={stylePresets}
          value={stylePreset}
          onChange={setStylePreset}
          disabled={inspirationsLead}
        />
        <PresetRow
          title="Tipografia"
          hint={inspirationsLead ? 'definida pelas inspirações' : undefined}
          options={typographyPresets}
          value={typographyPreset}
          onChange={setTypographyPreset}
          disabled={inspirationsLead}
        />
      </div>

      {/* Brief avançado (opcional) */}
      <div className="mt-[14px]">
        <button
          type="button"
          onClick={() => setShowAdvancedBrief((current) => !current)}
          className="text-[12px] font-[800] text-black/55 underline-offset-2 hover:underline dark:text-white/55"
        >
          {showAdvancedBrief
            ? 'Ocultar instruções avançadas'
            : 'Instruções avançadas (opcional) — editar texto do brief'}
        </button>
        {showAdvancedBrief && (
          <div className="mt-[10px]">
            <div className="mb-[8px] flex items-center justify-between">
              <span className="text-[12px] text-black/55 dark:text-white/60">
                Texto extra enviado junto (contexto de marca, regras, CTA).
              </span>
              <button
                type="button"
                onClick={refreshCreativeBrief}
                className="rounded-[10px] border border-black/10 bg-white px-[12px] py-[7px] text-[11px] font-[900] text-black/70 hover:bg-stone-50 dark:border-white/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
              >
                Atualizar com dados atuais
              </button>
            </div>
            <textarea
              value={finalCreativeBrief || computedCreativeBrief}
              onChange={(event) => setFinalCreativeBrief(event.target.value)}
              className="min-h-[160px] w-full resize-y rounded-[12px] border border-black/10 bg-stone-50 p-[16px] text-[13px] leading-relaxed text-black outline-none placeholder:text-black/35 focus:border-stone-500/40 dark:border-white/10 dark:bg-black/25 dark:text-white dark:placeholder:text-white/35"
              maxLength={3000}
            />
          </div>
        )}
      </div>

      <div className="mt-[12px] grid grid-cols-1 gap-[8px] text-[12px] text-black/55 dark:text-white/60 md:grid-cols-3">
        <span className="rounded-[999px] border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/5 px-[10px] py-[7px]">
          Empresa: {companyProfile?.companyName || 'não selecionada'}
        </span>
        <span className="rounded-[999px] border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/5 px-[10px] py-[7px]">
          Inspirações: {selectedReferences.length}/3
        </span>
        <span className="rounded-[999px] border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/5 px-[10px] py-[7px]">
          {inspirationsLead ? 'Inspirações no comando' : 'Blocos no comando'}
        </span>
      </div>

      <div className="mt-[14px] flex flex-wrap gap-[10px]">
        <button
          type="button"
          onClick={() => reviewCarouselQuality()}
          disabled={reviewingEditorial}
          className="rounded-[10px] border border-white/10 bg-white/10 px-[14px] py-[9px] text-[12px] font-[900] text-black/70 hover:bg-black/5 dark:text-white dark:hover:bg-white/15 disabled:opacity-50"
        >
          {reviewingEditorial ? 'Revisando...' : 'Rodar crítica editorial'}
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
            {correctingEditorial ? 'Corrigindo...' : 'Corrigir slides'}
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
    </div>
  );
}
