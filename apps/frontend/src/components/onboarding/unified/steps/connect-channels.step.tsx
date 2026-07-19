'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { AddProviderComponent } from '@gitroom/frontend/components/launches/add.provider.component';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { StepFooter } from '../ui/step-footer';
import type { UnifiedOnboardingContext } from '../unified-onboarding.types';

export function ConnectChannelsStep({
  ctx,
}: {
  ctx: UnifiedOnboardingContext;
}) {
  const t = useT();
  const fetch = useFetch();

  const loadProviders = useCallback(async () => {
    return (await fetch('/integrations')).json();
  }, [fetch]);

  const loadConnected = useCallback(
    async (path: string) => {
      const list = (await (await fetch(path)).json()).integrations;
      return list as any[];
    },
    [fetch]
  );

  const { data } = useSWR('onboarding-integrations', loadProviders, {
    revalidateOnFocus: false,
  });

  const { data: connected, mutate } = useSWR(
    '/integrations/list',
    loadConnected,
    {
      revalidateOnFocus: true,
      refreshInterval: 8000,
    }
  );

  const continueNext = async () => {
    await ctx.persistProgress({ currentStep: 'done' });
    ctx.goNext();
  };

  return (
    <div className="rounded-[16px] border border-newTableBorder bg-newBgColorInner shadow-cfSm p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-[600] font-serif tracking-[-0.02em] text-newTextColor">
          {t('connect_your_channels', 'Conecte um canal (opcional)')}
        </h2>
        <p className="text-sm text-textItemBlur mt-1">
          {t(
            'connect_social_media_optional_v1',
            'Instagram, Facebook, LinkedIn, X ou TikTok. Você pode pular e conectar depois em Canais — o conteúdo já está pronto.'
          )}
        </p>
      </div>

      {connected && connected.length > 0 && (
        <div className="space-y-2">
          <div className="text-[13px] font-bold text-newTextColor">
            {t('onboarding_connected_channels', 'Canais conectados')}
          </div>
          <div className="flex flex-wrap gap-2">
            {connected.map((c: any) => (
              <div
                key={c.id}
                className="inline-flex items-center gap-2 rounded-full border border-newTableBorder bg-newBgColorInner px-3 py-1.5 text-xs font-bold"
              >
                {c.picture ? (
                  <SafeImage
                    src={c.picture}
                    alt={c.name}
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                ) : null}
                <span>{c.name || c.identifier}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-[12px]">
        <div className="text-[14px] font-medium text-newTextColor">
          {t('click_channel_to_add', 'Clique em um canal para adicionar')}
        </div>
        {data && (
          <AddProviderComponent
            invite={false}
            social={data.social || []}
            article={data.article || []}
            onboarding={true}
            update={() => mutate()}
          />
        )}
      </div>

      <StepFooter
        onBack={ctx.goBack}
        onNext={continueNext}
        onSkip={ctx.skipStep}
        nextLabel={
          connected?.length
            ? t('next', 'Próximo')
            : t('continue_without_channels', 'Continuar sem canais')
        }
      />
    </div>
  );
}
