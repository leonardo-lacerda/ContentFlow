'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';
import type { CarouselSlide } from './ai-generate-images.types';

type EditorialCheck = {
  id: string;
  description: string;
  severity: string;
  message: string;
  pattern?: string;
};

type TemplateEditorialChecksProps = {
  template?: { editorialChecks: EditorialCheck[] } | null;
  slides?: CarouselSlide[];
  className?: string;
};

const severityConfig: Record<
  string,
  { icon: typeof Info; colorClass: string; bgClass: string; label: string }
> = {
  info: {
    icon: Info,
    colorClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-500/10 dark:bg-blue-400/10',
    label: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    colorClass: 'text-yellow-500 dark:text-yellow-400',
    bgClass: 'bg-yellow-500/10 dark:bg-yellow-400/10',
    label: 'Aviso',
  },
  error: {
    icon: AlertCircle,
    colorClass: 'text-red-500 dark:text-red-400',
    bgClass: 'bg-red-500/10 dark:bg-red-400/10',
    label: 'Erro',
  },
};

function getSeverityConfig(severity: string) {
  return (
    severityConfig[severity.toLowerCase()] ?? severityConfig.info
  );
}

type CheckValidationResult = {
  passed: boolean;
  detail?: string;
  matchedSlides?: number[];
};

/**
 * Validate a single editorial check against slide content.
 * Handles regex pattern checks and heuristic keyword-based checks.
 */
function validateCheck(
  check: EditorialCheck,
  slides: CarouselSlide[]
): CheckValidationResult {
  // If check has a regex pattern, run it against all slides
  if (check.pattern) {
    try {
      const regex = new RegExp(check.pattern, 'i');
      const matchedSlides: number[] = [];

      for (const slide of slides) {
        const text = `${slide.headline || ''} ${slide.body || ''} ${slide.cta || ''}`;
        if (regex.test(text)) {
          matchedSlides.push(slide.index);
        }
      }

      if (matchedSlides.length > 0) {
        return {
          passed: false,
          detail: `Encontrado no${matchedSlides.length > 1 ? 's' : ''} slide${matchedSlides.length > 1 ? 's' : ''} ${matchedSlides.join(', ')}`,
          matchedSlides,
        };
      }
      return { passed: true };
    } catch {
      return { passed: true, detail: 'Regex inválido' };
    }
  }

  // Heuristic checks based on description keywords
  const desc = (check.description || '').toLowerCase();
  const msg = check.message || check.description;

  // Headline length check per template
  if (
    desc.includes('headline') &&
    (desc.includes('curt') || desc.includes('breve') || desc.includes('máx') || desc.includes('max'))
  ) {
    const match = desc.match(/(\d+)/);
    const limit = match ? parseInt(match[1], 10) : 60;
    const violations = slides.filter((s) => (s.headline || '').trim().length > limit);
    if (violations.length > 0) {
      return {
        passed: false,
        detail: `${msg} — ${violations.length} slide${violations.length > 1 ? 's' : ''} exced${violations.length > 1 ? 'em' : 'e'} ${limit} chars`,
        matchedSlides: violations.map((s) => s.index),
      };
    }
    return { passed: true };
  }

  // Body text length check per template
  if (
    desc.includes('corpo') &&
    (desc.includes('curt') || desc.includes('breve') || desc.includes('máx') || desc.includes('max'))
  ) {
    const match = desc.match(/(\d+)/);
    const limit = match ? parseInt(match[1], 10) : 120;
    const violations = slides.filter((s) => (s.body || '').trim().length > limit);
    if (violations.length > 0) {
      return {
        passed: false,
        detail: `${msg} — ${violations.length} slide${violations.length > 1 ? 's' : ''} exced${violations.length > 1 ? 'em' : 'e'} ${limit} chars`,
        matchedSlides: violations.map((s) => s.index),
      };
    }
    return { passed: true };
  }

  // CTA required check
  if (
    desc.includes('cta') &&
    (desc.includes('obrigatório') || desc.includes('necessário') || desc.includes('required'))
  ) {
    const violations = slides.filter((s) => !(s.cta || '').trim());
    if (violations.length > 0) {
      return {
        passed: false,
        detail: `${msg} — ${violations.length} slide${violations.length > 1 ? 's' : ''} sem CTA`,
        matchedSlides: violations.map((s) => s.index),
      };
    }
    return { passed: true };
  }

  // No all-caps / shouting check
  if (desc.includes('maiúscul') || desc.includes('caps') || desc.includes('shout')) {
    const violations: number[] = [];
    for (const slide of slides) {
      const words = (slide.headline || '').split(/\s+/);
      const capsWords = words.filter(
        (w) => w.length >= 3 && w === w.toUpperCase() && /[A-ZÀ-Ú]/.test(w)
      );
      if (capsWords.length >= 2) {
        violations.push(slide.index);
      }
    }
    if (violations.length > 0) {
      return {
        passed: false,
        detail: msg,
        matchedSlides: violations,
      };
    }
    return { passed: true };
  }

  // No competitor mentions
  if (desc.includes('concorrent') || desc.includes('competitor')) {
    const competitorPattern = /contra\s+(o|a|os|as)\s+\w+|vs\.?\s+\w+|versus\s+\w+/i;
    const violations: number[] = [];
    for (const slide of slides) {
      const text = `${slide.headline || ''} ${slide.body || ''} ${slide.cta || ''}`;
      if (competitorPattern.test(text)) {
        violations.push(slide.index);
      }
    }
    if (violations.length > 0) {
      return {
        passed: false,
        detail: msg,
        matchedSlides: violations,
      };
    }
    return { passed: true };
  }

  // Image prompt must contain specific visual direction keywords
  if (
    desc.includes('imagem') &&
    desc.includes('prompt') &&
    (desc.includes('direção') || desc.includes('descrição') || desc.includes('conteúdo'))
  ) {
    const violations = slides.filter((s) => (s.imagePrompt || '').trim().length < 20);
    if (violations.length > 0) {
      return {
        passed: false,
        detail: msg,
        matchedSlides: violations.map((s) => s.index),
      };
    }
    return { passed: true };
  }

  // Default: cannot validate qualitatively without AI
  return { passed: true, detail: 'Requer análise qualitativa (IA)' };
}

