'use client';

import { BrandStatus } from './brand-dna.types';
import { Loader, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';

const statusConfig: Record<
  BrandStatus,
  { label: string; color: string; icon: any }
> = {
  DRAFT: {
    label: 'Rascunho',
    color:
      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    icon: FileText,
  },
  ANALYZING: {
    label: 'Analisando...',
    color:
      'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 animate-pulse',
    icon: Loader,
  },
  NEEDS_REVIEW: {
    label: 'Revisão necessária',
    color:
      'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    icon: AlertTriangle,
  },
  ACTIVE: {
    label: 'Ativa',
    color:
      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    icon: CheckCircle,
  },
  FAILED: {
    label: 'Falha',
    color:
      'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
  },
};

export function BrandStatusBadge({ status }: { status: BrandStatus }) {
  const config = statusConfig[status];
  if (!config) {
    return null;
  }

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
