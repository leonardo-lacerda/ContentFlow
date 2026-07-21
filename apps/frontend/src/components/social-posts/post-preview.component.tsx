'use client';

import React, { useState } from 'react';
import type { GeneratedSocialPost } from './social-posts.types';
import { PlatformBadge } from './platform-badge.component';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Button } from '@gitroom/react/form/button';

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-newTableBorder pt-2 mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-textItemBlur uppercase hover:text-newTextColor w-full"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {title}
      </button>
      {open ? <div className="mt-2 text-[12px] text-textItemBlur space-y-1.5">{children}</div> : null}
    </div>
  );
}

export function PostPreview({ post }: { post: GeneratedSocialPost }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = [post.content, post.hashtags?.length ? '#' + post.hashtags.join(' #') : '', post.cta ? `CTA: ${post.cta}` : '']
      .filter(Boolean)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-[8px]">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={post.platform} />
          {post.tone ? (
            <span className="text-[10px] text-textItemBlur italic">{post.tone}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-textItemBlur">{post.charCount} chars</span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded hover:bg-newSettings text-textItemBlur hover:text-newTextColor"
            title="Copiar post"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="whitespace-pre-wrap text-[13px] text-newTextColor leading-relaxed">
        {post.content}
      </div>

      {/* Hashtags */}
      {post.hashtags?.length > 0 ? (
        <div className="flex flex-wrap gap-[6px]">
          {post.hashtags.map((tag, i) => (
            <span
              key={i}
              className="text-[11px] px-[8px] py-[3px] rounded-[6px] bg-newSettings border border-newTableBorder text-textItemBlur"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* CTA */}
      {post.cta ? (
        <div className="text-[12px] font-[600] text-newTextColor">CTA: {post.cta}</div>
      ) : null}

      {/* Notes */}
      {post.notes ? (
        <div className="text-[12px] text-amber-400/90">{post.notes}</div>
      ) : null}

      {/* Strategic sections (collapsible) */}
      {post.rationale ? (
        <CollapsibleSection title="Estratégia">
          <p>{post.rationale}</p>
          {post.hookAnalysis ? <p className="mt-1"><strong className="text-newTextColor">Hook:</strong> {post.hookAnalysis}</p> : null}
          {post.platformOptimization ? <p className="mt-1"><strong className="text-newTextColor">Otimização:</strong> {post.platformOptimization}</p> : null}
        </CollapsibleSection>
      ) : null}

      {post.visualGuidance?.length ? (
        <CollapsibleSection title="Direção Visual">
          {post.visualGuidance.map((v, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-newTextColor font-medium shrink-0">{v.type}:</span>
              <span>{v.description}</span>
            </div>
          ))}
        </CollapsibleSection>
      ) : null}

      {post.engagementStrategy ? (
        <CollapsibleSection title="Engajamento">
          <p><strong className="text-newTextColor">Técnica:</strong> {post.engagementStrategy.technique}</p>
          <p>{post.engagementStrategy.explanation}</p>
          {post.engagementStrategy.expectedOutcome ? (
            <p className="text-emerald-400/80">Resultado esperado: {post.engagementStrategy.expectedOutcome}</p>
          ) : null}
        </CollapsibleSection>
      ) : null}

      {post.postingStrategy ? (
        <CollapsibleSection title="Publicação">
          {post.postingStrategy.bestTime ? <p><strong className="text-newTextColor">Melhor horário:</strong> {post.postingStrategy.bestTime}</p> : null}
          {post.postingStrategy.bestDay ? <p><strong className="text-newTextColor">Melhor dia:</strong> {post.postingStrategy.bestDay}</p> : null}
          {post.postingStrategy.frequency ? <p><strong className="text-newTextColor">Frequência:</strong> {post.postingStrategy.frequency}</p> : null}
          {post.postingStrategy.repurposeSuggestions?.length ? (
            <p className="text-textItemBlur">Reaproveitar: {post.postingStrategy.repurposeSuggestions.join(', ')}</p>
          ) : null}
        </CollapsibleSection>
      ) : null}

      {post.growthTips?.length ? (
        <CollapsibleSection title="Dicas de Crescimento">
          {post.growthTips.map((t, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-newSettings border border-newTableBorder text-textItemBlur shrink-0">{t.category}</span>
              <span>{t.tip}</span>
              {t.impact ? <span className="text-[10px] text-emerald-400/70 shrink-0">{t.impact}</span> : null}
            </div>
          ))}
        </CollapsibleSection>
      ) : null}

      {post.expectedEngagement ? (
        <CollapsibleSection title="Engajamento Esperado">
          <div className="grid grid-cols-3 gap-2">
            {post.expectedEngagement.likes ? <div><span className="text-textItemBlur">Curtidas:</span> {post.expectedEngagement.likes}</div> : null}
            {post.expectedEngagement.comments ? <div><span className="text-textItemBlur">Comentários:</span> {post.expectedEngagement.comments}</div> : null}
            {post.expectedEngagement.shares ? <div><span className="text-textItemBlur">Compartilhamentos:</span> {post.expectedEngagement.shares}</div> : null}
          </div>
          {post.expectedEngagement.notes ? <p className="mt-1 text-textItemBlur">{post.expectedEngagement.notes}</p> : null}
        </CollapsibleSection>
      ) : null}
    </div>
  );
}
