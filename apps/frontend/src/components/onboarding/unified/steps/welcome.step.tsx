'use client';

import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import type { UnifiedOnboardingContext } from '../unified-onboarding.types';

export function WelcomeStep({ ctx }: { ctx: UnifiedOnboardingContext }) {
  const t = useT();

  return (
    <div className="rounded-[16px] border border-newTableBorder bg-newBgColorInner shadow-cfSm p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-[12px] bg-cf-cream border border-newTableBorder flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-btnPrimary" />
        </div>
        <div>
          <h2 className="text-2xl font-[600] font-serif tracking-[-0.02em] text-newTextColor">
            {t('onboarding_welcome_title', 'Bem-vindo ao ContentFlow')}
          </h2>
          <p className="text-sm text-textItemBlur mt-1 leading-relaxed">
            {t(
              'onboarding_welcome_subtitle',
              'Cole a URL da sua marca. A IA aprende o DNA e em minutos você tem conteúdo pronto pra postar.'
            )}
          </p>
        </div>
      </div>

      <ul className="space-y-3 text-[14px] text-newTextColor">
        {[
          t(
            'onboarding_welcome_bullet_1',
            'Analisamos o site e montamos o Brand DNA (voz, público, oferta, visual)'
          ),
          t(
            'onboarding_welcome_bullet_2',
            'Você gera o primeiro carrossel sem precisar de freelancer'
          ),
          t(
            'onboarding_welcome_bullet_3',
            'Conecta Instagram, LinkedIn, X, Facebook ou TikTok quando quiser publicar'
          ),
        ].map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-btnPrimary shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button onClick={ctx.goNext}>
          {t('onboarding_welcome_start', 'Começar com a URL da marca')}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button onClick={ctx.skipAll} secondary loading={ctx.loading}>
          {t('skip_onboarding', 'Pular introdução')}
        </Button>
      </div>
    </div>
  );
}
