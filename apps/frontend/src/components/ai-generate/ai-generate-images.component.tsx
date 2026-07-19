'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AiGenerateImagesStudioView } from './ai-generate-images-studio-view';
import { useAiGenerateImagesStudio } from './use-ai-generate-images-studio';

class StudioErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AiGenerateImages] studio crash', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-6 py-16 text-center">
          <h2 className="text-[22px] font-[800] text-black dark:text-white">
            Não foi possível abrir o studio de imagens
          </h2>
          <p className="text-[14px] text-black/60 dark:text-white/60">
            {this.state.error.message || 'Erro inesperado ao montar a interface.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              className="rounded-[10px] bg-stone-900 px-4 py-2 text-[13px] font-[700] text-white dark:bg-white dark:text-stone-900"
              onClick={() => this.setState({ error: null })}
            >
              Tentar novamente
            </button>
            <button
              type="button"
              className="rounded-[10px] border border-black/10 px-4 py-2 text-[13px] font-[700] dark:border-white/15"
              onClick={() => window.location.reload()}
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AiGenerateImagesStudio() {
  const studio = useAiGenerateImagesStudio();
  return <AiGenerateImagesStudioView studio={studio} />;
}

export const AiGenerateImagesComponent = () => {
  return (
    <StudioErrorBoundary>
      <AiGenerateImagesStudio />
    </StudioErrorBoundary>
  );
};
