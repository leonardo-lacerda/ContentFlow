'use client';

import { BrandStatus } from './brand-dna.types';
import { Loader, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';

const statusConfig: Record<
  BrandStatus,
  { label: string; color: string; icon: any }
> = {
  DRAFT: {
    label: 'Rascunho',
    color: 'bg-white/[0.06] text-white/50 border border-white/10',
    icon: FileText,
  },
  ANALYZING: {
    label: 'Analisando',
    color: 'bg-blue-500/15 text-blue-400 border border-blue-500/25 animate-pulse',
    icon: Loader,
  },
  NEEDS_REVIEW: {
    label: 'Revisão',
    color: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    icon: AlertTriangle,
  },
  ACTIVE: {
    label: 'Ativa',
    color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    icon: CheckCircle,
  },
  FAILED: {
    label: 'Falhou',
    color: 'bg-red-500/15 text-red-400 border border-red-500/25',
    icon: XCircle,
  },
};

export function BrandStatusBadge({ status }: { status: BrandStatus }) {
  const config = statusConfig[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-[600] ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
