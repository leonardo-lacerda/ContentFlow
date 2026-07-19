'use client';

import { Sparkles } from 'lucide-react';
import type { AmpliarPrefill } from './ampliar.types';

export function AmpliarSourceBanner({ prefill }: { prefill: AmpliarPrefill }) {
  if (!prefill.hasSource) return null;

  const title = prefill.topic || prefill.hook || 'Conteúdo selecionado';
  const fromLabel =
    prefill.from === 'carousel'
      ? 'carrossel'
      : prefill.from === 'studio'
        ? 'estúdio'
        : prefill.ideaId
          ? 'ideia do Swipe'
          : 'origem';

  return (
    <div className="mb-4 flex items-start gap-3 rounded-[12px] border border-btnPrimary/30 bg-btnPrimary/10 px-4 py-3">
      <Sparkles className="w-4 h-4 text-btnPrimary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-newTextColor">
          A partir {prefill.ideaId || prefill.projectId ? `d${fromLabel.startsWith('i') || fromLabel.startsWith('e') ? 'a' : 'o'}` : 'de'}:{' '}
          <span className="font-bold">{title}</span>
        </div>
        {prefill.hook && prefill.topic !== prefill.hook ? (
          <p className="text-[11px] text-textItemBlur mt-1 line-clamp-2">
            {prefill.hook}
          </p>
        ) : null}
      </div>
    </div>
  );
}
