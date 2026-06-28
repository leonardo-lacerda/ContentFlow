'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  Sparkles,
} from 'lucide-react';
import type { EditorialIssue, EditorialReview } from './ai-generate-images.types';
import { EditorialIssueBadge } from './editorial-issue-badge';

const severityConfig: Record<
  string,
  { icon: typeof AlertCircle; colorClass: string; bgClass: string }
> = {
  low: {
    icon: AlertTriangle,
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-500/10 dark:bg-blue-400/10',
  },
  medium: {
    icon: AlertTriangle,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-500/10 dark:bg-amber-400/10',
  },
  high: {
    icon: AlertCircle,
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-500/10 dark:bg-red-400/10',
  },
};

function getSeverityConfig(severity: string) {
  return severityConfig[severity] ?? severityConfig.medium;
}

type EditorialReviewPanelProps = {
  editorialIssues?: EditorialIssue[];
  editorialReview?: EditorialReview | null;
  reviewingEditorial?: boolean;
  correctingEditorial?: boolean;
  onRunReview?: () => void;
  onApplyQuickFixes?: () => void;
  onFixWithAi?: () => void;
  autoReviewBeforeImages?: boolean;
  onToggleAutoReview?: (value: boolean) => void;
  allowGenerateWithReviewIssues?: boolean;
  onToggleAllowGenerate?: (value: boolean) => void;
};

/**
 * Unified editorial review panel combining local client-side issues and
 * backend (AI-powered) review. Includes auto-review gate controls.
 */
