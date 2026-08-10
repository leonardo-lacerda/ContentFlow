'use client';

import { useEffect, useState } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { formControlClass } from '@gitroom/frontend/components/new-layout/page-system';
import { createDnaSnapshot } from '@gitroom/frontend/components/brand-dna/brand-dna.service';
import type { BrandDnaSnapshot } from '@gitroom/frontend/components/brand-dna/brand-dna.types';
import { StepFooter } from '../ui/step-footer';
import type { UnifiedOnboardingContext } from '../unified-onboarding.types';

const inputClass = formControlClass + ' h-[44px]';
const areaClass = formControlClass + ' min-h-[88px] py-2';

type DnaDraft = {
  tagline: string;
  description: string;
  industry: string;
  targetAudience: string;
  tone: string;
  style: string;
  personality: string;
  demographics: string;
  painPoints: string;
  colors: string;
  visualStyle: string;
};

function fromDna(dna: BrandDnaSnapshot | null, fallbackIndustry = ''): DnaDraft {
  return {
    tagline: dna?.summary?.tagline || '',
    description: dna?.summary?.description || '',
    industry: dna?.summary?.industry || fallbackIndustry || '',
    targetAudience: dna?.summary?.targetAudience || '',
    tone: dna?.voice?.tone || '',
    style: dna?.voice?.style || '',
    personality: dna?.voice?.personality || '',
    demographics: dna?.audience?.demographics || '',
    painPoints: (dna?.audience?.painPoints || []).join(', '),
    colors: (dna?.visual?.colors || []).join(', '),
    visualStyle: dna?.visual?.style || '',
  };
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function BrandReviewStep({ ctx }: { ctx: UnifiedOnboardingContext }) {
  const t = useT();
  const [draft, setDraft] = useState<DnaDraft>(() =>
    fromDna(ctx.dna, ctx.brandForm.industry)
  );

  useEffect(() => {
    setDraft(fromDna(ctx.dna, ctx.brandForm.industry));
  }, [ctx.dna, ctx.brandForm.industry]);

  const setField = (key: keyof DnaDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const continueNext = async () => {
    ctx.setLoading(true);
    ctx.setError('');
    try {
      const painPoints = splitList(draft.painPoints);
      const colors = splitList(draft.colors);

      const summary = {
        tagline: draft.tagline,
        description: draft.description,
        industry: draft.industry || ctx.brandForm.industry || '',
        targetAudience: draft.targetAudience || draft.demographics,
      };
      const voice = {
        tone: draft.tone,
        style: draft.style,
        personality: draft.personality,
        forbiddenWords: ctx.dna?.voice?.forbiddenWords || [],
      };
      const audience = {
        demographics: draft.demographics || draft.targetAudience,
        painPoints,
        desires: ctx.dna?.audience?.desires || [],
        objections: ctx.dna?.audience?.objections || [],
      };
      const offer = ctx.dna?.offer || {
        products: [] as string[],
        services: [] as string[],
        uniqueSellingPoints: [] as string[],
      };
      const visual = {
        ...(ctx.dna?.visual || {}),
        colors,
        style: draft.visualStyle,
      };
      const constraints = ctx.dna?.constraints || {
        do: [],
        avoid: voice.forbiddenWords || [],
        requiredElements: [],
      };

      if (ctx.brandId) {
        try {
          const saved = await createDnaSnapshot(ctx.brandId, {
            sourceType: ctx.dna ? 'manual-edit' : 'manual',
            sourceUrl: ctx.brandForm.website || undefined,
            summary,
            voice,
            audience,
            offer,
            visual,
            constraints,
          });
          if (saved) {
            ctx.setDna(saved as BrandDnaSnapshot);
          } else {
            ctx.setDna({
              ...(ctx.dna as BrandDnaSnapshot),
              summary,
              voice,
              audience,
              offer,
              visual,
              constraints,
            } as BrandDnaSnapshot);
          }
        } catch {
          // Admin policy or API failure: keep local draft and still dual-write company
          ctx.setDna({
            ...(ctx.dna as BrandDnaSnapshot),
            summary,
            voice,
            audience,
            offer,
            visual,
            constraints,
          } as BrandDnaSnapshot);
        }
      }

      // v1: DNA já persistido via createDnaSnapshot/update — sem Company Profile
      await ctx.persistProgress({ currentStep: 'first-content' });
      ctx.goNext();
    } catch (err: any) {
      ctx.setError(
        err?.message ||
          t('onboarding_review_error', 'Erro ao salvar a revisão')
      );
    } finally {
      ctx.setLoading(false);
    }
  };

  const hasAny =
    !!ctx.dna ||
    !!draft.description ||
    !!draft.tagline ||
    !!ctx.brandForm.name;

  return (
    <div className="rounded-[16px] border border-newTableBorder bg-newBgColorInner shadow-cfSm p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-[600] font-serif tracking-[-0.02em] text-newTextColor">
          {t('onboarding_review_title', 'Revisar identidade')}
        </h2>
        <p className="text-sm text-textItemBlur mt-1">
          {t(
            'onboarding_review_subtitle_edit',
            'Ajuste o DNA da marca. As alterações alimentam o studio de IA.'
          )}
        </p>
      </div>

      {!hasAny ? (
        <div className="rounded-[12px] border border-dashed border-newTableBorder p-6 text-sm text-textItemBlur">
          {t(
            'onboarding_review_empty',
            'Ainda não há DNA para revisar. Continue para conectar canais ou volte para analisar o site.'
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-bold text-textItemBlur">
              {t('onboarding_review_tagline', 'Tagline')}
            </span>
            <input
              className={inputClass}
              value={draft.tagline}
              onChange={(e) => setField('tagline', e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-bold text-textItemBlur">
              {t('onboarding_review_description', 'Descrição')}
            </span>
            <textarea
              className={areaClass}
              value={draft.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-textItemBlur">
              {t('onboarding_review_industry', 'Indústria')}
            </span>
            <input
              className={inputClass}
              value={draft.industry}
              onChange={(e) => setField('industry', e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-textItemBlur">
              {t('onboarding_review_tone', 'Tom de voz')}
            </span>
            <input
              className={inputClass}
              value={draft.tone}
              onChange={(e) => setField('tone', e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-textItemBlur">
              {t('onboarding_review_style', 'Estilo de voz')}
            </span>
            <input
              className={inputClass}
              value={draft.style}
              onChange={(e) => setField('style', e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-textItemBlur">
              {t('onboarding_review_personality', 'Personalidade')}
            </span>
            <input
              className={inputClass}
              value={draft.personality}
              onChange={(e) => setField('personality', e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-bold text-textItemBlur">
              {t('onboarding_review_primary', 'Público / demografia')}
            </span>
            <input
              className={inputClass}
              value={draft.demographics || draft.targetAudience}
              onChange={(e) => {
                setField('demographics', e.target.value);
                setField('targetAudience', e.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-bold text-textItemBlur">
              {t('onboarding_review_pains', 'Dores (separadas por vírgula)')}
            </span>
            <input
              className={inputClass}
              value={draft.painPoints}
              onChange={(e) => setField('painPoints', e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-textItemBlur">
              {t('onboarding_review_colors', 'Cores (vírgula)')}
            </span>
            <input
              className={inputClass}
              value={draft.colors}
              onChange={(e) => setField('colors', e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-textItemBlur">
              {t('onboarding_review_visual_style', 'Estilo visual')}
            </span>
            <input
              className={inputClass}
              value={draft.visualStyle}
              onChange={(e) => setField('visualStyle', e.target.value)}
            />
          </label>
        </div>
      )}

      <StepFooter
        onBack={ctx.goBack}
        onNext={continueNext}
        onSkip={ctx.skipStep}
        loading={ctx.loading}
        nextLabel={t('onboarding_review_continue', 'Continuar')}
      />
    </div>
  );
}
