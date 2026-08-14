'use client';

import useSWR from 'swr';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

type BillingAccountResponse = {
  credits?: { available?: number; balance?: number; reserved?: number; total?: number };
  access?: { plan?: string; cycleCredits?: number; renewsAt?: string | null };
  subscription?: { plan?: { code?: string }; currentPeriodEnd?: string | null };
};

const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const format = (value: unknown) => number(value).toLocaleString('pt-BR');

export function PlanUsageBadge() {
  const [expanded, setExpanded] = useState(false);
  const apiFetch = useFetch();
  const load = useCallback(async (path: string) => {
    const response = await apiFetch(path);
    if (!response.ok) throw new Error('Nao foi possivel carregar os creditos.');
    return response.json();
  }, [apiFetch]);
  const { data } = useSWR<BillingAccountResponse>('/billing/v2/account', load, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  if (!data) return null;

  const available = number(data.credits?.available ?? data.credits?.balance);
  const reserved = number(data.credits?.reserved);
  const plan = data.access?.plan || data.subscription?.plan?.code || 'FREE';
  const renewsAt = data.access?.renewsAt || data.subscription?.currentPeriodEnd;

  return (
    <div className="w-full">
      <button
        type="button"
        className="cf-usage-card cf-usage-toggle block w-full overflow-hidden p-0 text-left"
        aria-expanded={expanded}
        aria-controls="credit-balance-details"
        aria-label={expanded ? 'Ocultar saldo de creditos' : 'Mostrar saldo de creditos'}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="cf-usage-compact flex items-center justify-center gap-1 px-1 py-2 group-hover/sidebar:hidden">
          <span className="cf-usage-compact-icon" aria-hidden="true">C</span>
          <span className="cf-usage-compact-value">{format(available)}</span>
          <span className="sr-only">{format(available)} creditos disponiveis</span>
        </span>
        <span className="hidden items-center justify-between gap-2 px-3 py-2 group-hover/sidebar:flex">
          <span className="truncate text-[12px] font-bold">Creditos</span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="cf-usage-compact-value">{format(available)}</span>
            <span className="cf-usage-toggle-icon" aria-hidden="true">{expanded ? '-' : '+'}</span>
          </span>
        </span>
      </button>

      {expanded && (
        <div id="credit-balance-details" className="cf-usage-card mt-1 flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="cf-usage-plan">{plan === 'FREE' ? 'Free' : plan}</span>
            <strong className="text-[12px]">{format(available)} creditos</strong>
          </div>
          {reserved > 0 && <p className="text-[10px] opacity-70">{format(reserved)} reservados em geracoes.</p>}
          {renewsAt && <p className="text-[10px] opacity-70">Renova em {new Date(renewsAt).toLocaleDateString('pt-BR')}.</p>}
          <Link href="/billing" className="cf-usage-link mt-1">Ver planos e creditos <span aria-hidden="true">-&gt;</span></Link>
        </div>
      )}
    </div>
  );
}
