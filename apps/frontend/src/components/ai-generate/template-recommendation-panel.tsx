'use client';

import { Sparkles, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { TemplateRecommendation } from './template-registry.types';
import { Spinner } from './ai-generate-images.loaders';

type TemplateRecommendationPanelProps = {
  recommendations: TemplateRecommendation[];
  onSelect: (templateId: string) => void;
  selectedTemplateId?: string;
  loading?: boolean;
  onShowAll?: () => void;
};

/**
 * Horizontal card panel that shows the top 3-5 AI-recommended templates.
 * Each card displays: template name, reason, confidence bar, and narrative preview.
 */
export function TemplateRecommendationPanel({
  recommendations,
  onSelect,
  selectedTemplateId,
  loading = false,
  onShowAll,
}: TemplateRecommendationPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Skeleton state while loading
  if (loading) {
    return (
      <div className="rounded-[16px] border border-black/10 bg-white p-[20px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
        <div className="mb-[14px] flex items-center gap-[10px]">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-200">
            <Spinner size={18} />
          </span>
          <div>
            <h3 className="text-[18px] font-[800] text-black dark:text-white">
              Recomendações de template
            </h3>
            <p className="text-[13px] text-black/55 dark:text-white/55">
              Analisando seu conteúdo para sugerir os melhores templates...
            </p>
          </div>
        </div>

        <div className="flex gap-[12px] overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[160px] w-[240px] shrink-0 animate-pulse rounded-[12px] border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex h-full flex-col justify-between p-[14px]">
                <div className="space-y-[8px]">
                  <div className="h-[14px] w-2/3 rounded-full bg-black/10 dark:bg-white/10" />
                  <div className="h-[10px] w-full rounded-full bg-black/10 dark:bg-white/10" />
                  <div className="h-[10px] w-4/5 rounded-full bg-black/10 dark:bg-white/10" />
                </div>
                <div className="space-y-[6px]">
                  <div className="h-[6px] w-full rounded-full bg-black/10 dark:bg-white/10" />
                  <div className="h-[8px] w-1/2 rounded-full bg-black/10 dark:bg-white/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Don't render if no recommendations
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const displayRecommendations = recommendations.slice(0, 5);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500 dark:bg-green-400';
    if (confidence >= 0.6) return 'bg-blue-500 dark:bg-blue-400';
    if (confidence >= 0.4) return 'bg-yellow-500 dark:bg-yellow-400';
    return 'bg-stone-400 dark:bg-stone-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'Ótima';
    if (confidence >= 0.6) return 'Boa';
    if (confidence >= 0.4) return 'Razoável';
    return 'Baixa';
  };

  return (
    <div className="rounded-[16px] border border-black/10 bg-white p-[20px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
      <div className="mb-[14px] flex flex-wrap items-center justify-between gap-[12px]">
        <div className="flex items-center gap-[10px]">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-200">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="text-[18px] font-[800] text-black dark:text-white">
              Recomendações de template
            </h3>
            <p className="text-[13px] text-black/55 dark:text-white/55">
              Baseadas no seu tema e objetivo, estes templates são os mais adequados.
            </p>
          </div>
        </div>
        {onShowAll && (
          <button
            type="button"
            onClick={onShowAll}
            className="flex items-center gap-[6px] rounded-[10px] border border-black/10 bg-white px-[12px] py-[8px] text-[12px] font-[800] text-black transition hover:border-stone-500/40 hover:bg-stone-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            Ver todos os templates
            <ArrowRight className="h-[14px] w-[14px]" />
          </button>
        )}
      </div>

      <div className="flex gap-[12px] overflow-x-auto pb-[4px]">
        {displayRecommendations.map((rec) => {
          const isSelected = selectedTemplateId === rec.templateId;
          const isExpanded = expandedId === rec.templateId;
          const confidencePct = Math.round(rec.confidence * 100);

          return (
            <button
              key={rec.templateId}
              type="button"
              onClick={() => onSelect(rec.templateId)}
              className={`group flex w-[260px] shrink-0 flex-col rounded-[12px] border p-[14px] text-left transition ${
                isSelected
                  ? 'border-stone-950 bg-stone-950 text-white shadow-md dark:border-white dark:bg-white dark:text-stone-950'
                  : 'border-black/10 bg-white hover:border-stone-500/50 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20'
              }`}
            >
              {/* Header */}
              <div className="mb-[10px] flex items-start justify-between gap-[8px]">
                <h4 className="text-[14px] font-[800] leading-tight text-current">
                  {rec.name}
                </h4>
                {isSelected && (
                  <span className="shrink-0 rounded-full bg-white px-[8px] py-[2px] text-[10px] font-[800] text-stone-950 dark:bg-stone-950 dark:text-white">
                    Selecionado
                  </span>
                )}
              </div>

              {/* Reason */}
              <p className={`mb-[10px] text-[12px] leading-[1.4] ${
                isSelected ? 'text-white/75 dark:text-stone-950/75' : 'text-black/55 dark:text-white/55'
              }`}>
                {rec.reason}
              </p>

              {/* Confidence bar */}
              <div className="mb-[10px]">
                <div className="mb-[4px] flex items-center justify-between">
                  <span className={`text-[11px] font-[600] ${
                    isSelected ? 'text-white/60 dark:text-stone-950/60' : 'text-black/40 dark:text-white/40'
                  }`}>
                    {getConfidenceLabel(rec.confidence)}
                  </span>
                  <span className={`text-[11px] font-[800] ${
                    isSelected ? 'text-white/80 dark:text-stone-950/80' : 'text-black/60 dark:text-white/60'
                  }`}>
                    {confidencePct}%
                  </span>
                </div>
                <div className={`h-[4px] w-full rounded-full overflow-hidden ${
                  isSelected ? 'bg-white/20 dark:bg-stone-950/20' : 'bg-black/10 dark:bg-white/10'
                }`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getConfidenceColor(rec.confidence)}`}
                    style={{ width: `${confidencePct}%` }}
                  />
                </div>
              </div>

              {/* Narrative preview — expandable */}
              {rec.narrativePreview && (
                <div className="mt-auto">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setExpandedId(isExpanded ? null : rec.templateId);
                    }}
                    className={`flex w-full items-center gap-[4px] text-[11px] font-[600] transition ${
                      isSelected
                        ? 'text-white/60 hover:text-white/80 dark:text-stone-950/60 dark:hover:text-stone-950/80'
                        : 'text-black/40 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60'
                    }`}
                  >
                    {isExpanded ? 'Ocultar narrativa' : 'Ver narrativa'}
                    {isExpanded ? (
                      <ChevronUp className="h-[12px] w-[12px]" />
                    ) : (
                      <ChevronDown className="h-[12px] w-[12px]" />
                    )}
                  </button>
                  {isExpanded && (
                    <p className={`mt-[6px] text-[12px] leading-[1.4] ${
                      isSelected ? 'text-white/65 dark:text-stone-950/65' : 'text-black/50 dark:text-white/50'
                    }`}>
                      {rec.narrativePreview}
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