/**
 * Collapsible panel that shows the editorial rules / checks for a selected
 * backend template. When slides are provided, validates each check against
 * the content and shows pass/fail status with color coding.
 */
export function TemplateEditorialChecks({
  template,
  slides,
  className = '',
}: TemplateEditorialChecksProps) {
  const [expanded, setExpanded] = useState(true);

  const checks = template?.editorialChecks;

  // Compute validation results when slides are available
  const results = useMemo(() => {
    if (!checks || !slides?.length) return null;
    const map = new Map<string, CheckValidationResult>();
    for (const check of checks) {
      map.set(check.id, validateCheck(check, slides));
    }
    return map;
  }, [checks, slides]);

  // Don't render if no template or no checks
  if (!checks || checks.length === 0) {
    return null;
  }

  const passedCount = results
    ? Array.from(results.values()).filter((r) => r.passed).length
    : null;
  const failedCount = results ? checks.length - (passedCount ?? 0) : null;

  return (
    <div
      className={`rounded-[16px] border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#101010] ${className}`}
    >
      {/* Header — always visible, toggles expand */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between p-[16px] text-left transition hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-[10px]">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-200">
            <AlertCircle className="h-[16px] w-[16px]" />
          </span>
          <div>
            <h4 className="text-[14px] font-[800] text-black dark:text-white">
              Regras editoriais do template
            </h4>
            <p className="text-[12px] text-black/45 dark:text-white/45">
              {results ? (
                <>
                  {passedCount === checks.length ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Todas as {checks.length} regra{checks.length !== 1 ? 's' : ''} passando ✓
                    </span>
                  ) : (
                    <>
                      <span className="text-emerald-600 dark:text-emerald-400">{passedCount}</span>
                      {' '}passando,{' '}
                      <span className="text-red-600 dark:text-red-400">{failedCount}</span>
                      {' '}falhando de {checks.length}
                    </>
                  )}
                </>
              ) : (
                <>{checks.length} regra{checks.length !== 1 ? 's' : ''} aplicáve{checks.length !== 1 ? 'is' : 'l'}</>
              )}
            </p>
          </div>
        </div>
        <span className="text-black/30 dark:text-white/30">
          {expanded ? (
            <ChevronUp className="h-[18px] w-[18px]" />
          ) : (
            <ChevronDown className="h-[18px] w-[18px]" />
          )}
        </span>
      </button>

      {/* Check list — collapsible */}
      {expanded && (
        <div className="space-y-[2px] border-t border-black/5 px-[16px] pb-[16px] dark:border-white/5">
          {checks.map((check, index) => {
            const config = getSeverityConfig(check.severity);
            const result = results?.get(check.id);
            const isPassing = result?.passed ?? null;

            // Override icon/color when validated
            const StatusIcon =
              isPassing === true
                ? CheckCircle2
                : isPassing === false
                  ? XCircle
                  : config.icon;

            const statusColorClass =
              isPassing === true
                ? 'text-emerald-500 dark:text-emerald-400'
                : isPassing === false
                  ? 'text-red-500 dark:text-red-400'
                  : config.colorClass;

            const statusBgClass =
              isPassing === true
                ? 'bg-emerald-500/10 dark:bg-emerald-400/10'
                : isPassing === false
                  ? 'bg-red-500/10 dark:bg-red-400/10'
                  : config.bgClass;

            return (
              <div
                key={check.id || index}
                className={`flex items-start gap-[10px] rounded-[10px] p-[12px] transition ${
                  isPassing === false
                    ? 'bg-red-500/[0.03] dark:bg-red-400/[0.03]'
                    : isPassing === true
                      ? 'bg-emerald-500/[0.02] dark:bg-emerald-400/[0.02]'
                      : index % 2 === 0
                        ? 'bg-black/[0.015] dark:bg-white/[0.015]'
                        : ''
                }`}
              >
                {/* Status icon */}
                <span
                  className={`mt-[1px] flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] ${statusBgClass}`}
                >
                  <StatusIcon className={`h-[14px] w-[14px] ${statusColorClass}`} />
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-[2px] flex items-center gap-[6px]">
                    <span className="text-[13px] font-[700] text-black dark:text-white">
                      {check.description}
                    </span>
                    <span
                      className={`rounded-full px-[6px] py-[1px] text-[10px] font-[800] ${statusBgClass} ${statusColorClass}`}
                    >
                      {isPassing === true
                        ? '✓ OK'
                        : isPassing === false
                          ? '✗ Falhou'
                          : config.label}
                    </span>
                  </div>
                  <p className="text-[12px] leading-[1.4] text-black/50 dark:text-white/50">
                    {check.message}
                  </p>
                  {/* Show validation detail when failing */}
                  {result && !result.passed && result.detail && (
                    <p className="mt-[4px] text-[11px] leading-[1.3] text-red-500/80 dark:text-red-400/80">
                      {result.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