export function EditorialReviewPanel(props: EditorialReviewPanelProps) {
  const {
    editorialIssues = [],
    editorialReview,
    reviewingEditorial = false,
    correctingEditorial = false,
    onRunReview,
    onApplyQuickFixes,
    onFixWithAi,
    autoReviewBeforeImages = true,
    onToggleAutoReview,
    allowGenerateWithReviewIssues = false,
    onToggleAllowGenerate,
  } = props;

  const [expanded, setExpanded] = useState(true);

  const hasIssues = editorialIssues.length > 0;
  const hasReviewIssues = !!editorialReview?.issues?.length;
  const totalIssues =
    editorialIssues.length + (editorialReview?.issues?.length || 0);
  const score = editorialReview?.score;
  const scoreColor =
    score != null
      ? score >= 80
        ? 'text-emerald-600 dark:text-emerald-400'
        : score >= 50
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-red-600 dark:text-red-400'
      : '';

  if (!hasIssues && !editorialReview && !reviewingEditorial) {
    return null;
  }

  return (
    <div className="rounded-[14px] border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#101010]">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between p-[16px] text-left transition hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-[10px]">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-200">
            <Shield className="h-[16px] w-[16px]" />
          </span>
          <div>
            <h4 className="text-[14px] font-[800] text-black dark:text-white">
              Revisão editorial
            </h4>
            <p className="text-[12px] text-black/45 dark:text-white/45">
              {totalIssues > 0
                ? `${totalIssues} problema${totalIssues !== 1 ? 's' : ''} encontrado${totalIssues !== 1 ? 's' : ''}`
                : reviewingEditorial
                  ? 'Verificando...'
                  : 'Nenhum problema encontrado'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-[8px]">
          {score != null && (
            <span
              className={`rounded-[8px] bg-black/[0.04] px-[10px] py-[4px] text-[12px] font-[800] dark:bg-white/[0.06] ${scoreColor}`}
            >
              {score}/100
            </span>
          )}
          <span className="text-black/30 dark:text-white/30">
            {expanded ? (
              <ChevronUp className="h-[18px] w-[18px]" />
            ) : (
              <ChevronDown className="h-[18px] w-[18px]" />
            )}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-[12px] border-t border-black/5 px-[16px] pb-[16px] dark:border-white/5">
          {/* Auto-review gate controls */}
          <div className="flex flex-wrap items-center gap-[12px] pt-[12px]">
            <label className="flex cursor-pointer items-center gap-[6px] text-[12px] font-[700] text-black/70 dark:text-white/70">
              <input
                type="checkbox"
                checked={autoReviewBeforeImages}
                onChange={(e) => onToggleAutoReview?.(e.target.checked)}
                className="h-[14px] w-[14px] rounded accent-stone-900 dark:accent-white"
              />
              Bloquear geração com problemas
            </label>
            {hasIssues && (
              <label className="flex cursor-pointer items-center gap-[6px] text-[12px] font-[700] text-black/70 dark:text-white/70">
                <input
                  type="checkbox"
                  checked={allowGenerateWithReviewIssues}
                  onChange={(e) => onToggleAllowGenerate?.(e.target.checked)}
                  className="h-[14px] w-[14px] rounded accent-stone-900 dark:accent-white"
                />
                Gerar mesmo assim
              </label>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-[8px]">
            {onRunReview && (
              <button
                type="button"
                onClick={onRunReview}
                disabled={reviewingEditorial}
                className="flex items-center gap-[6px] rounded-[10px] border border-stone-950/10 bg-stone-950 px-[14px] py-[8px] text-[12px] font-[800] text-white transition hover:bg-stone-800 disabled:opacity-50 dark:border-white/10 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-100"
              >
                {reviewingEditorial ? (
                  <Loader2 className="h-[14px] w-[14px] animate-spin" />
                ) : (
                  <Sparkles className="h-[14px] w-[14px]" />
                )}
                {reviewingEditorial ? 'Revisando...' : 'Rodar crítica editorial'}
              </button>
            )}
            {onApplyQuickFixes && hasReviewIssues && (
              <button
                type="button"
                onClick={onApplyQuickFixes}
                className="flex items-center gap-[6px] rounded-[10px] border border-emerald-500/25 bg-emerald-500/10 px-[14px] py-[8px] text-[12px] font-[800] text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-200"
              >
                <CheckCircle2 className="h-[14px] w-[14px]" />
                Correções rápidas
              </button>
            )}
            {onFixWithAi && hasReviewIssues && (
              <button
                type="button"
                onClick={onFixWithAi}
                disabled={correctingEditorial}
                className="flex items-center gap-[6px] rounded-[10px] border border-stone-500/20 bg-stone-500/10 px-[14px] py-[8px] text-[12px] font-[800] text-stone-700 transition hover:bg-stone-500/15 disabled:opacity-50 dark:text-stone-100"
              >
                {correctingEditorial ? (
                  <Loader2 className="h-[14px] w-[14px] animate-spin" />
                ) : (
                  <Sparkles className="h-[14px] w-[14px]" />
                )}
                {correctingEditorial ? 'Corrigindo...' : 'Corrigir com IA'}
              </button>
            )}
          </div>

          {/* Local client-side issues (badges) */}
          {hasIssues && (
            <div className="flex flex-wrap gap-[6px]">
              {editorialIssues.map((issue, index) => (
                <EditorialIssueBadge
                  key={`${issue.slide}-${issue.label}-${index}`}
                  issue={issue}
                />
              ))}
            </div>
          )}

          {/* Backend review verdict + strengths */}
          {editorialReview && (
            <div className="space-y-[8px]">
              <p className="text-[13px] font-[800] text-black dark:text-white">
                {editorialReview.verdict}
              </p>
              {!!editorialReview.strengths?.length && (
                <p className="text-[12px] text-emerald-700 dark:text-emerald-300">
                  Pontos fortes: {editorialReview.strengths.join(', ')}
                </p>
              )}
            </div>
          )}

          {score != null && score < 60 && (
            <div className="flex items-center gap-[8px] rounded-[10px] border border-red-500/30 bg-red-500/10 px-[12px] py-[10px] dark:border-red-400/30 dark:bg-red-400/10">
              <AlertCircle className="h-[16px] w-[16px] shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-[12px] font-[700] text-red-700 dark:text-red-300">
                Nota abaixo de 60 — a geração será bloqueada até que o conteúdo seja melhorado.
              </p>
            </div>
          )}

          {/* Backend review issues */}
          {hasReviewIssues && (
            <div className="flex flex-col gap-[6px]">
              {editorialReview!.issues.map((issue, index) => {
                const config = getSeverityConfig(issue.severity);
                const SeverityIcon = config.icon;
                return (
                  <div
                    key={`${issue.issue}-${index}`}
                    className={`flex items-start gap-[10px] rounded-[10px] p-[10px] transition ${
                      index % 2 === 0
                        ? 'bg-black/[0.015] dark:bg-white/[0.015]'
                        : ''
                    }`}
                  >
                    <span
                      className={`mt-[1px] flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] ${config.bgClass}`}
                    >
                      <SeverityIcon
                        className={`h-[14px] w-[14px] ${config.colorClass}`}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-[2px] flex items-center gap-[6px]">
                        <span className="text-[13px] font-[700] text-black dark:text-white">
                          {issue.slide ? `Slide ${issue.slide}: ` : ''}
                          {issue.severity}
                        </span>
                        <span
                          className={`rounded-full px-[6px] py-[1px] text-[10px] font-[800] ${config.bgClass} ${config.colorClass}`}
                        >
                          {issue.severity === 'high'
                            ? 'Alto'
                            : issue.severity === 'medium'
                              ? 'Médio'
                              : 'Baixo'}
                        </span>
                      </div>
                      <p className="text-[12px] leading-[1.4] text-black/50 dark:text-white/50">
                        {issue.issue}
                      </p>
                      {issue.suggestion && (
                        <p className="mt-[4px] text-[11px] text-emerald-700/70 dark:text-emerald-300/70">
                          Sugestão: {issue.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
