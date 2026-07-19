'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb, Loader, Play, Sparkles } from 'lucide-react';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { StepFooter } from '../ui/step-footer';
import type {
  GeneratedIdea,
  UnifiedOnboardingContext,
} from '../unified-onboarding.types';

export function FirstContentStep({ ctx }: { ctx: UnifiedOnboardingContext }) {
  const t = useT();
  const fetch = useFetch();
  const router = useRouter();
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [persistedIds, setPersistedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const generateIdeas = async () => {
    if (!ctx.brandId) {
      ctx.setError(
        t(
          'onboarding_content_no_brand',
          'Crie uma marca antes de gerar ideias.'
        )
      );
      return;
    }
    setGenerating(true);
    ctx.setError('');
    try {
      const res = await fetch('/ai-generate/carousel-ideas', {
        method: 'POST',
        body: JSON.stringify({
          brandProfileId: ctx.brandId,
          companyContext:
            ctx.dna?.summary?.description ||
            ctx.brandForm.name ||
            'Marca',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message ||
            t('onboarding_content_gen_error', 'Erro ao gerar ideias')
        );
      }
      const generated: GeneratedIdea[] =
        data.ideas || data.data?.ideas || [];
      if (!generated.length) {
        throw new Error(
          t(
            'onboarding_content_empty',
            'Nenhuma ideia foi gerada. Tente novamente.'
          )
        );
      }

      const ids: string[] = [];
      for (const idea of generated) {
        try {
          const ideaRes = await fetch('/content-ideas', {
            method: 'POST',
            body: JSON.stringify({
              brandProfileId: ctx.brandId,
              title: idea.title || 'Ideia',
              hook: idea.hook || idea.title || 'Hook',
              goal: idea.goal || 'Engajamento',
              angle: idea.angle || idea.hook || idea.title || 'Ângulo',
              templateSuggestion: idea.templateSuggestion,
              platformSuggestion: idea.platformSuggestion,
              score: idea.score,
            }),
          });
          const ideaData = await ideaRes.json().catch(() => ({}));
          if (ideaRes.ok && ideaData.id) ids.push(ideaData.id);
          else ids.push('');
        } catch {
          ids.push('');
        }
      }

      setIdeas(generated);
      setPersistedIds(ids);
      setSelected(0);
    } catch (err: any) {
      ctx.setError(
        err?.message ||
          t('onboarding_content_gen_error', 'Erro ao gerar ideias')
      );
    } finally {
      setGenerating(false);
    }
  };

  const createCarousel = async () => {
    if (selected == null || !ideas[selected]) return;
    const idea = ideas[selected];
    const ideaId = persistedIds[selected];
    ctx.setLoading(true);
    ctx.setError('');
    try {
      let projectId = '';
      if (ideaId) {
        try {
          const res = await fetch(`/carousel-projects/from-idea/${ideaId}`, {
            method: 'POST',
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            projectId = data.id || data.projectId || '';
          }
        } catch {
          /* segue com query da ideia */
        }
      }

      await ctx.persistProgress({ currentStep: 'connect-channels' });

      const params = new URLSearchParams();
      params.set('from', 'swipe');
      if (ideaId) params.set('ideaId', ideaId);
      if (projectId) params.set('projectId', projectId);
      if (idea.title) params.set('topic', idea.title);
      if (idea.hook) params.set('hook', idea.hook);
      if (idea.angle) params.set('angle', idea.angle || '');
      if (idea.goal) params.set('goal', idea.goal || '');
      if (idea.platformSuggestion) {
        params.set('platform', idea.platformSuggestion);
      }
      if (idea.templateSuggestion) {
        params.set('template', idea.templateSuggestion);
      }

      router.push(`/generate?${params.toString()}`);
    } catch (err: any) {
      ctx.setError(
        err?.message ||
          t('onboarding_content_carousel_error', 'Erro ao criar carrossel')
      );
    } finally {
      ctx.setLoading(false);
    }
  };

  const continueTour = async () => {
    await ctx.persistProgress({ currentStep: 'connect-channels' });
    ctx.goNext();
  };

  if (!ctx.brandId) {
    return (
      <div className="rounded-[16px] border border-newTableBorder bg-newBgColorInner shadow-cfSm p-6 space-y-4">
        <h2 className="text-2xl font-[600] font-serif tracking-[-0.02em]">
          {t('onboarding_content_title', 'Primeiro conteúdo')}
        </h2>
        <p className="text-sm text-textItemBlur">
          {t(
            'onboarding_content_no_brand',
            'Crie uma marca antes de gerar ideias.'
          )}
        </p>
        <StepFooter onBack={ctx.goBack} onSkip={ctx.skipStep} />
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-newTableBorder bg-newBgColorInner shadow-cfSm p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-[600] font-serif tracking-[-0.02em] text-newTextColor">
          {t('onboarding_content_title', 'Primeiro conteúdo')}
        </h2>
        <p className="text-sm text-textItemBlur mt-1">
          {ideas.length === 0
            ? t(
                'onboarding_content_subtitle_empty',
                'Gere ideias de carrossel com base no Brand DNA e escolha uma para abrir no studio.'
              )
            : t(
                'onboarding_content_subtitle_ready',
                'Selecione uma ideia para criar o primeiro carrossel, ou continue o tour.'
              )}
        </p>
      </div>

      {generating && (
        <div className="flex flex-col items-center py-12 gap-4">
          <Loader className="w-10 h-10 animate-spin text-btnPrimary" />
          <p className="text-sm text-textItemBlur">
            {t(
              'onboarding_content_generating',
              'Gerando ideias de carrossel…'
            )}
          </p>
        </div>
      )}

      {!generating && ideas.length === 0 && (
        <div className="flex flex-col items-center py-10 gap-4">
          <Lightbulb className="w-12 h-12 text-textItemBlur" />
          <Button onClick={generateIdeas}>
            <Sparkles className="w-4 h-4 mr-2" />
            {t('onboarding_content_generate', 'Gerar ideias')}
          </Button>
        </div>
      )}

      {!generating && ideas.length > 0 && (
        <div className="space-y-3">
          {ideas.map((idea, index) => (
            <button
              key={`${idea.title}-${index}`}
              type="button"
              onClick={() => setSelected(index)}
              className={`w-full text-left p-4 rounded-[10px] border transition ${
                selected === index
                  ? 'border-btnPrimary bg-boxFocused'
                  : 'border-newTableBorder bg-newBgColorInner hover:border-textItemBlur'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-newTextColor">
                    {idea.title}
                  </h3>
                  <p className="text-sm text-textItemBlur mt-1 line-clamp-2">
                    {idea.hook}
                  </p>
                </div>
                {idea.score != null && (
                  <span className="text-sm font-bold text-green-600 dark:text-green-400 shrink-0">
                    {idea.score}/10
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {idea.templateSuggestion && (
                  <span className="text-xs bg-newSettings text-textItemBlur px-2 py-0.5 rounded-full border border-newTableBorder">
                    {idea.templateSuggestion}
                  </span>
                )}
                {idea.platformSuggestion && (
                  <span className="text-xs bg-newSettings text-textItemBlur px-2 py-0.5 rounded-full border border-newTableBorder">
                    {idea.platformSuggestion}
                  </span>
                )}
              </div>
            </button>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={createCarousel}
              loading={ctx.loading}
              disabled={selected == null}
            >
              <Play className="w-4 h-4 mr-2" />
              {t('onboarding_content_create', 'Gerar carrossel')}
            </Button>
            <Button onClick={generateIdeas} secondary disabled={generating}>
              <Sparkles className="w-4 h-4 mr-2" />
              {t('onboarding_content_regenerate', 'Gerar de novo')}
            </Button>
          </div>
        </div>
      )}

      <StepFooter
        onBack={ctx.goBack}
        onNext={continueTour}
        onSkip={ctx.skipStep}
        nextLabel={t('onboarding_content_continue_tour', 'Continuar tour')}
        skipLabel={t('onboarding_skip_step', 'Pular etapa')}
      />
    </div>
  );
}
