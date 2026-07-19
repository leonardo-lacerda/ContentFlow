'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useSelectedBrand } from '@gitroom/frontend/components/brand-dna/brand-dna.hooks';
import {
  PageShell,
  PageHeader,
  PageBody,
  EmptyState,
  SectionCard,
  useCreateDrawer,
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
} from '@gitroom/frontend/components/new-layout/page-system';
import {
  buildContextFromPrefill,
  useAmpliarPrefill,
} from '@gitroom/frontend/components/ampliar/use-ampliar-prefill';
import { AmpliarSourceBanner } from '@gitroom/frontend/components/ampliar/ampliar-source-banner.component';
import { Clapperboard, Copy, Play, X } from 'lucide-react';

interface VideoScene {
  sceneNumber: number;
  duration: number;
  headline?: string;
  body?: string;
  voiceover?: string;
  textOverlay?: string;
  visualNotes?: string;
  transition?: string;
  imagePrompt?: string;
}

interface VideoScript {
  title: string;
  totalDuration: number;
  scenes: VideoScene[];
  narration?: string;
  hashtags?: string[];
  caption?: string;
  _id?: string;
  _createdAt?: string;
  _format?: string;
}

const VIDEO_FORMATS = [
  { id: 'REELS', name: 'Instagram Reels', maxDuration: 30, aspectRatio: '9:16' },
  { id: 'TIKTOK', name: 'TikTok', maxDuration: 30, aspectRatio: '9:16' },
  { id: 'SHORTS', name: 'YouTube Shorts', maxDuration: 60, aspectRatio: '9:16' },
  { id: 'STORIES', name: 'Stories', maxDuration: 15, aspectRatio: '9:16' },
];

function Teleprompter({
  script,
  onClose,
}: {
  script: VideoScript;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const scenes = script.scenes || [];
  const scene = scenes[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, scenes.length - 1));
      }
      if (e.key === 'ArrowLeft') {
        setIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scenes.length, onClose]);

  if (!scene) return null;

  const line =
    scene.voiceover ||
    scene.textOverlay ||
    scene.headline ||
    scene.body ||
    '';

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 text-white flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="text-sm opacity-70">
          Cena {index + 1}/{scenes.length} · ~{scene.duration || 0}s
        </div>
        <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <p className="text-2xl md:text-4xl font-semibold leading-snug max-w-3xl">
          {line}
        </p>
      </div>
      {scene.visualNotes ? (
        <div className="px-6 pb-2 text-center text-xs text-white/50">
          Visual: {scene.visualNotes}
        </div>
      ) : null}
      <div className="flex items-center justify-center gap-3 p-4 border-t border-white/10">
        <Button
          secondary
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Anterior
        </Button>
        <Button
          disabled={index >= scenes.length - 1}
          onClick={() => setIndex((i) => Math.min(scenes.length - 1, i + 1))}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}

function GenerateVideoScriptForm({
  brandId,
  onGenerated,
  onClose,
  initialProjectId,
  initialIdeaId,
  initialContext,
  initialFormat,
  initialDuration,
}: {
  brandId?: string;
  onGenerated: (script: VideoScript) => void;
  onClose: () => void;
  initialProjectId?: string;
  initialIdeaId?: string;
  initialContext?: string;
  initialFormat?: string;
  initialDuration?: string;
}) {
  const fetch = useFetch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carouselProjectId, setCarouselProjectId] = useState(initialProjectId || '');
  const [contentIdeaId, setContentIdeaId] = useState(initialIdeaId || '');
  const [format, setFormat] = useState(
    (initialFormat || 'REELS').toUpperCase()
  );
  const [maxDuration, setMaxDuration] = useState(
    Number(initialDuration) || 30
  );
  const [additionalContext, setAdditionalContext] = useState(
    initialContext || ''
  );

  const handleFormatChange = (newFormat: string) => {
    setFormat(newFormat);
    const fmt = VIDEO_FORMATS.find((f) => f.id === newFormat);
    if (fmt) setMaxDuration(fmt.maxDuration);
  };

  const canGenerate =
    Boolean(brandId) &&
    (Boolean(carouselProjectId.trim()) || Boolean(contentIdeaId.trim()));

  const handleGenerate = async () => {
    if (!canGenerate || !brandId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/video-scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandProfileId: brandId,
          carouselProjectId: carouselProjectId.trim() || undefined,
          contentIdeaId: contentIdeaId.trim() || undefined,
          format,
          maxDuration,
          name: additionalContext?.slice(0, 80) || 'Roteiro Ampliar',
          additionalContext: additionalContext || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.msg || 'Falha ao gerar o script');
      }
      const script = (data.script || data) as VideoScript;
      onGenerated({
        ...script,
        scenes: script.scenes || data.scenes || [],
        title: script.title || data.name || 'Roteiro',
        totalDuration: script.totalDuration || data.totalDurationSec || maxDuration,
        _id: data.id || `${Date.now()}`,
        _createdAt: new Date().toISOString(),
        _format: format,
      });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-[16px]">
      {!brandId ? (
        <div className="text-[13px] text-textItemBlur rounded-[10px] border border-newTableBorder bg-newSettings p-[12px]">
          Selecione uma marca no seletor do topo antes de gerar.
        </div>
      ) : null}

      <FormField label="ID da ideia (Swipe)" hint="Ou carrossel abaixo">
        <FormInput
          value={contentIdeaId}
          onChange={(e) => setContentIdeaId(e.target.value)}
          placeholder="contentIdeaId"
        />
      </FormField>

      <FormField label="ID do carrossel" hint="Opcional se tiver ideia">
        <FormInput
          value={carouselProjectId}
          onChange={(e) => setCarouselProjectId(e.target.value)}
          placeholder="carouselProjectId"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-[12px]">
        <FormField label="Formato">
          <FormSelect
            value={format}
            onChange={(e) => handleFormatChange(e.target.value)}
          >
            {VIDEO_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.aspectRatio})
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Duração máx. (s)">
          <FormInput
            type="number"
            min={10}
            max={180}
            value={maxDuration}
            onChange={(e) => setMaxDuration(Number(e.target.value) || 30)}
          />
        </FormField>
      </div>

      <FormField label="Contexto / brief">
        <FormTextarea
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          placeholder="Hook, ângulo, tom..."
          rows={3}
        />
      </FormField>

      {error ? (
        <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] p-[12px]">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-[8px] pt-[4px]">
        <Button secondary onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleGenerate} loading={loading} disabled={!canGenerate}>
          Gerar roteiro
        </Button>
      </div>
    </div>
  );
}

