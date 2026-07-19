'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { AddProviderButton } from '@gitroom/frontend/components/launches/add.provider.component';
import {
  PageShell,
  PageHeader,
  PageBody,
  SectionCard,
  EmptyState,
} from '@gitroom/frontend/components/new-layout/page-system';
import { Share2 } from 'lucide-react';

const V1_NETWORKS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
  { id: 'tiktok', label: 'TikTok' },
];

export function ChannelsPage() {
  const t = useT();
  const fetch = useFetch();

  const loadConnected = useCallback(async () => {
    const res = await fetch('/integrations/list');
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : json?.integrations || json?.list || [];
  }, [fetch]);

  const { data: connected, mutate, isLoading } = useSWR(
    'channels-connected',
    loadConnected,
    { revalidateOnFocus: true }
  );

  const list = Array.isArray(connected) ? connected : [];

  return (
    <PageShell>
      <PageHeader
        description={t(
          'channels_desc',
          'Conecte as redes onde você publica: Instagram, Facebook, LinkedIn, X e TikTok.'
        )}
        actions={<AddProviderButton update={() => mutate()} />}
      />
      <PageBody>
        <div className="w-full max-w-[880px] mx-auto flex flex-col gap-5">
          <SectionCard title="Redes do ContentFlow">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {V1_NETWORKS.map((n) => {
                const isOn = list.some(
                  (c: any) =>
                    c.identifier === n.id ||
                    c.identifier?.startsWith(n.id) ||
                    (n.id === 'linkedin' &&
                      c.identifier?.includes('linkedin')) ||
                    (n.id === 'x' &&
                      (c.identifier === 'x' || c.identifier === 'twitter'))
                );
                return (
                  <div
                    key={n.id}
                    className="rounded-[12px] border border-newTableBorder bg-newBgColorInner p-4 flex flex-col gap-2 hover:shadow-cfSm hover:border-[color:var(--cf-line-strong,#d6d3d1)] transition-all duration-200"
                  >
                    <div className="text-sm font-[700] text-newTextColor">
                      {n.label}
                    </div>
                    <div
                      className={
                        isOn
                          ? 'text-[11px] font-[700] text-emerald-400'
                          : 'text-[11px] text-textItemBlur'
                      }
                    >
                      {isOn
                        ? t('channels_connected', 'Conectado')
                        : t('channels_not_connected', 'Não conectado')}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Contas conectadas">
            {isLoading ? (
              <p className="text-sm text-textItemBlur">Carregando…</p>
            ) : list.length === 0 ? (
              <EmptyState
                icon={<Share2 className="w-5 h-5" />}
                title={t('channels_empty_title', 'Nenhum canal ainda')}
                description={t(
                  'channels_empty_desc',
                  'Use o botão “Conectar canal” acima. Você já pode gerar conteúdo antes de conectar redes.'
                )}
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {list.map((c: any) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-[10px] border border-newTableBorder bg-newBgColorInner px-3 py-2.5"
                  >
                    {c.picture ? (
                      <SafeImage
                        src={c.picture}
                        alt={c.name}
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-boxFocused" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-[700] text-newTextColor truncate">
                        {c.name}
                      </div>
                      <div className="text-xs text-textItemBlur">
                        {c.identifier}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </PageBody>
    </PageShell>
  );
}
