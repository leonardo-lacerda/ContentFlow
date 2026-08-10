'use client';

import useSWR from 'swr';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

type UsageEntry = {
  current: number;
  limit: number;
  unlimited: boolean;
};

type UsageResponse = {
  plan: string;
  usage: Record<string, UsageEntry>;
};

const TYPE_LABELS: Record<string, string> = {
  carousel_generation: 'Carrosséis',
  image_generation: 'Imagens IA',
  content_idea: 'Ideias',
  dna_extraction: 'DNA',
  brand_profile: 'Marcas',
  editorial_plan: 'Editorial',
  video_generation: 'Vídeos',
  ad_kit: 'Ads',
  email_campaign: 'E-mails',
  video_script: 'Roteiros',
};

function UsageBar({
  label,
  current,
  limit,
  unlimited,
}: {
  label: string;
  current: number;
  limit: number;
  unlimited: boolean;
}) {
  const pct = unlimited || limit <= 0 ? 0 : Math.min(100, Math.round((current / limit) * 100));
  const nearLimit = pct >= 80;

  return (
    <div className="cf-usage-row flex min-w-0 flex-col gap-[3px]">
      <div className="flex min-w-0 justify-between gap-2 text-[11px]">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0">{unlimited ? 'Ilimitado' : `${current}/${limit}`}</span>
      </div>
      {!unlimited && (
        <div className="cf-usage-track h-[3px] overflow-hidden rounded-full">
          <div
            className={`cf-usage-fill h-full rounded-full transition-all${nearLimit ? ' cf-usage-fill--warning' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function PlanUsageBadge() {
  const [expanded, setExpanded] = useState(false);
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    const response = await fetch(path);
    return response.json();
  }, [fetch]);
  const { data } = useSWR<UsageResponse>('/plan-limits/usage', load, {
    refreshInterval: 30000,
  });

  if (!data) return null;

  const keyTypes = [
    'carousel_generation',
    'image_generation',
    'content_idea',
    'video_script',
    'email_campaign',
    'ad_kit',
  ];
  const entries = keyTypes
    .map((type) => ({ type, entry: data.usage?.[type] }))
    .filter(
      (item): item is { type: string; entry: UsageEntry } => Boolean(item.entry)
    );
  const totalCurrent = entries.reduce((sum, item) => sum + item.entry.current, 0);
  const totalLimit = entries.reduce(
    (sum, item) => sum + (item.entry.unlimited ? 0 : item.entry.limit),
    0
  );
  const summaryPct = totalLimit
    ? Math.min(100, Math.round((totalCurrent / totalLimit) * 100))
    : 0;

  return (
    <div className="w-full">
      <button
        type="button"
        className="cf-usage-card cf-usage-toggle block w-full overflow-hidden p-0 text-left"
        aria-expanded={expanded}
        aria-controls="monthly-usage-details"
        aria-label={expanded ? 'Ocultar uso mensal' : 'Mostrar uso mensal'}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="cf-usage-compact flex items-center justify-center gap-1 px-1 py-2 group-hover/sidebar:hidden">
          <span className="cf-usage-compact-icon" aria-hidden="true">↗</span>
          <span className="cf-usage-compact-value">{summaryPct}%</span>
          <span className="sr-only">{summaryPct}% do uso mensal utilizado</span>
        </span>
        <span className="hidden items-center justify-between gap-2 px-3 py-2 group-hover/sidebar:flex">
          <span className="truncate text-[12px] font-bold">Uso mensal</span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="cf-usage-compact-value">{summaryPct}%</span>
            <span className="cf-usage-toggle-icon" aria-hidden="true">
              {expanded ? '−' : '+'}
            </span>
          </span>
        </span>
      </button>

      {expanded && (
        <div id="monthly-usage-details" className="cf-usage-card mt-1 flex flex-col gap-2 p-3">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="cf-usage-plan shrink-0">
              {data.plan === 'FREE' ? 'Início' : data.plan}
            </span>
            <span className="cf-usage-summary">
              <span>Uso combinado</span>
              <strong>{totalLimit ? `${totalCurrent}/${totalLimit}` : 'Ilimitado'}</strong>
            </span>
          </div>
          <div className="cf-usage-track h-1 overflow-hidden rounded-full">
            <div className="cf-usage-fill h-full rounded-full" style={{ width: `${summaryPct}%` }} />
          </div>
          <div className="flex flex-col gap-2">
            {entries.slice(0, 4).map(({ type, entry }) => (
              <UsageBar
                key={type}
                label={TYPE_LABELS[type] || type}
                current={entry.current}
                limit={entry.limit}
                unlimited={entry.unlimited}
              />
            ))}
          </div>
          <Link href="/billing" className="cf-usage-link mt-1">
            Ver planos <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
