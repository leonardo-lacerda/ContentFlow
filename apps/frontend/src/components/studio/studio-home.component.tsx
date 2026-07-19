'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  Layers,
  CalendarDays,
  Share2,
  Sparkles,
  Loader,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSelectedBrand, useLatestDna } from '@gitroom/frontend/components/brand-dna/brand-dna.hooks';
import { useJobs } from '@gitroom/frontend/components/generation-jobs/generation-jobs.hooks';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useCallback } from 'react';
import {
  PageShell,
  PageHeader,
  PageBody,
  SectionCard,
} from '@gitroom/frontend/components/new-layout/page-system';

type NextAction = {
  title: string;
  description: string;
  href: string;
  cta: string;
  tone: 'primary' | 'warn' | 'neutral';
};

export function StudioHome() {
  const t = useT();
  const router = useRouter();
  const fetch = useFetch();
  const { data: brand, isLoading: brandLoading } = useSelectedBrand();
  const brandId = brand?.id;
  const { data: dna, isLoading: dnaLoading } = useLatestDna(brandId);
  const { data: jobs } = useJobs();

  const loadIntegrations = useCallback(async () => {
    const res = await fetch('/integrations/list');
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : json?.integrations || json?.list || [];
  }, [fetch]);

  const { data: integrations } = useSWR('studio-integrations', loadIntegrations, {
    revalidateOnFocus: false,
  });

  const activeJobs = useMemo(() => {
    const list = Array.isArray(jobs) ? jobs : jobs?.jobs || [];
    return (list as any[])
      .filter((j) =>
        ['QUEUED', 'RUNNING', 'WAITING_PROVIDER'].includes(j.status)
      )
      .slice(0, 3);
  }, [jobs]);

  const recentJobs = useMemo(() => {
    const list = Array.isArray(jobs) ? jobs : jobs?.jobs || [];
    return (list as any[]).slice(0, 5);
  }, [jobs]);

  const connectedCount = Array.isArray(integrations) ? integrations.length : 0;

  const nextAction: NextAction = useMemo(() => {
    if (!brand) {
      return {
        title: t('studio_next_no_brand', 'Comece pela sua marca'),
        description: t(
          'studio_next_no_brand_desc',
          'Cole a URL do site. A IA monta o Brand DNA — voz, público, oferta e visual.'
        ),
        href: '/onboarding',
        cta: t('studio_cta_onboarding', 'Colar URL da marca'),
        tone: 'primary',
      };
    }

    const status = (dna?.status || brand.status || '').toUpperCase();
    if (!dna || status === 'FAILED' || status === 'NEEDS_REVIEW') {
      return {
        title: t('studio_next_review_dna', 'Revise o Brand DNA'),
        description: t(
          'studio_next_review_dna_desc',
          'Confira voz, público e visual antes de gerar conteúdo com a cara da marca.'
        ),
        href: '/brand',
        cta: t('studio_cta_brand', 'Abrir Minha marca'),
        tone: 'warn',
      };
    }

    if (connectedCount === 0) {
      return {
        title: t('studio_next_create', 'Gere o próximo conteúdo'),
        description: t(
          'studio_next_create_desc',
          'Aprove ideias no Swipe ou abra o estúdio de carrossel. Conectar redes pode esperar.'
        ),
        href: '/swipe',
        cta: t('studio_cta_swipe', 'Abrir Content Swipe'),
        tone: 'primary',
      };
    }

    return {
      title: t('studio_next_publish', 'Crie e publique'),
      description: t(
        'studio_next_publish_desc',
        'Gere um carrossel ou post e agende nas redes conectadas.'
      ),
      href: '/generate',
      cta: t('studio_cta_generate', 'Gerar carrossel'),
      tone: 'primary',
    };
  }, [brand, dna, connectedCount, t]);

  const loading = brandLoading || dnaLoading;

  return (
    <PageShell>
      <PageHeader
        description={t(
          'studio_subtitle',
          'DNA → Swipe → Criar → Publicar. Seu próximo passo está aqui.'
        )}
      />
      <PageBody>
        <div className="w-full max-w-[960px] mx-auto flex flex-col gap-5">
          <SectionCard>
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div className="flex gap-3 items-start">
                <div
                  className={
                    nextAction.tone === 'warn'
                      ? 'h-11 w-11 rounded-[12px] bg-amber-500/15 flex items-center justify-center shrink-0'
                      : 'h-11 w-11 rounded-[12px] bg-boxFocused flex items-center justify-center shrink-0'
                  }
                >
                  {nextAction.tone === 'warn' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-textItemFocused" />
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-[700] uppercase tracking-[0.08em] text-textItemBlur">
                    {t('studio_next_label', 'Próximo passo')}
                  </p>
                  <h2 className="text-xl font-[800] text-newTextColor mt-0.5">
                    {loading ? '…' : nextAction.title}
                  </h2>
                  <p className="text-sm text-textItemBlur mt-1 max-w-xl">
                    {nextAction.description}
                  </p>
                </div>
              </div>
              <Button onClick={() => router.push(nextAction.href)}>
                {nextAction.cta}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                icon: Building2,
                label: t('studio_card_brand', 'Minha marca'),
                href: '/brand',
                meta: brand?.name || t('studio_card_brand_empty', 'Sem marca'),
              },
              {
                icon: Layers,
                label: t('studio_card_swipe', 'Content Swipe'),
                href: '/swipe',
                meta: t('studio_card_swipe_meta', 'Aprovar ideias'),
              },
              {
                icon: Sparkles,
                label: t('studio_card_generate', 'Gerar carrossel'),
                href: '/generate',
                meta: t('studio_card_generate_meta', 'Estúdio de IA'),
              },
              {
                icon: CalendarDays,
                label: t('studio_card_publish', 'Calendário'),
                href: '/publish',
                meta:
                  connectedCount > 0
                    ? t('studio_card_channels_n', '{n} canais').replace(
                        '{n}',
                        String(connectedCount)
                      )
                    : t('studio_card_channels_0', 'Conectar canais'),
              },
            ].map((card) => (
              <button
                key={card.href}
                type="button"
                onClick={() => router.push(card.href)}
                className="text-left rounded-[12px] border border-newTableBorder bg-newSettings p-4 hover:bg-boxHover transition-colors"
              >
                <card.icon className="w-5 h-5 text-textItemFocused mb-3" />
                <div className="text-sm font-[700] text-newTextColor">
                  {card.label}
                </div>
                <div className="text-xs text-textItemBlur mt-1">{card.meta}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title={t('studio_status_title', 'Status')}>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-textItemBlur">Brand DNA</span>
                  <span className="font-[700] text-newTextColor">
                    {!brand
                      ? t('studio_status_missing', 'Pendente')
                      : (dna?.status || brand.status || '—')}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-textItemBlur">
                    {t('studio_status_channels', 'Canais')}
                  </span>
                  <span className="font-[700] text-newTextColor flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5" />
                    {connectedCount}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-textItemBlur">
                    {t('studio_status_jobs', 'Gerações ativas')}
                  </span>
                  <span className="font-[700] text-newTextColor flex items-center gap-1">
                    {activeJobs.length > 0 ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {activeJobs.length}
                  </span>
                </li>
              </ul>
              {connectedCount === 0 && brand && (
                <div className="mt-4">
                  <Button secondary onClick={() => router.push('/channels')}>
                    {t('studio_connect_channels', 'Conectar redes')}
                  </Button>
                </div>
              )}
            </SectionCard>

            <SectionCard title={t('studio_jobs_title', 'Gerações recentes')}>
              {recentJobs.length === 0 ? (
                <p className="text-sm text-textItemBlur">
                  {t(
                    'studio_jobs_empty',
                    'Nenhuma geração ainda. Abra o Swipe ou o estúdio de carrossel.'
                  )}
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentJobs.map((job: any) => (
                    <li
                      key={job.id}
                      className="flex items-center justify-between gap-2 text-sm border-b border-newTableBorder last:border-0 pb-2 last:pb-0"
                    >
                      <span className="truncate text-newTextColor font-[600]">
                        {job.type || job.kind || 'Job'}
                      </span>
                      <span className="text-xs text-textItemBlur shrink-0">
                        {job.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </div>
      </PageBody>
    </PageShell>
  );
}
