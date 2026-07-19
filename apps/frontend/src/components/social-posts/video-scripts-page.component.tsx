'use client';

import React, { useMemo, useState } from 'react';
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

interface VideoScene {
  sceneNumber: number;
  duration: number;
  headline: string;
  body: string;
  visualNotes: string;
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
  /** local only */
  _id?: string;
  _createdAt?: string;
  _format?: string;
}

const VIDEO_FORMATS = [
  { id: 'reels', name: 'Instagram Reels', maxDuration: 90, aspectRatio: '9:16' },
  { id: 'tiktok', name: 'TikTok', maxDuration: 180, aspectRatio: '9:16' },
  { id: 'shorts', name: 'YouTube Shorts', maxDuration: 60, aspectRatio: '9:16' },
  { id: 'stories', name: 'Instagram Stories', maxDuration: 15, aspectRatio: '9:16' },
];

function GenerateVideoScriptForm({
  brandId,
  onGenerated,
  onClose,
}: {
  brandId?: string;
  onGenerated: (script: VideoScript) => void;
  onClose: () => void;
}) {
  const fetch = useFetch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carouselProjectId, setCarouselProjectId] = useState('');
  const [format, setFormat] = useState('reels');
  const [maxDuration, setMaxDuration] = useState(90);
  const [additionalContext, setAdditionalContext] = useState('');

  const selectedFormat = VIDEO_FORMATS.find((f) => f.id === format);

  const handleFormatChange = (newFormat: string) => {
    setFormat(newFormat);
    const fmt = VIDEO_FORMATS.find((f) => f.id === newFormat);
    if (fmt) setMaxDuration(fmt.maxDuration);
  };

  const handleGenerate = async () => {
    if (!brandId || !carouselProjectId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/video-scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandProfileId: brandId,
          carouselProjectId: carouselProjectId.trim(),
          format,
          maxDuration,
          additionalContext: additionalContext || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao gerar o script');
      }
      onGenerated({
        ...data,
        _id: `${Date.now()}`,
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

      <FormField label="ID do projeto de carousel" required>
        <FormInput
          value={carouselProjectId}
          onChange={(e) => setCarouselProjectId(e.target.value)}
          placeholder="Cole o ID do carousel"
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
        <FormField
          label="Duração máx. (s)"
          hint={selectedFormat ? `Máx. ${selectedFormat.maxDuration}s` : undefined}
        >
          <FormInput
            type="number"
            value={maxDuration}
            min={5}
            max={selectedFormat?.maxDuration || 180}
            onChange={(e) => setMaxDuration(Number(e.target.value))}
          />
        </FormField>
      </div>

      <FormField label="Contexto adicional" hint="Opcional">
        <FormTextarea
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          placeholder="Ex.: foque nos benefícios do produto, tom energético..."
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
        <Button
          onClick={handleGenerate}
          loading={loading}
          disabled={!brandId || !carouselProjectId.trim()}
        >
          Gerar script
        </Button>
      </div>
    </div>
  );
}

export function VideoScriptsPage() {
  const { data: selectedBrand } = useSelectedBrand();
  const brandId = selectedBrand?.id as string | undefined;
  const { openCreateDrawer } = useCreateDrawer();
  const [scripts, setScripts] = useState<VideoScript[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openGenerate = () => {
    openCreateDrawer({
      title: 'Gerar video script',
      size: 560,
      children: (close) => (
        <GenerateVideoScriptForm
          brandId={brandId}
          onClose={close}
          onGenerated={(script) => {
            setScripts((prev) => [script, ...prev]);
            setExpandedId(script._id || null);
          }}
        />
      ),
    });
  };

  const expanded = useMemo(
    () => scripts.find((s) => s._id === expandedId) || null,
    [scripts, expandedId]
  );

  const handleExport = (script: VideoScript) => {
    const blob = new Blob([JSON.stringify(script, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(script.title || 'video-script').replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyNarration = (script: VideoScript) => {
    if (!script.narration) return;
    navigator.clipboard.writeText(script.narration);
  };

  return (
    <PageShell>
      <PageHeader
        description="Transforme carousels em roteiros curtos para Reels, TikTok e Shorts."
        actions={
          <Button onClick={openGenerate}>Gerar script</Button>
        }
      />
      <PageBody className={!scripts.length ? '!p-0' : undefined}>
        {!scripts.length ? (
          <EmptyState
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 10L19.553 7.724C19.7054 7.64784 19.8748 7.61188 20.045 7.61967C20.2152 7.62746 20.3804 7.67873 20.524 7.76822C20.6676 7.85771 20.7847 7.98234 20.8634 8.1295C20.9421 8.27666 20.9797 8.44126 20.972 8.606V15.394C20.9797 15.5587 20.9421 15.7233 20.8634 15.8705C20.7847 16.0177 20.6676 16.1423 20.524 16.2318C20.3804 16.3213 20.2152 16.3725 20.045 16.3803C19.8748 16.3881 19.7054 16.3522 19.553 16.276L15 14M5 18H13C14.1046 18 15 17.1046 15 16V8C15 6.89543 14.1046 6 13 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            title="Nenhum video script ainda"
            description="Gere o primeiro roteiro a partir de um carousel da sua marca selecionada."
            actionLabel="Gerar script"
            onAction={openGenerate}
          />
        ) : (
          <div className="flex flex-col gap-[12px]">
            {scripts.map((script) => {
              const isOpen = script._id === expandedId;
              const formatLabel =
                VIDEO_FORMATS.find((f) => f.id === script._format)?.name ||
                script._format ||
                'Video';
              return (
                <SectionCard key={script._id} className="!p-0 overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isOpen ? null : script._id || null)
                    }
                    className="w-full flex items-center gap-[12px] px-[16px] py-[14px] text-left hover:bg-boxHover transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-[600] text-newTextColor truncate">
                        {script.title || 'Video script'}
                      </div>
                      <div className="text-[12px] text-textItemBlur mt-[2px]">
                        {formatLabel}
                        {script.totalDuration
                          ? ` · ${script.totalDuration}s`
                          : ''}
                        {script.scenes?.length
                          ? ` · ${script.scenes.length} cenas`
                          : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-[8px] shrink-0">
                      <Button
                        secondary
                        className="!h-[32px] !text-[12px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(script);
                        }}
                      >
                        Exportar
                      </Button>
                      <span className="text-textItemBlur text-[12px]">
                        {isOpen ? '−' : '+'}
                      </span>
                    </div>
                  </button>

                  {isOpen && expanded ? (
                    <div className="border-t border-newTableBorder px-[16px] py-[16px] flex flex-col gap-[16px]">
                      {expanded.scenes?.length ? (
                        <div className="flex flex-col gap-[10px]">
                          <div className="text-[12px] font-[600] text-textItemBlur uppercase tracking-wide">
                            Cenas
                          </div>
                          {expanded.scenes.map((scene) => (
                            <div
                              key={scene.sceneNumber}
                              className="rounded-[10px] border border-newTableBorder bg-newBgColorInner p-[12px] flex flex-col gap-[6px]"
                            >
                              <div className="flex items-center justify-between gap-[8px]">
                                <span className="text-[13px] font-[600] text-newTextColor">
                                  Cena {scene.sceneNumber}
                                  {scene.headline ? ` · ${scene.headline}` : ''}
                                </span>
                                <span className="text-[11px] text-textItemBlur">
                                  {scene.duration}s
                                </span>
                              </div>
                              {scene.body ? (
                                <p className="text-[13px] text-newTextColor/90">
                                  {scene.body}
                                </p>
                              ) : null}
                              {scene.visualNotes ? (
                                <p className="text-[12px] text-textItemBlur">
                                  Visual: {scene.visualNotes}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {expanded.narration ? (
                        <div className="flex flex-col gap-[8px]">
                          <div className="flex items-center justify-between">
                            <div className="text-[12px] font-[600] text-textItemBlur uppercase tracking-wide">
                              Narração
                            </div>
                            <Button
                              secondary
                              className="!h-[28px] !text-[11px]"
                              onClick={() => handleCopyNarration(expanded)}
                            >
                              Copiar
                            </Button>
                          </div>
                          <p className="text-[13px] whitespace-pre-wrap text-newTextColor/90 rounded-[10px] border border-newTableBorder bg-newBgColorInner p-[12px]">
                            {expanded.narration}
                          </p>
                        </div>
                      ) : null}

                      {(expanded.caption || expanded.hashtags?.length) && (
                        <div className="flex flex-col gap-[8px]">
                          <div className="text-[12px] font-[600] text-textItemBlur uppercase tracking-wide">
                            Caption e hashtags
                          </div>
                          {expanded.caption ? (
                            <p className="text-[13px] text-newTextColor/90">
                              {expanded.caption}
                            </p>
                          ) : null}
                          {expanded.hashtags?.length ? (
                            <div className="flex flex-wrap gap-[6px]">
                              {expanded.hashtags.map((tag, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] px-[8px] py-[3px] rounded-[6px] bg-newSettings border border-newTableBorder text-textItemBlur"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : null}
                </SectionCard>
              );
            })}
          </div>
        )}
      </PageBody>
    </PageShell>
  );
}
