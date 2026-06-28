'use client';

import { useState, useCallback } from 'react';
import { useIdeasByBrand, mutateIdeasByBrand } from './content-ideas.hooks';
import { ContentIdea, ContentIdeaStatus } from './content-ideas.types';
import { approveIdea, rejectIdea, saveIdea } from './content-ideas.service';
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
} from 'lucide-react';
import clsx from 'clsx';

const statusColors: Record<ContentIdeaStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  SAVED: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  USED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  ARCHIVED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const statusLabels: Record<ContentIdeaStatus, string> = {
  NEW: 'Nova',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  SAVED: 'Salva',
  USED: 'Usada',
  ARCHIVED: 'Arquivada',
};

export function ContentSwipe({ brandId }: { brandId: string }) {
  const { data: ideas, isLoading, error } = useIdeasByBrand(brandId);
  const toaster = useToaster();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const list: ContentIdea[] = Array.isArray(ideas) ? ideas : ideas?.data || [];

  // Show only NEW ideas in swipe mode
  const newIdeas = list.filter((i) => i.status === 'NEW');
  const currentIdea = newIdeas[currentIndex];

  const handleAction = useCallback(
    async (idea: ContentIdea, action: 'approve' | 'reject' | 'save') => {
      setProcessingId(idea.id);
      try {
        if (action === 'approve') {
          await approveIdea(idea.id);
          toaster.show('Ideia aprovada! 🎉', 'success');
        } else if (action === 'reject') {
          await rejectIdea(idea.id);
          toaster.show('Ideia descartada', 'success');
        } else {
          await saveIdea(idea.id);
          toaster.show('Ideia salva para depois', 'success');
        }
        mutateIdeasByBrand(brandId);
        // Move to next idea
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <p className="text-gray-500">Erro ao carregar ideias</p>
      </div>
    );
  }

  if (newIdeas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <Lightbulb className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-500">
          Nenhuma ideia nova
        </h2>
        <p className="text-gray-400 text-center max-w-md">
          Gere ideias de carrossel usando a Brand DNA da marca selecionada.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Content Swipe</h1>
          <p className="text-sm text-gray-500 mt-1">
            {newIdeas.length} ideias para revisar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {currentIndex + 1} / {newIdeas.length}
          </span>
        </div>
      </div>

      {/* Card */}
      {currentIdea && (
        <div className="rounded-[16px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] overflow-hidden shadow-lg">
          {/* Card Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold text-black dark:text-white flex-1">
                {currentIdea.title}
              </h2>
              {currentIdea.score != null && (
                <span className="text-lg font-bold text-green-600 dark:text-green-400 ml-4">
                  {currentIdea.score}/10
                </span>
              )}
            </div>

            {/* Hook */}
            <div className="flex items-start gap-3 mb-4 p-3 rounded-[10px] bg-blue-50 dark:bg-blue-900/20">
              <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Hook
                </span>
                <p className="text-sm text-black/80 dark:text-white/80 mt-1">
                  {currentIdea.hook}
                </p>
              </div>
            </div>

            {/* Goal */}
            <div className="flex items-start gap-3 mb-4 p-3 rounded-[10px] bg-purple-50 dark:bg-purple-900/20">
              <Target className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Objetivo
                </span>
                <p className="text-sm text-black/80 dark:text-white/80 mt-1">
                  {currentIdea.goal}
                </p>
              </div>
            </div>

            {/* Angle */}
            <div className="flex items-start gap-3 p-3 rounded-[10px] bg-amber-50 dark:bg-amber-900/20">
              <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Ângulo
                </span>
                <p className="text-sm text-black/80 dark:text-white/80 mt-1">
                  {currentIdea.angle}
                </p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {currentIdea.templateSuggestion && (
                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                  <Layout className="w-3 h-3" />
                  {currentIdea.templateSuggestion}
                </span>
              )}
              {currentIdea.platformSuggestion && (
                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                  <Globe className="w-3 h-3" />
                  {currentIdea.platformSuggestion}
                </span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-black/5 dark:border-white/5">
            <Button
              onClick={goPrev}
              disabled={currentIndex === 0}
              secondary
              className="!px-3"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleAction(currentIdea, 'reject')}
                disabled={!!processingId}
                secondary
                className="!px-4 !py-2"
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
                className="!px-4 !py-2"
              >
                <Bookmark className="w-4 h-4" />
                Salvar
              </Button>

              <Button
                onClick={() => handleAction(currentIdea, 'approve')}
                disabled={!!processingId}
                className="!px-4 !py-2"
              >
                <ThumbsUp className="w-4 h-4" />
                Aprovar
              </Button>
            </div>

            <Button
              onClick={goNext}
              disabled={currentIndex === newIdeas.length - 1}
              secondary
              className="!px-3"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-4 rounded-[10px] bg-green-50 dark:bg-green-900/20">
          <div className="text-2xl font-bold text-green-600">
            {list.filter((i) => i.status === 'APPROVED').length}
          </div>
          <div className="text-xs text-green-600/70">Aprovadas</div>
        </div>
        <div className="text-center p-4 rounded-[10px] bg-amber-50 dark:bg-amber-900/20">
          <div className="text-2xl font-bold text-amber-600">
            {list.filter((i) => i.status === 'SAVED').length}
          </div>
          <div className="text-xs text-amber-600/70">Salvas</div>
        </div>
        <div className="text-center p-4 rounded-[10px] bg-red-50 dark:bg-red-900/20">
          <div className="text-2xl font-bold text-red-600">
            {list.filter((i) => i.status === 'REJECTED').length}
          </div>
          <div className="text-xs text-red-600/70">Rejeitadas</div>
        </div>
      </div>
    </div>
  );
}
