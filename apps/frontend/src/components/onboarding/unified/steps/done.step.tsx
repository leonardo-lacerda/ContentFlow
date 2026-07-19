'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import type { UnifiedOnboardingContext } from '../unified-onboarding.types';

export function DoneStep({ ctx }: { ctx: UnifiedOnboardingContext }) {
  const t = useT();
  const router = useRouter();
  const completed = useRef(false);

  useEffect(() => {
    if (completed.current) return;
    completed.current = true;
    void ctx.completeOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-[16px] border border-newTableBorder bg-newBgColorInner shadow-cfSm p-8 space-y-6 text-center">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-[600] font-serif tracking-[-0.02em] text-newTextColor">
          {t('onboarding_done_title', 'Tudo pronto!')}
        </h2>
        <p className="text-sm text-textItemBlur mt-2 max-w-md mx-auto">
          {t(
            'onboarding_done_subtitle',
            'Sua marca está pronta. Vá ao Estúdio para o próximo passo — ou abra o Swipe e aprove ideias.'
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button onClick={() => router.push('/')}>
          {t('onboarding_done_studio', 'Ir ao Estúdio')}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button secondary onClick={() => router.push('/swipe')}>
          <ImageIcon className="w-4 h-4 mr-2" />
          {t('onboarding_done_swipe', 'Abrir Content Swipe')}
        </Button>
      </div>

      <p className="text-xs text-textItemBlur">
        {t(
          'onboarding_done_hint',
          'O loop: DNA → Swipe → Gerar → Publicar nas suas redes.'
        )}
      </p>
    </div>
  );
}
