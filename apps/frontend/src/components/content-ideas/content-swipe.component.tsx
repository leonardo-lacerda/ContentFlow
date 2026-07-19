'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useIdeasByBrand, mutateIdeasByBrand } from './content-ideas.hooks';
import { ContentIdea } from './content-ideas.types';
import {
  approveIdea,
  rejectIdea,
  saveIdea,
  createFromIdea,
} from './content-ideas.service';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
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
  const { data: ideas, isLoading, error } = useIdeasByBrand(brandId);
  const toaster = useToaster();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const list: ContentIdea[] = Array.isArray(ideas) ? ideas : ideas?.data || [];
  const newIdeas = list.filter((i) => i.status === 'NEW');
  const currentIdea = newIdeas[currentIndex];

  const handleAction = useCallback(
    async (idea: ContentIdea, action: 'approve' | 'reject' | 'save') => {
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
        mutateIdeasByBrand(brandId);
        if (currentIndex < newIdeas.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setCurrentIndex(0);
        }
      } catch (err: any) {
        toaster.show(err.message || 'Erro ao processar ideia', 'warning');
      } finally {
        setProcessingId(null);
      }
    },
    [brandId, currentIndex, newIdeas.length, toaster]
  );

  const goNext = () => {
    if (currentIndex < newIdeas.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleCreateCarousel = useCallback(
    async (idea: ContentIdea) => {
      setProcessingId(idea.id);
      try {
        let projectId = '';
        try {
          const project = await createFromIdea(idea.id);
          projectId =
            (project as any)?.id ||
            (project as any)?.data?.id ||
            '';
        } catch {
          // Continua mesmo se o project draft falhar — a ideia vai na URL.
        }

        mutateIdeasByBrand(brandId);

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
    [brandId, toaster, router]
  );

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
            title="Erro ao carregar ideias"
            description="Não foi possível carregar as ideias desta marca."
          />
        </PageBody>
      </PageShell>
    );
  }

  if (newIdeas.length === 0) {
    return (
      <PageShell>
        <PageHeader description="Revise ideias de carrossel geradas a partir da Brand DNA." />
        <PageBody className="!p-0">
          <EmptyState
            icon={<Lightbulb className="w-5 h-5" />}
            title="Nenhuma ideia nova"
            description="Gere ideias de carrossel usando a Brand DNA da marca selecionada."
          />
        </PageBody>
      </PageShell>
    );
  }

  const approvedCount = list.filter((i) => i.status === 'APPROVED').length;
  const savedCount = list.filter((i) => i.status === 'SAVED').length;
  const rejectedCount = list.filter((i) => i.status === 'REJECTED').length;

  return (
    <PageShell>
      <PageHeader
        description={`${newIdeas.length} ideias para revisar`}
        actions={
          <span className="text-[12px] text-textItemBlur font-[600]">
            {currentIndex + 1} / {newIdeas.length}
          </span>
        }
      />
      <PageBody>
        <div className="max-w-[640px] w-full mx-auto flex flex-col gap-[16px]">
          {currentIdea ? (
            <SectionCard className="!p-0 overflow-hidden">
              <div className="p-[20px] flex flex-col gap-[12px]">
                <div className="flex items-start justify-between gap-[12px]">
                  <h2 className="text-[18px] font-[600] text-newTextColor leading-snug">
                    {currentIdea.title}
                  </h2>
                  {currentIdea.score != null ? (
                    <span className="text-[14px] font-[700] text-emerald-400 shrink-0">
                      {currentIdea.score}/10
                    </span>
                  ) : null}
                </div>

                {currentIdea.hook ? (
                  <MetaBlock
                    icon={<Sparkles className="w-4 h-4" />}
                    label="Hook"
                  >
                    {currentIdea.hook}
                  </MetaBlock>
                ) : null}

                {currentIdea.goal ? (
                  <MetaBlock
                    icon={<Target className="w-4 h-4" />}
                    label="Objetivo"
                  >
                    {currentIdea.goal}
                  </MetaBlock>
                ) : null}

                {currentIdea.angle ? (
                  <MetaBlock
                    icon={<Lightbulb className="w-4 h-4" />}
                    label="Ângulo"
                  >
                    {currentIdea.angle}
                  </MetaBlock>
                ) : null}

                <div className="flex items-center gap-[8px] flex-wrap">
                  {currentIdea.templateSuggestion ? (
                    <span className="inline-flex items-center gap-[4px] text-[11px] bg-newSettings border border-newTableBorder text-textItemBlur px-[8px] py-[4px] rounded-full">
                      <Layout className="w-3 h-3" />
                      {currentIdea.templateSuggestion}
                    </span>
                  ) : null}
                  {currentIdea.platformSuggestion ? (
                    <span className="inline-flex items-center gap-[4px] text-[11px] bg-newSettings border border-newTableBorder text-textItemBlur px-[8px] py-[4px] rounded-full">
                      <Globe className="w-3 h-3" />
                      {currentIdea.platformSuggestion}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between gap-[8px] px-[16px] py-[14px] border-t border-newTableBorder flex-wrap">
                <Button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  secondary
                  className="!px-3 !h-[36px]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-[8px] flex-wrap justify-center">
                  <Button
                    onClick={() => handleAction(currentIdea, 'reject')}
                    disabled={!!processingId}
                    secondary
                    className="!h-[36px] !text-[12px]"
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
                    disabled={!!processingId}
                    secondary
                    className="!h-[36px] !text-[12px]"
                  >
                    <Bookmark className="w-4 h-4" />
                    Salvar
                  </Button>
                  <Button
                    onClick={() => handleAction(currentIdea, 'approve')}
                    disabled={!!processingId}
                    className="!h-[36px] !text-[12px]"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Aprovar
                  </Button>
                  <Button
                    onClick={() => handleCreateCarousel(currentIdea)}
                    disabled={!!processingId}
                    className="!h-[36px] !text-[12px]"
                  >
                    <Play className="w-4 h-4" />
                    Criar carrossel
                  </Button>
                </div>

                <Button
                  onClick={goNext}
                  disabled={currentIndex === newIdeas.length - 1}
                  secondary
                  className="!px-3 !h-[36px]"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </SectionCard>
          ) : null}

          <div className="grid grid-cols-3 gap-[10px]">
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
        </div>
      </PageBody>
    </PageShell>
  );
}
