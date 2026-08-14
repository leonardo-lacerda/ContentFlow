'use client';

import React, { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { normalizeBillingBalance } from '@gitroom/helpers/utils/billing-balance';
import { useToaster } from '@gitroom/react/toaster/toaster';

type PlanAccess = {
  features?: string[];
  models?: string[];
  capacities?: { brands?: number; channels?: number; members?: number };
};
type Plan = { code: string; name: string; priceCents: number; monthlyCredits: number; access?: PlanAccess };
type Topup = { code: string; name: string; amountCents: number; credits: number; validityDays?: number };
type PricingItem = {
  code: string;
  operation: string;
  provider: string;
  model: string;
  unit: string;
  baseCredits: number;
  minCredits: number;
};

const numericValue = (value: unknown, fallback = 0) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatCredits = (value: unknown) => numericValue(value).toLocaleString('pt-BR');

const featureLabels: Record<string, string> = {
  'content-ideas': 'Ideias e textos com IA',
  'brand-dna': 'Brand DNA',
  'carousel-copy': 'Copy e carrosseis',
  'image-generation': 'Geracao de imagens',
  'video-generation': 'Geracao de videos',
  'advanced-design': 'Editor de design avancado',
  'bulk-generation': 'Geracao em lote',
  analytics: 'Analytics avancado',
  'approval-workflows': 'Fluxos de aprovacao',
  'client-workspaces': 'Espacos de clientes',
  'public-api': 'API publica',
  webhooks: 'Webhooks',
  'white-label': 'White-label',
  'priority-queue': 'Fila prioritaria',
};

const money = (cents: unknown) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue(cents) / 100);

const pricingLabel = (item: PricingItem) => {
  const labels: Record<string, string> = {
    'chat-ideas': 'Ideias no chat',
    'carousel-copy': 'Copy de carrossel',
    script: 'Roteiro',
    'image-basic': 'Imagem padrão',
    'image-2k': 'Imagem em 2K',
    'image-4k': 'Imagem em 4K',
    'seedance-2.5-480p-10': 'Vídeo Seedance · 480p · 10s',
    'seedance-2.5-720p-10': 'Vídeo Seedance · 720p · 10s',
    'seedance-2.5-720p-input-10': 'Vídeo Seedance com mídia · 720p · 10s',
    'seedance-2.5-720p-30': 'Vídeo Seedance · 720p · 30s',
    'seedance-2.5-720p-input-30': 'Vídeo Seedance com mídia · 720p · 30s',
    'kling3-10': 'Vídeo Kling · 10s',
    'veo3.1-1080p': 'Vídeo Veo · 1080p',
    'veo3.1-4k': 'Vídeo Veo · 4K',
    'talking-actor-15': 'Avatar falando · 15s',
    'tts-30': 'Voz IA · 30s',
    translation: 'Tradução',
    captions: 'Legendas',
  };
  return labels[item.code] || item.operation;
};

const pricingGroup = (item: PricingItem) => {
  if (item.code.startsWith('image')) return 'Imagens';
  if (item.code.includes('seedance') || item.code.includes('kling') || item.code.includes('veo') || item.code.includes('actor')) return 'Vídeos';
  if (item.code === 'tts-30') return 'Áudio';
  return 'Conteúdo e edição';
};

const parseJsonOrThrow = async (response: Response) => {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Não foi possível concluir a operação.');
  return body;
};

