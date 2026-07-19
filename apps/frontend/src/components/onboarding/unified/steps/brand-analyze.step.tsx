'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader, Search } from 'lucide-react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  analyzeBrand,
  getLatestDna,
} from '@gitroom/frontend/components/brand-dna/brand-dna.service';
import type { BrandDnaSnapshot } from '@gitroom/frontend/components/brand-dna/brand-dna.types';
import { StepFooter } from '../ui/step-footer';
import type { UnifiedOnboardingContext } from '../unified-onboarding.types';

export function BrandAnalyzeStep({ ctx }: { ctx: UnifiedOnboardingContext }) {
  const t = useT();
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>(
    'idle'
  );
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(false);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (started.current) return;
    if (!ctx.brandId) {
      // Sem brand: pular análise
      return;
    }
    if (ctx.dna?.summary) {
      setStatus('done');
      return;
    }
    if (!ctx.brandForm.website.trim()) {
      setStatus('idle');
      return;
    }
    started.current = true;
    void runAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.brandId, ctx.dna]);

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const runAnalyze = async () => {
    if (!ctx.brandId || !ctx.brandForm.website.trim()) return;
    setStatus('running');
    ctx.setError('');
    try {
      await analyzeBrand(ctx.brandId, ctx.brandForm.website.trim());
      clearPoll();
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts += 1;
        try {
          const dna = (await getLatestDna(ctx.brandId)) as BrandDnaSnapshot | null;
          if (dna?.summary) {
            clearPoll();
            ctx.setDna(dna);
            setStatus('done');
          } else if (attempts >= 40) {
            clearPoll();
            setStatus('error');
            ctx.setError(
              t(
                'onboarding_analyze_timeout',
                'A análise está demorando. Você pode pular e continuar.'
              )
            );
          }
        } catch {
          // keep polling
        }
      }, 3000);
    } catch (err: any) {
      setStatus('error');
      ctx.setError(
        err?.message ||
          t('onboarding_analyze_error', 'Não foi possível analisar o site')
      );
    }
  };

  const continueNext = async () => {
    await ctx.persistProgress({ currentStep: 'brand-review' });
    ctx.goNext();
  };

  if (!ctx.brandId) {
    return (
      <div className="rounded-[14px] border border-newTableBorder bg-newSettings p-6 space-y-4">
        <h2 className="text-2xl font-[800]">
          {t('onboarding_analyze_title', 'Analisar site')}
        </h2>
        <p className="text-sm text-textItemBlur">
          {t(
            'onboarding_analyze_no_brand',
            'Nenhuma marca criada ainda. Volte ou pule esta etapa.'
          )}
        </p>
        <StepFooter onBack={ctx.goBack} onSkip={ctx.skipStep} />
      </div>
    );
  }

  if (!ctx.brandForm.website.trim() && status === 'idle') {
    return (
      <div className="rounded-[14px] border border-newTableBorder bg-newSettings p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5" />
          <h2 className="text-2xl font-[800]">
            {t('onboarding_analyze_title', 'Analisar site')}
          </h2>
        </div>
        <p className="text-sm text-textItemBlur">
          {t(
            'onboarding_analyze_no_url',
            'Você não informou um website. Pule para revisar a identidade ou volte e adicione a URL.'
          )}
        </p>
        <StepFooter
          onBack={ctx.goBack}
          onNext={continueNext}
          onSkip={ctx.skipStep}
          nextLabel={t('onboarding_analyze_skip_to_review', 'Continuar sem análise')}
        />
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-newTableBorder bg-newSettings p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-[800] text-newTextColor">
          {t('onboarding_analyze_title', 'Analisar site')}
        </h2>
        <p className="text-sm text-textItemBlur mt-1">
          {t(
            'onboarding_analyze_subtitle',
            'Estamos extraindo o Brand DNA a partir do site informado.'
          )}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-10 gap-4">
        {status === 'running' && (
          <>
            <Loader className="w-10 h-10 animate-spin text-btnPrimary" />
            <p className="text-sm text-textItemBlur">
              {t(
                'onboarding_analyze_running',
                'Analisando… isso pode levar alguns segundos.'
              )}
            </p>
          </>
        )}
        {status === 'done' && (
          <p className="text-sm font-bold text-green-600 dark:text-green-400">
            {t('onboarding_analyze_done', 'DNA gerado com sucesso!')}
          </p>
        )}
        {status === 'error' && (
          <div className="text-center space-y-3">
            <p className="text-sm text-red-500">
              {t(
                'onboarding_analyze_failed',
                'Falha na análise. Você pode tentar de novo ou pular.'
              )}
            </p>
            <button
              type="button"
              className="text-sm font-bold underline text-newTextColor"
              onClick={() => {
                started.current = false;
                void runAnalyze();
              }}
            >
              {t('onboarding_analyze_retry', 'Tentar novamente')}
            </button>
          </div>
        )}
      </div>

      <StepFooter
        onBack={ctx.goBack}
        onNext={status === 'done' || status === 'error' ? continueNext : undefined}
        onSkip={ctx.skipStep}
        loading={status === 'running'}
        nextLabel={t('next', 'Próximo')}
        hideNext={status === 'running' || status === 'idle'}
      />
    </div>
  );
}
