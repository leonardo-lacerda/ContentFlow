'use client';

import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

type EditorialCheck = {
  id: string;
  description: string;
  severity: string;
  message: string;
};

type TemplateEditorialChecksProps = {
  template?: { editorialChecks: EditorialCheck[] } | null;
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

/**
 * Collapsible panel that shows the editorial rules / checks for a selected
 * backend template. Each check displays a severity icon, description, and message.
 */
export function TemplateEditorialChecks({
  template,
  className = '',
}: TemplateEditorialChecksProps) {
  const [expanded, setExpanded] = useState(true);

  const checks = template?.editorialChecks;

  // Don't render if no template or no checks
  if (!checks || checks.length === 0) {
    return null;
  }

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
              {checks.length} regra{checks.length !== 1 ? 's' : ''} aplicáve{checks.length !== 1 ? 'is' : 'l'}
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
            const SeverityIcon = config.icon;

            return (
              <div
                key={check.id || index}
                className={`flex items-start gap-[10px] rounded-[10px] p-[12px] transition ${
                  index % 2 === 0 ? 'bg-black/[0.015] dark:bg-white/[0.015]' : ''
                }`}
              >
                {/* Severity icon */}
                <span
                  className={`mt-[1px] flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] ${config.bgClass}`}
                >
                  <SeverityIcon className={`h-[14px] w-[14px] ${config.colorClass}`} />
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-[2px] flex items-center gap-[6px]">
                    <span className="text-[13px] font-[700] text-black dark:text-white">
                      {check.description}
                    </span>
                    <span
                      className={`rounded-full px-[6px] py-[1px] text-[10px] font-[800] ${config.bgClass} ${config.colorClass}`}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="text-[12px] leading-[1.4] text-black/50 dark:text-white/50">
                    {check.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