function VideoScriptsPageInner() {
  const { data: selectedBrand } = useSelectedBrand();
  const brandId = selectedBrand?.id as string | undefined;
  const { openCreateDrawer } = useCreateDrawer();
  const prefill = useAmpliarPrefill();
  const opened = useRef(false);
  const [scripts, setScripts] = useState<VideoScript[]>([]);
  const [teleprompter, setTeleprompter] = useState<VideoScript | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openGenerate = () => {
    openCreateDrawer({
      title: 'Gerar roteiro de vídeo',
      size: 560,
      children: (close) => (
        <GenerateVideoScriptForm
          brandId={brandId || prefill.brandId}
          onClose={close}
          initialProjectId={prefill.projectId}
          initialIdeaId={prefill.ideaId}
          initialContext={buildContextFromPrefill(prefill)}
          initialFormat={prefill.format}
          initialDuration={prefill.duration}
          onGenerated={(script) => {
            setScripts((prev) => [script, ...prev]);
            setExpandedId(script._id || null);
          }}
        />
      ),
    });
  };

  useEffect(() => {
    if (!prefill.hasSource || opened.current) return;
    if (!brandId && !prefill.brandId) return;
    opened.current = true;
    openGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill.hasSource, brandId]);

  const copyCaption = async (script: VideoScript) => {
    const text = [script.caption, (script.hashtags || []).join(' ')]
      .filter(Boolean)
      .join('\n\n');
    if (text) await navigator.clipboard.writeText(text);
  };

  return (
    <PageShell>
      <PageHeader
        description="Roteiros de Reels/TikTok a partir de ideia ou carrossel — com teleprompter."
        actions={<Button onClick={openGenerate}>Gerar roteiro</Button>}
      />
      <PageBody className={scripts.length === 0 ? '!p-0' : undefined}>
        <div className="px-[20px] pt-[12px]">
          <AmpliarSourceBanner prefill={prefill} />
        </div>
        {scripts.length === 0 ? (
          <EmptyState
            icon={<Clapperboard className="w-6 h-6" />}
            title="Nenhum roteiro ainda"
            description="Aprove uma ideia no Swipe ou abra um carrossel e amplie em roteiro de Reels."
            actionLabel="Gerar roteiro"
            onAction={openGenerate}
          />
        ) : (
          <div className="flex flex-col gap-4 p-5">
            {scripts.map((script) => {
              const id = script._id || script.title;
              const open = expandedId === id;
              return (
                <SectionCard key={id} className="!p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-newTextColor">
                        {script.title}
                      </h3>
                      <p className="text-xs text-textItemBlur mt-1">
                        {script.scenes?.length || 0} cenas · ~
                        {script.totalDuration || 0}s · {script._format || 'REELS'}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Button
                        secondary
                        className="!h-8 !text-xs"
                        onClick={() => setTeleprompter(script)}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Teleprompter
                      </Button>
                      <Button
                        secondary
                        className="!h-8 !text-xs"
                        onClick={() => copyCaption(script)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Caption
                      </Button>
                      <Button
                        secondary
                        className="!h-8 !text-xs"
                        onClick={() => setExpandedId(open ? null : id)}
                      >
                        {open ? 'Recolher' : 'Cenas'}
                      </Button>
                    </div>
                  </div>
                  {open ? (
                    <ol className="mt-4 space-y-2">
                      {(script.scenes || []).map((scene, i) => (
                        <li
                          key={i}
                          className="rounded-[10px] border border-newTableBorder bg-newBgColorInner p-3 text-sm"
                        >
                          <div className="text-[11px] font-semibold text-textItemBlur uppercase">
                            Cena {scene.sceneNumber || i + 1} · {scene.duration || 0}s
                          </div>
                          <div className="text-newTextColor mt-1 font-medium">
                            {scene.voiceover ||
                              scene.textOverlay ||
                              scene.headline ||
                              scene.body}
                          </div>
                          {scene.visualNotes ? (
                            <div className="text-xs text-textItemBlur mt-1">
                              Visual: {scene.visualNotes}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  {script.caption ? (
                    <p className="text-xs text-textItemBlur mt-3 line-clamp-2">
                      {script.caption}
                    </p>
                  ) : null}
                </SectionCard>
              );
            })}
          </div>
        )}
      </PageBody>
      {teleprompter ? (
        <Teleprompter
          script={teleprompter}
          onClose={() => setTeleprompter(null)}
        />
      ) : null}
    </PageShell>
  );
}

export function VideoScriptsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-textItemBlur">Carregando roteiros…</div>
      }
    >
      <VideoScriptsPageInner />
    </Suspense>
  );
}
