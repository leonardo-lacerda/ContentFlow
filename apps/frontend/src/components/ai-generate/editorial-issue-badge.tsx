'use client';

import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { EditorialIssue } from './ai-generate-images.types';

const toneConfig: Record<
  EditorialIssue['tone'],
  {
    icon: typeof Info;
    bgClass: string;
    textClass: string;
    borderClass: string;
  }
> = {
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-amber-500/10 dark:bg-amber-400/10',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-500/25 dark:border-amber-400/25',
  },
  danger: {
    icon: AlertCircle,
    bgClass: 'bg-red-500/10 dark:bg-red-400/10',
    textClass: 'text-red-700 dark:text-red-300',
    borderClass: 'border-red-500/25 dark:border-red-400/25',
  },
};

type EditorialIssueBadgeProps = {
  issue: EditorialIssue;
  compact?: boolean;
};

/**
 * Small pill / badge that visually represents an editorial issue's severity.
 * Used inline in slide editors and preview panels.
 */
export function EditorialIssueBadge({
  issue,
  compact = false,
}: EditorialIssueBadgeProps) {
  const config = toneConfig[issue.tone];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-[8px] border px-[8px] py-[3px] text-[11px] font-[700] leading-tight ${config.bgClass} ${config.textClass} ${config.borderClass}`}
    >
      <Icon className="h-[12px] w-[12px] shrink-0" strokeWidth={2} />
      <span className="truncate">
        {issue.slide && !compact ? `S${issue.slide}: ` : ''}
        {issue.label}
      </span>
    </span>
  );
}
