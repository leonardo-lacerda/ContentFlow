'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useIdeasByBrand, mutateIdeasByBrand } from './content-ideas.hooks';
import { ContentIdea } from './content-ideas.types';
import {
  approveIdea,
  rejectIdea,
  saveIdea,
  createFromIdea,
  createIdea,
} from './content-ideas.service';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Sparkles,
  Target,
  Lightbulb,
  Layout,
  Globe,
  Loader,
  ChevronLeft,
  ChevronRight,
  Play,
  RefreshCw,
} from 'lucide-react';
import {
  PageShell,
  PageHeader,
  PageBody,
  EmptyState,
  SectionCard,
} from '@gitroom/frontend/components/new-layout/page-system';

function MetaBlock({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-[10px] p-[12px] rounded-[10px] bg-newBgColorInner border border-newTableBorder">
      <div className="text-textItemBlur mt-[2px] shrink-0">{icon}</div>
      <div className="min-w-0">
        <span className="text-[11px] font-[600] text-textItemBlur uppercase tracking-wide">
          {label}
        </span>
        <p className="text-[13px] text-newTextColor mt-[4px] leading-relaxed">
          {children}
        </p>
      </div>
    </div>
  );
}

export function ContentSwipe({ brandId }: { brandId: string }) {
  const router = useRouter();
  const fetch = useFetch();
  const { data: ideas, isLoading, error } = useIdeasByBrand(brandId);
  const toaster = useToaster();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generating, setGenerating] = useState(false);

  const list: ContentIdea[] = useMemo(
    () => (Array.isArray(ideas) ? ideas : ideas?.data || []),
    [ideas]
  );

  const newIdeas = useMemo(
    () => list.filter((i) => i.status === 'NEW'),
    [list]
  );

  // Evita índice fora da lista (bug do "Descartar" em sequência)
  useEffect(() => {
    if (newIdeas.length === 0) {
      if (currentIndex !== 0) setCurrentIndex(0);
      return;
    }
    if (currentIndex > newIdeas.length - 1) {
      setCurrentIndex(newIdeas.length - 1);
    }
  }, [newIdeas.length, currentIndex]);

  const safeIndex =
    newIdeas.length === 0
      ? 0
      : Math.min(Math.max(currentIndex, 0), newIdeas.length - 1);
  const currentIdea = newIdeas[safeIndex];

  const approvedCount = list.filter((i) => i.status === 'APPROVED').length;
  const rejectedCount = list.filter((i) => i.status === 'REJECTED').length;
  const savedCount = list.filter((i) => i.status === 'SAVED').length;
  const busy = Boolean(processingId) || generating;

  const handleAction = useCallback(
    async (idea: ContentIdea, action: 'approve' | 'reject' | 'save') => {
      if (processingId) return;
      setProcessingId(idea.id);
      try {
        if (action === 'approve') {
          await approveIdea(idea.id);
          toaster.show('Ideia aprovada', 'success');
        } else if (action === 'reject') {
          await rejectIdea(idea.id);
          toaster.show('Ideia descartada', 'success');
        } else {
          await saveIdea(idea.id);
          toaster.show('Ideia salva para depois', 'success');
        }
        // Mantém o índice: o próximo card “entra” na mesma posição.
        // O useEffect clampa se o índice ficar inválido.
        await mutateIdeasByBrand(brandId);
      } catch (err: any) {
        toaster.show(err.message || 'Erro ao processar ideia', 'warning');
      } finally {
        setProcessingId(null);
      }
    },
    [brandId, processingId, toaster]
  );

  const goNext = () => {
    if (safeIndex < newIdeas.length - 1) {
      setCurrentIndex(safeIndex + 1);
    }
  };

  const goPrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    }
  };

  const handleCreateCarousel = useCallback(
    async (idea: ContentIdea) => {
      if (processingId) return;
      setProcessingId(idea.id);
      try {
        let projectId = '';
        try {
          const project = await createFromIdea(idea.id);
          projectId =
            (project as any)?.id || (project as any)?.data?.id || '';
        } catch {
          /* ideia ainda vai na URL */
        }

        await mutateIdeasByBrand(brandId);

        const params = new URLSearchParams();
        params.set('from', 'swipe');
        if (idea.id) params.set('ideaId', idea.id);
        if (projectId) params.set('projectId', projectId);
        if (idea.title) params.set('topic', idea.title);
        if (idea.hook) params.set('hook', idea.hook);
        if (idea.angle) params.set('angle', idea.angle);
        if (idea.goal) params.set('goal', idea.goal);
        if (idea.platformSuggestion) {
          params.set('platform', idea.platformSuggestion);
        }
        if (idea.templateSuggestion) {
          params.set('template', idea.templateSuggestion);
        }

        toaster.show('Abrindo estúdio com a ideia...', 'success');
        router.push(`/generate?${params.toString()}`);
      } catch (err: any) {
        toaster.show(err.message || 'Erro ao criar carrossel', 'warning');
      } finally {
        setProcessingId(null);
      }
    },
    [brandId, toaster, router, processingId]
  );

  const handleGenerateMore = useCallback(async () => {
    if (!brandId || generating) return;
    setGenerating(true);
    try {
      const existingTitles = list
        .map((i) => i.title)
        .filter(Boolean)
        .slice(0, 40);

      const res = await fetch('/ai-generate/carousel-ideas', {
        method: 'POST',
        body: JSON.stringify({
          brandProfileId: brandId,
          language: 'pt-BR',
          existingTitles,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.message || data?.error || 'Erro ao gerar ideias'
        );
      }

      const generated: Array<{
        title?: string;
        hook?: string;
        goal?: string;
        angle?: string;
        templateSuggestion?: string;
        platformSuggestion?: string;
        score?: number;
      }> = data.ideas || data.data?.ideas || [];

      if (!generated.length) {
        throw new Error('Nenhuma ideia foi gerada. Tente de novo.');
      }

      let created = 0;
      for (const idea of generated) {
        try {
          await createIdea({
            brandProfileId: brandId,
            title: idea.title || 'Ideia',
            hook: idea.hook || idea.title || 'Hook',
            goal: idea.goal || 'Engajamento',
            angle: idea.angle || idea.hook || idea.title || 'Ângulo',
            templateSuggestion: idea.templateSuggestion,
            platformSuggestion: idea.platformSuggestion,
            score: idea.score,
          });
          created += 1;
        } catch {
          /* ignora falha individual */
        }
      }

      await mutateIdeasByBrand(brandId);
      setCurrentIndex(0);

      if (created === 0) {
        toaster.show(
          'Ideias geradas, mas não foi possível salvar. Tente de novo.',
          'warning'
        );
      } else {
        toaster.show(`${created} novas ideias prontas para revisar`, 'success');
      }
    } catch (err: any) {
      toaster.show(err?.message || 'Erro ao gerar ideias', 'warning');
    } finally {
      setGenerating(false);
    }
  }, [brandId, generating, list, fetch, toaster]);

  if (isLoading) {
    return (
      <PageShell>
        <PageBody className="!p-0">
          <div className="flex flex-1 items-center justify-center min-h-[320px]">
            <Loader className="w-8 h-8 animate-spin text-textItemBlur" />
          </div>
        </PageBody>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <PageBody className="!p-0">
          <EmptyState
            icon={<Lightbulb className="w-6 h-6" />}
            title="Erro ao carregar ideias"
            description="Tente recarregar a página."
          />
        </PageBody>
      </PageShell>
    );
  }

  const statsRow = (
    <div className="grid grid-cols-3 gap-[10px] w-full max-w-[420px]">
      {[
        { label: 'Aprovadas', value: approvedCount },
        { label: 'Salvas', value: savedCount },
        { label: 'Descartadas', value: rejectedCount },
      ].map((stat) => (
        <SectionCard key={stat.label} className="!p-[14px] text-center">
          <div className="text-[20px] font-[700] text-newTextColor leading-none">
            {stat.value}
          </div>
          <div className="text-[11px] text-textItemBlur mt-[6px]">
            {stat.label}
          </div>
        </SectionCard>
      ))}
    </div>
  );

  return (
    <PageShell>
      <PageHeader
        description={
          newIdeas.length > 0
            ? `${newIdeas.length} ideia${newIdeas.length === 1 ? '' : 's'} para revisar`
            : 'Revise ideias de carrossel geradas a partir da Brand DNA.'
        }
        actions={
          <Button
            onClick={handleGenerateMore}
            loading={generating}
            disabled={busy}
            secondary={newIdeas.length > 0}
          >
            {generating ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Gerando…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {newIdeas.length > 0 ? 'Gerar mais' : 'Gerar ideias'}
              </>
            )}
          </Button>
        }
      />
      <PageBody className="!p-0">
        {newIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 min-h-[420px] px-4">
            <EmptyState
              icon={<Lightbulb className="w-6 h-6" />}
              title={
                list.length > 0
                  ? 'Fila zerada'
                  : 'Nenhuma ideia nova'
              }
              description={
                list.length > 0
                  ? 'Você revisou todas as ideias. Gere um novo lote com o DNA da marca.'
                  : 'Gere ideias de carrossel usando a Brand DNA da marca selecionada.'
              }
            />
            <Button
              onClick={handleGenerateMore}
              loading={generating}
              disabled={busy}
            >
              {generating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Gerando ideias…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar 10 ideias
                </>
              )}
            </Button>
            {list.length > 0 ? statsRow : null}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-[20px] min-h-[calc(100vh-220px)] px-[16px] py-[24px]">
            <div className="text-[12px] text-textItemBlur tabular-nums">
              {safeIndex + 1} / {newIdeas.length}
            </div>

            {currentIdea ? (
              <SectionCard className="w-full max-w-[420px] !p-[24px] space-y-[18px]">
                <h2 className="text-[20px] font-[700] text-newTextColor leading-snug text-center">
                  {currentIdea.title}
                </h2>

                <div className="space-y-[10px]">
                  <MetaBlock
                    icon={<Sparkles className="w-4 h-4" />}
                    label="Hook"
                  >
                    {currentIdea.hook}
                  </MetaBlock>
                  <MetaBlock
                    icon={<Target className="w-4 h-4" />}
                    label="Objetivo"
                  >
                    {currentIdea.goal}
                  </MetaBlock>
                  <MetaBlock
                    icon={<Lightbulb className="w-4 h-4" />}
                    label="Ângulo"
                  >
                    {currentIdea.angle}
                  </MetaBlock>
                  {currentIdea.templateSuggestion ? (
                    <MetaBlock
                      icon={<Layout className="w-4 h-4" />}
                      label="Template"
                    >
                      {currentIdea.templateSuggestion}
                    </MetaBlock>
                  ) : null}
                  {currentIdea.platformSuggestion ? (
                    <MetaBlock
                      icon={<Globe className="w-4 h-4" />}
                      label="Plataforma"
                    >
                      {currentIdea.platformSuggestion}
                    </MetaBlock>
                  ) : null}
                </div>

                <div className="flex items-center justify-center gap-[8px] pt-[4px]">
                  <Button
                    onClick={goPrev}
                    disabled={safeIndex === 0 || busy}
                    secondary
                    className="!px-3 !h-[36px]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-[6px] flex-wrap justify-center">
                    <Button
                      onClick={() => handleAction(currentIdea, 'reject')}
                      disabled={busy}
                      secondary
                      className="!h-[36px] !px-3"
                    >
                      {processingId === currentIdea.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <ThumbsDown className="w-4 h-4" />
                      )}
                      Descartar
                    </Button>
                    <Button
                      onClick={() => handleAction(currentIdea, 'save')}
                      disabled={busy}
                      secondary
                      className="!h-[36px] !px-3"
                    >
                      <Bookmark className="w-4 h-4" />
                      Salvar
                    </Button>
                    <Button
                      onClick={() => handleAction(currentIdea, 'approve')}
                      disabled={busy}
                      className="!h-[36px] !px-3"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => handleCreateCarousel(currentIdea)}
                      disabled={busy}
                      className="!h-[36px] !px-3 !bg-btnPrimary"
                    >
                      <Play className="w-4 h-4" />
                      Criar carrossel
                    </Button>
                  </div>

                  <Button
                    onClick={goNext}
                    disabled={safeIndex === newIdeas.length - 1 || busy}
                    secondary
                    className="!px-3 !h-[36px]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </SectionCard>
            ) : null}

            {statsRow}
          </div>
        )}
      </PageBody>
    </PageShell>
  );
}