export function BillingV2Component() {
  const apiFetch = useFetch();
  const toaster = useToaster();
  const [action, setAction] = useState<string | null>(null);
  const load = useCallback(async (path: string) => {
    const response = await apiFetch(path);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }, [apiFetch]);
  const { data: catalog, error: catalogError, isLoading: catalogLoading } = useSWR('/billing/v2/plans', load);
  const { data: account, error: accountError, isLoading: accountLoading, mutate: mutateAccount } = useSWR('/billing/v2/account', load, {
    dedupingInterval: 30000,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const { data: invoices } = useSWR('/billing/v2/invoices', load);
  const { data: pricingCatalog } = useSWR('/billing/v2/pricing', load);

  const plans: Plan[] = Array.isArray(catalog?.plans)
    ? catalog.plans.map((plan: Partial<Plan>) => ({
        code: plan.code || 'PLAN',
        name: plan.name || 'Plano ContentFlow',
        priceCents: numericValue(plan.priceCents),
        monthlyCredits: numericValue(plan.monthlyCredits),
        access: plan.access,
      }))
    : [];
  const topups: Topup[] = Array.isArray(catalog?.topups)
    ? catalog.topups.map((topup: Partial<Topup>) => ({
        code: topup.code || 'TOPUP',
        name: topup.name || 'Créditos extras',
        amountCents: numericValue(topup.amountCents),
        credits: numericValue(topup.credits),
        validityDays: numericValue(topup.validityDays, 90),
      }))
    : [];
  const pricingItems: PricingItem[] = Array.isArray(pricingCatalog)
    ? pricingCatalog.map((item: Partial<PricingItem>) => ({
        code: item.code || 'operation',
        operation: item.operation || 'Operação',
        provider: item.provider || 'ContentFlow',
        model: item.model || 'padrão',
        unit: item.unit || 'solicitação',
        baseCredits: numericValue(item.baseCredits),
        minCredits: numericValue(item.minCredits, numericValue(item.baseCredits)),
      }))
    : [];
  const currentPlan = account?.access?.plan || account?.subscription?.plan?.code || 'FREE';
  const normalizedBalance = normalizeBillingBalance(account);
  const balance = normalizedBalance || { balance: 0, total: 0, reserved: 0, debt: 0 };
  const usagePercent = useMemo(() => {
    if (!balance.total) return 0;
    return Math.min(100, Math.round(((balance.total - balance.balance) / balance.total) * 100));
  }, [balance]);
  const currentPlanCredits = plans.find((plan) => plan.code === currentPlan)?.monthlyCredits || balance.total;
  const exampleCosts = [
    { label: 'Ideias no chat', code: 'chat-ideas', fallback: 10 },
    { label: 'Imagem padrão', code: 'image-basic', fallback: 25 },
    { label: 'Vídeo Seedance 480p · 10s', code: 'seedance-2.5-480p-10', fallback: 900 },
  ].map((example) => ({
    ...example,
    credits: pricingItems.find((item) => item.code === example.code)?.baseCredits || example.fallback,
  }));

  const run = async (key: string, operation: () => Promise<Response | { url?: string }>) => {
    setAction(key);
    try {
      const result: any = await operation();
      if (result?.url) window.location.assign(result.url);
      await mutateAccount();
    } catch (error: any) {
      toaster.show(error?.message || 'Não foi possível concluir a operação.', 'warning');
    } finally {
      setAction(null);
    }
  };

  if (catalogLoading) return <div className="p-8 text-textColor">Carregando planos…</div>;
  if (catalogError) return <div className="p-8 text-red-600">Não foi possível carregar os planos.</div>;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 p-6 text-[#14171A] tablet:p-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#829047]">ContentFlow</p>
          <h1 className="mt-1 text-3xl font-bold">Planos e créditos</h1>
          <p className="mt-2 text-sm text-[#667085]">Use créditos para criar ideias, imagens, vídeos e outros conteúdos.</p>
        </div>
        <div className="flex gap-2">
          {account?.subscription?.providerCustomerId && (
            <button className="rounded-xl border border-[#D4D9CC] bg-white px-4 py-2 text-sm" onClick={() => run('portal', async () => parseJsonOrThrow(await apiFetch('/billing/v2/portal')))}>
              Gerenciar pagamento
            </button>
          )}
          {account?.subscription?.providerSubscriptionId && !account.subscription.cancelAtPeriodEnd && (
            <button className="rounded-xl border border-[#E5B7B7] bg-white px-4 py-2 text-sm text-[#A33A3A]" onClick={() => run('cancel', async () => parseJsonOrThrow(await apiFetch('/billing/v2/cancel', { method: 'POST' })))}>
              {action === 'cancel' ? 'Cancelando…' : 'Cancelar renovação'}
            </button>
          )}
        </div>
      </header>

      <section className="rounded-2xl border border-[#D4D9CC] bg-white p-5 shadow-sm">
        {(accountError || (!accountLoading && !normalizedBalance)) && (
          <div className="mb-4 rounded-xl border border-[#E5B7B7] bg-[#FFF4F4] px-4 py-3 text-sm text-[#8B2F2F]" role="alert">
            Não foi possível confirmar seu saldo. Seus créditos não foram alterados; atualize a página ou tente novamente em instantes.
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#667085]">Seu saldo</p>
            <p className="mt-1 text-3xl font-bold">
              {accountLoading ? 'Carregando…' : normalizedBalance ? `${formatCredits(balance.balance)} créditos` : 'Saldo indisponível'}
            </p>
            <p className="mt-1 text-sm text-[#667085]">Plano atual: <strong>{currentPlan}</strong>{account?.subscription?.currentPeriodEnd ? ` · renova em ${new Date(account.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}` : ''}</p>
          </div>
          <div className="min-w-[260px] flex-1 max-w-[420px]">
            <div className="mb-2 flex justify-between text-xs text-[#667085]"><span>Uso do lote atual</span><span>{usagePercent}%</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-[#EEF1EA]"><div className="h-full rounded-full bg-[#B8EE35] transition-all" style={{ width: `${usagePercent}%` }} /></div>
            <p className="mt-2 text-xs text-[#667085]">{formatCredits(balance.reserved)} créditos reservados em gerações em andamento.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D4D9CC] bg-[#F7FBEA] p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#829047]">Entenda seu saldo</p>
            <h2 className="mt-1 text-2xl font-bold">O que você consegue criar?</h2>
            <p className="mt-1 max-w-2xl text-sm text-[#667085]">Cada criação usa uma quantidade diferente de créditos. Estes exemplos ajudam você a planejar antes de gerar.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#536020]">{formatCredits(currentPlanCredits)} créditos no ciclo</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {exampleCosts.map((example) => (
            <div key={example.code} className="rounded-xl border border-[#D4D9CC] bg-white p-4">
              <p className="text-sm font-semibold">{example.label}</p>
              <p className="mt-2 text-2xl font-bold">{formatCredits(example.credits)} <span className="text-xs font-normal text-[#667085]">créditos</span></p>
              <p className="mt-1 text-xs text-[#667085]">aproximadamente {Math.floor(currentPlanCredits / example.credits)} por ciclo</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#D4D9CC] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Tabela de consumo</h2>
            <p className="mt-1 text-sm text-[#667085]">Valores estimados por criação. O valor final aparece na cotação antes de iniciar.</p>
          </div>
          <span className="text-xs text-[#667085]">Os créditos não são tokens de IA</span>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-[#EEF1EA]">
          {(['Conteúdo e edição', 'Imagens', 'Vídeos', 'Áudio'] as const).map((group) => {
            const items = pricingItems.filter((item) => pricingGroup(item) === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <div className="bg-[#F7F8F4] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#667085]">{group}</div>
                {items.map((item) => (
                  <div key={item.code} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF1EA] px-4 py-3 text-sm">
                    <div className="min-w-0"><p className="font-semibold">{pricingLabel(item)}</p><p className="text-xs text-[#667085]">{item.model} · {item.unit}</p></div>
                    <p className="whitespace-nowrap font-bold text-[#536020]">a partir de {formatCredits(Math.max(item.baseCredits, item.minCredits))} créditos</p>
                  </div>
                ))}
              </div>
            );
          })}
          {!pricingItems.length && <p className="px-4 py-5 text-sm text-[#667085]">A tabela de consumo será carregada quando o catálogo estiver disponível.</p>}
        </div>
      </section>

      <section>
        <div className="mb-4"><h2 className="text-xl font-bold">Escolha seu plano</h2><p className="text-sm text-[#667085]">Cobrança mensal. Créditos não utilizados expiram ao fim do ciclo.</p></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.code === currentPlan;
            const isUpgrade = (account?.subscription?.plan?.priceCents || 0) < plan.priceCents;
            const highlightedFeatures = (plan.access?.features || []).filter((feature) => featureLabels[feature]).slice(0, 6);
            const capacities = plan.access?.capacities || {};
            return <article key={plan.code} className={`flex flex-col rounded-2xl border p-5 ${isCurrent ? 'border-[#9BCF21] bg-[#F7FBEA]' : 'border-[#D4D9CC] bg-white'}`}>
              <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{plan.name}</h3>{isCurrent && <span className="rounded-full bg-[#DDF7A3] px-2 py-1 text-xs font-semibold">Atual</span>}</div>
              <p className="mt-4 text-3xl font-bold">{money(plan.priceCents)}<span className="text-sm font-normal text-[#667085]">/mês</span></p>
              <p className="mt-2 text-sm font-semibold">{formatCredits(plan.monthlyCredits)} créditos mensais</p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-[#475467]">
                {highlightedFeatures.map((feature) => <li key={feature}>✓ {featureLabels[feature]}</li>)}
                <li>✓ {formatCredits(capacities.brands)} marcas · {formatCredits(capacities.channels)} canais · {formatCredits(capacities.members)} membros</li>
              </ul>
              <button disabled={isCurrent || action === plan.code} className="mt-6 rounded-xl bg-[#14171A] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40" onClick={() => run(plan.code, async () => {
                if (account?.subscription?.providerSubscriptionId && isUpgrade) return parseJsonOrThrow(await apiFetch('/billing/v2/change-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planCode: plan.code }) }));
                return parseJsonOrThrow(await apiFetch('/billing/v2/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planCode: plan.code }) }));
              })}>{action === plan.code ? 'Processando…' : isCurrent ? 'Plano atual' : account?.subscription?.providerSubscriptionId && !isUpgrade ? 'Agendar downgrade' : 'Assinar plano'}</button>
            </article>;
          })}
        </div>
      </section>

      <section>
        <div className="mb-4"><h2 className="text-xl font-bold">Comprar créditos extras</h2><p className="text-sm text-[#667085]">Recargas avulsas, sem renovação automática, válidas por 90 dias.</p></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {topups.map((topup) => <article key={topup.code} className="rounded-2xl border border-[#D4D9CC] bg-white p-5"><p className="font-bold">{topup.name}</p><p className="mt-2 text-2xl font-bold">{money(topup.amountCents)}</p><p className="mt-1 text-sm text-[#667085]">{formatCredits(topup.credits)} créditos · {topup.validityDays || 90} dias</p><button disabled={action === topup.code} className="mt-5 w-full rounded-xl border border-[#14171A] px-3 py-2 text-sm font-semibold" onClick={() => run(topup.code, async () => parseJsonOrThrow(await apiFetch('/billing/v2/topups/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priceCode: topup.code }) })))}>{action === topup.code ? 'Processando…' : 'Comprar créditos'}</button></article>)}
        </div>
      </section>

      <section className="rounded-2xl border border-[#D4D9CC] bg-white p-5">
        <h2 className="text-xl font-bold">Histórico de cobranças</h2>
        <div className="mt-4 divide-y divide-[#EEF1EA]">{(invoices || []).length ? invoices.map((invoice: any) => <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{invoice.type === 'TOPUP' ? 'Recarga' : 'Assinatura'} · {new Date(invoice.createdAt).toLocaleDateString('pt-BR')}</span><span className="font-semibold">{money(invoice.amountCents)} · {invoice.status}</span></div>) : <p className="py-3 text-sm text-[#667085]">Nenhuma cobrança registrada.</p>}</div>
      </section>
    </div>
  );
}
