'use client';

import { useMemo } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  FEATURE_CATALOG,
  FEATURE_SECTIONS,
} from '../unified-onboarding.catalog';
import { FeatureCard } from '../ui/feature-card';
import { StepFooter } from '../ui/step-footer';
import type { UnifiedOnboardingContext } from '../unified-onboarding.types';

export function FeatureTourStep({ ctx }: { ctx: UnifiedOnboardingContext }) {
  const t = useT();

  const seenCount = useMemo(() => {
    const set = new Set([
      ...ctx.openedFeatureIds,
      ...ctx.skippedFeatureIds,
    ]);
    return set.size;
  }, [ctx.openedFeatureIds, ctx.skippedFeatureIds]);

  const total = FEATURE_CATALOG.length;

  const handleOpen = (id: string, path: string) => {
    ctx.markFeatureOpened(id);
    window.open(path, '_blank', 'noopener,noreferrer');
  };

  const continueNext = async () => {
    await ctx.persistProgress({ currentStep: 'done' });
    ctx.goNext();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[14px] border border-newTableBorder bg-newSettings p-6">
        <h2 className="text-2xl font-[800] text-newTextColor">
          {t('onboarding_tour_title', 'Conheça o ContentFlow')}
        </h2>
        <p className="text-sm text-textItemBlur mt-1">
          {t(
            'onboarding_tour_subtitle',
            'Explore as principais features. Abra as que quiser agora ou marque para depois.'
          )}
        </p>
        <p className="text-xs font-bold text-textItemBlur mt-3">
          {t('onboarding_tour_progress', 'Progresso')}: {seenCount}/{total}
        </p>
      </div>

      {FEATURE_SECTIONS.map((section) => {
        const cards = FEATURE_CATALOG.filter((f) => f.section === section.id);
        if (!cards.length) return null;
        return (
          <div key={section.id} className="space-y-3">
            <h3 className="text-[12px] font-[800] uppercase tracking-[0.08em] text-textItemBlur">
              {t(section.titleKey, section.titleDefault)}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {cards.map((feature) => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  opened={ctx.openedFeatureIds.includes(feature.id)}
                  skipped={ctx.skippedFeatureIds.includes(feature.id)}
                  onOpen={() => handleOpen(feature.id, feature.path)}
                  onLater={() => ctx.markFeatureSkipped(feature.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="rounded-[14px] border border-newTableBorder bg-newSettings p-4">
        <StepFooter
          onBack={ctx.goBack}
          onNext={continueNext}
          onSkip={continueNext}
          nextLabel={t('onboarding_tour_finish', 'Concluir onboarding')}
          skipLabel={t('onboarding_tour_skip_rest', 'Pular restantes')}
        />
      </div>
    </div>
  );
}
