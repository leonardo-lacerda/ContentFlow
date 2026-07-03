'use client';

import { AlertTriangle, Sparkles, Play, X } from 'lucide-react';
import type { EditorialReview } from './ai-generate-images.types';

type EditorialBlockModalProps = {
  review: EditorialReview;
  threshold: number;
  onFix: () => void;
  onOverride: () => void;
  onDismiss: () => void;
  correcting?: boolean;
};

/**
 * Blocking modal shown when editorial score is below threshold.
 * Offers three actions: fix with AI, override/generate anyway, or dismiss.
 */
export function EditorialBlockModal({
  review,
  threshold,
  onFix,
  onOverride,
  onDismiss,
  correcting,
}: EditorialBlockModalProps) {
  const score = review.score ?? 0;
  const scoreColor =
    score >= 80
      ? 'bg-emerald-500'
      : score >= 60
        ? 'bg-amber-500'
        : 'bg-red-500';
  const scoreTextColor =
    score >= 80
      ? 'text-emerald-500'
      : score >= 60
        ? 'text-amber-500'
        : 'text-red-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-[16px] w-full max-w-[420px] rounded-[18px] border border-black/10 bg-white p-[24px] shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
        {/* Close button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-[16px] top-[16px] text-black/30 hover:text-black/60 dark:text-white/30 dark:hover:text-white/60"
        >
          <X className="h-[18px] w-[18px]" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-[12px] mb-[16px]">
          <div className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] bg-red-500/10">
            <AlertTriangle className="h-[20px] w-[20px] text-red-500" />
          </div>
          <div>
            <h3 className="text-[16px] font-[800] text-black dark:text-white">
              Qualidade abaixo do mínimo
            </h3>
            <p className="text-[12px] text-black/50 dark:text-white/50">
              Score: <span className={`font-[800] ${scoreTextColor}`}>{score}</span>
              /100 (mínimo: {threshold})
            </p>
          </div>
        </div>

        {/* Score progress bar */}
        <div className="mb-[16px]">
          <div className="flex items-center justify-between mb-[4px]">
            <span className="text-[11px] font-[700] text-black/40 dark:text-white/40">
              Score editorial
            </span>
            <span className={`text-[12px] font-[800] ${scoreTextColor}`}>
              {score}%
            </span>
          </div>
          <div className="h-[6px] w-full rounded-full bg-black/10 dark:bg-white/10">
            <div
              className={`h-[6px] rounded-full transition-all ${scoreColor}`}
              style={{ width: `${Math.min(score, 100)}%` }}
            />
          </div>
          {/* Threshold marker */}
          <div className="relative h-[8px]">
            <div
              className="absolute top-0 h-[8px] w-[2px] bg-red-500/60"
              style={{ left: `${threshold}%` }}
            />
          </div>
        </div>

        {/* Issues summary */}
        {review.issues?.length > 0 && (
          <div className="space-y-[4px] mb-[20px] max-h-[120px] overflow-y-auto rounded-[10px] bg-black/[0.02] p-[10px] dark:bg-white/[0.03]">
            {review.issues.slice(0, 5).map((issue, idx) => {
              const isBlocker = issue.type === 'blocker' || issue.severity === 'high';
              return (
                <div
                  key={idx}
                  className="flex items-start gap-[6px] text-[12px]"
                >
                  <span
                    className={`mt-[5px] h-[5px] w-[5px] shrink-0 rounded-full ${
                      isBlocker ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-black/60 dark:text-white/60">
                    {issue.slideIndex != null || issue.slide != null
                      ? `Slide ${(issue.slideIndex ?? issue.slide ?? 0) + 1}: `
                      : ''}
                    {issue.message || issue.issue}
                  </span>
                </div>
              );
            })}
            {review.issues.length > 5 && (
              <div className="text-[11px] text-black/40 dark:text-white/40 pl-[11px]">
                +{review.issues.length - 5} outros problemas
              </div>
            )}
          </div>
        )}

        {/* Forbidden terms warning */}
        {review.forbiddenTermMatches?.length > 0 && (
          <div className="mb-[16px] rounded-[10px] bg-red-500/5 p-[10px] border border-red-500/15">
            <div className="text-[11px] font-[700] text-red-600 dark:text-red-400 mb-[4px]">
              ⚠ Termos proibidos encontrados:
            </div>
            <div className="flex flex-wrap gap-[4px]">
              {review.forbiddenTermMatches.map((match, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full bg-red-500/10 px-[6px] py-[1px] text-[10px] font-[600] text-red-600 dark:text-red-300"
                >
                  &ldquo;{match.term}&rdquo; (Slide {match.slideIndex + 1})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-[8px]">
          <button
            type="button"
            onClick={onFix}
            disabled={correcting}
            className="flex items-center justify-center gap-[8px] rounded-[12px] bg-stone-900 px-[16px] py-[12px] text-[13px] font-[800] text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100"
          >
            <Sparkles className="h-[14px] w-[14px]" />
            {correcting ? 'Corrigindo...' : 'Corrigir com IA e tentar novamente'}
          </button>
          <button
            type="button"
            onClick={onOverride}
            className="flex items-center justify-center gap-[8px] rounded-[12px] border border-black/10 px-[16px] py-[12px] text-[13px] font-[700] text-black/60 transition hover:bg-black/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
          >
            <Play className="h-[14px] w-[14px]" />
            Gerar mesmo assim (ignorar aviso)
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[12px] text-black/40 transition hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
