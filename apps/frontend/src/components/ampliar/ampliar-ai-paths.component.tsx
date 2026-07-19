'use client';

import { Sparkles, Loader, CheckCircle2 } from 'lucide-react';
import { Button } from '@gitroom/react/form/button';
import type { AmpliarAiPath } from './ampliar-ai-presets';

type Props = {
  title?: string;
  description?: string;
  paths: AmpliarAiPath[];
  loadingId?: string | null;
  disabled?: boolean;
  onSelect: (path: AmpliarAiPath) => void;
  /** Abre formulário avançado */
  onAdvanced?: () => void;
  advancedLabel?: string;
};

/**
 * Escolha assistida por IA: cards com caminho recomendado + 1 clique para gerar.
 */
export function AmpliarAiPaths({
  title = 'A IA montou caminhos pra você',
  description = 'Escolha um card — a gente preenche objetivo, formato e tom com base no DNA e na ideia. Sem formulário longo.',
  paths,
  loadingId,
  disabled,
  onSelect,
  onAdvanced,
  advancedLabel = 'Quero escolher manualmente',
}: Props) {
  const sorted = [...paths].sort((a, b) => Number(b.recommended) - Number(a.recommended));

  return (
    <div className="rounded-[14px] border border-newTableBorder bg-newSettings p-4 md:p-5 mb-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-[12px] bg-boxFocused flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-newTextColor" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-[700] text-newTextColor">{title}</h3>
          <p className="text-[12px] text-textItemBlur mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((path) => {
          const busy = loadingId === path.id;
          return (
            <button
              key={path.id}
              type="button"
              disabled={disabled || Boolean(loadingId)}
              onClick={() => onSelect(path)}
              className={`text-left rounded-[12px] border p-3.5 transition-colors ${
                path.recommended
                  ? 'border-btnPrimary/40 bg-btnPrimary/5 hover:bg-btnPrimary/10'
                  : 'border-newTableBorder bg-newBgColorInner hover:border-newTextColor/20'
              } disabled:opacity-60`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-[13px] font-[700] text-newTextColor leading-snug">
                  {path.title}
                </span>
                {path.badge ? (
                  <span className="shrink-0 text-[10px] font-[700] uppercase tracking-wide px-2 py-0.5 rounded-full bg-btnPrimary/15 text-newTextColor">
                    {path.badge}
                  </span>
                ) : null}
              </div>
              <p className="text-[12px] text-newTextColor/90 mb-2">{path.subtitle}</p>
              <p className="text-[11px] text-textItemBlur leading-relaxed flex gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-70" />
                <span>{path.why}</span>
              </p>
              <div className="mt-3 flex items-center gap-2 text-[12px] font-[600] text-newTextColor">
                {busy ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    Gerando com IA…
                  </>
                ) : (
                  <>Gerar com IA →</>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {onAdvanced ? (
        <div className="mt-4 flex justify-end">
          <Button secondary onClick={onAdvanced} disabled={Boolean(loadingId)} className="!h-9 !text-xs">
            {advancedLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
