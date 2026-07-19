'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  PageShell,
  PageHeader,
  PageBody,
} from '@gitroom/frontend/components/new-layout/page-system';
import {
  getLatestDna,
  getSelectedBrand,
} from '@gitroom/frontend/components/brand-dna/brand-dna.service';
import type { BrandDnaSnapshot } from '@gitroom/frontend/components/brand-dna/brand-dna.types';
import { OnboardingStepper } from './ui/onboarding-stepper';
import { WelcomeStep } from './steps/welcome.step';
import { BrandIdentityStep } from './steps/brand-identity.step';
import { BrandAnalyzeStep } from './steps/brand-analyze.step';
import { BrandReviewStep } from './steps/brand-review.step';
import { ConnectChannelsStep } from './steps/connect-channels.step';
import { FirstContentStep } from './steps/first-content.step';
import { DoneStep } from './steps/done.step';
import { useOnboardingStatus } from './unified-onboarding.hooks';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  ONBOARDING_VERSION,
  type BrandFormState,
  type OnboardingProgress,
  type OnboardingStepId,
  type UnifiedOnboardingContext,
  parseStepId,
  stepIdAt,
  stepIndex,
} from './unified-onboarding.types';

export function UnifiedOnboarding() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetch = useFetch();
  const { status, isLoading, patch } = useOnboardingStatus();

  const [step, setStep] = useState<OnboardingStepId>('welcome');
  const [brandId, setBrandId] = useState('');
  const [brandForm, setBrandForm] = useState<BrandFormState>({
    name: '',
    website: '',
    industry: '',
  });
  const [dna, setDna] = useState<BrandDnaSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hydrated = useRef(false);

  // Hydrate from server + URL + legacy company profile
  useEffect(() => {
    if (isLoading || hydrated.current) return;
    hydrated.current = true;

    const fromUrl = parseStepId(searchParams.get('step'));
    const progress = status?.progress;
    const fromProgress = parseStepId(progress?.currentStep);
    const initialStep = fromUrl || fromProgress || 'welcome';

    setStep(initialStep);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('step') !== initialStep) {
        url.searchParams.set('step', initialStep);
        window.history.replaceState({}, '', url.toString());
      }
    }

    if (progress?.brandId) setBrandId(progress.brandId);

    void (async () => {
      // Legacy company profile import (fills empty brand form)
      try {
        const companyRes = await fetch('/settings/company-profiles');
        if (companyRes.ok) {
          const collection = await companyRes.json();
          const companies = collection?.companies || [];
          const selectedId = collection?.selectedCompanyId;
          const company =
            companies.find((c: any) => c.id === selectedId) || companies[0];
          if (company) {
            setBrandForm((prev) => ({
              name: prev.name || company.companyName || '',
              website: prev.website || company.website || '',
              industry: prev.industry || company.industry || '',
            }));
          }
        }
      } catch {
        // optional
      }

      try {
        const selected = await getSelectedBrand();
        if (selected?.id) {
          setBrandId((prev) => prev || selected.id);
          setBrandForm((prev) => ({
            name: prev.name || selected.name || '',
            website: prev.website || selected.website || '',
            industry: prev.industry || selected.industry || '',
          }));
          const latest = await getLatestDna(selected.id);
          if (latest) setDna(latest as BrandDnaSnapshot);
        } else if (progress?.brandId) {
          const latest = await getLatestDna(progress.brandId);
          if (latest) setDna(latest as BrandDnaSnapshot);
        }
      } catch {
        // ignore — brand optional at start
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, status]);

  const persistProgress = useCallback(
    async (partial: Partial<OnboardingProgress> = {}) => {
      const next: OnboardingProgress = {
        currentStep: partial.currentStep || step,
        brandId: partial.brandId ?? brandId,
        version: ONBOARDING_VERSION,
      };
      await patch({ progress: next });
    },
    [step, brandId, patch]
  );

  const goToStep = useCallback(
    (next: OnboardingStepId) => {
      setError('');
      setStep(next);
      void patch({
        progress: {
          currentStep: next,
          brandId,
          version: ONBOARDING_VERSION,
        },
      });
      const url = new URL(window.location.href);
      url.searchParams.set('step', next);
      window.history.replaceState({}, '', url.toString());
    },
    [brandId, patch]
  );

  const goNext = useCallback(() => {
    const idx = stepIndex(step);
    goToStep(stepIdAt(idx + 1));
  }, [step, goToStep]);

  const goBack = useCallback(() => {
    const idx = stepIndex(step);
    if (idx <= 0) return;
    goToStep(stepIdAt(idx - 1));
  }, [step, goToStep]);

  const skipStep = useCallback(() => {
    goNext();
  }, [goNext]);

  const completeOnboarding = useCallback(async () => {
    setLoading(true);
    try {
      await patch({
        complete: true,
        progress: {
          currentStep: 'done',
          brandId,
          version: ONBOARDING_VERSION,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [patch, brandId]);

  const skipAll = useCallback(async () => {
    setLoading(true);
    try {
      await patch({
        complete: true,
        progress: {
          currentStep: 'done',
          brandId,
          version: ONBOARDING_VERSION,
        },
      });
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [patch, brandId, router]);

  const ctx: UnifiedOnboardingContext = useMemo(
    () => ({
      brandId,
      brandForm,
      setBrandForm,
      setBrandId,
      dna,
      setDna,
      goToStep,
      goNext,
      goBack,
      skipStep,
      completeOnboarding,
      skipAll,
      loading,
      setLoading,
      error,
      setError,
      persistProgress,
    }),
    [
      brandId,
      brandForm,
      dna,
      goToStep,
      goNext,
      goBack,
      skipStep,
      completeOnboarding,
      skipAll,
      loading,
      error,
      persistProgress,
    ]
  );

  if (isLoading) {
    return (
      <PageShell>
        <PageBody>
          <div className="w-full max-w-[920px] mx-auto py-20 text-center text-sm text-textItemBlur">
            {t('loading', 'Carregando…')}
          </div>
        </PageBody>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        description={t(
          'onboarding_header_desc',
          'Cole a URL da marca, revise o DNA e gere o primeiro conteúdo'
        )}
        actions={
          step !== 'done' ? (
            <Button secondary onClick={skipAll} loading={loading}>
              {t('skip_onboarding', 'Pular introdução')}
            </Button>
          ) : null
        }
      />
      <PageBody>
        <div className="w-full max-w-[920px] mx-auto pb-10">
          <OnboardingStepper
            current={step}
            onJump={(id) => {
              if (stepIndex(id) <= stepIndex(step)) goToStep(id);
            }}
          />

          {error ? (
            <div className="mb-6 p-4 rounded-[10px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          ) : null}

          {step === 'welcome' && <WelcomeStep ctx={ctx} />}
          {step === 'brand-identity' && <BrandIdentityStep ctx={ctx} />}
          {step === 'brand-analyze' && <BrandAnalyzeStep ctx={ctx} />}
          {step === 'brand-review' && <BrandReviewStep ctx={ctx} />}
          {step === 'first-content' && <FirstContentStep ctx={ctx} />}
          {step === 'connect-channels' && <ConnectChannelsStep ctx={ctx} />}
          {step === 'done' && <DoneStep ctx={ctx} />}
        </div>
      </PageBody>
    </PageShell>
  );
}
