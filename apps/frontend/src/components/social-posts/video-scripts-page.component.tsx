'use client';

import React, { Suspense, useState } from 'react';
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
import { AmpliarAiPaths } from '@gitroom/frontend/components/ampliar/ampliar-ai-paths.component';
import {
  buildVideoAiPaths,
  type AmpliarAiPath,
} from '@gitroom/frontend/components/ampliar/ampliar-ai-presets';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Clapperboard, Copy, Play, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useVideoScripts } from './video-scripts.hooks';
import { videoScriptsApi } from './video-scripts.api';
import {
  VIDEO_FORMAT_OPTIONS,
  VIDEO_STATUS_LABELS,
  VIDEO_STATUS_COLORS,
  type VideoProject,
  type VideoScene,
} from './video-scripts.types';
import { VideoTeleprompter } from './video-teleprompter.component';
import { VideoScriptEditor } from './video-script-editor.component';
import { VideoSceneTimeline } from './video-scene-timeline.component';

/* ------------------------------------------------------------------ */
/*  Generate Script Form (drawer)                                     */
/* ------------------------------------------------------------------ */

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
  onGenerated: () => void;
  onClose: () => void;
  initialProjectId?: string;
  initialIdeaId?: string;
  initialContext?: string;
  initialFormat?: string;
  initialDuration?: string;
}) {
  const fetch = useFetch();
  const toaster = useToaster();
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
    const fmt = VIDEO_FORMAT_OPTIONS.find((f) => f.id === newFormat);
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
      await videoScriptsApi.generateScript(fetch, {
        brandProfileId: brandId,
        carouselProjectId: carouselProjectId.trim() || undefined,
        contentIdeaId: contentIdeaId.trim() || undefined,
        format,
        maxDuration,
        name: additionalContext?.slice(0, 80) || 'Roteiro Ampliar',
        additionalContext: additionalContext || undefined,
      });
      onGenerated();
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
            {VIDEO_FORMAT_OPTIONS.map((f) => (
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

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

function VideoScriptsPageInner() {
  const fetch = useFetch();
  const { data: selectedBrand } = useSelectedBrand();
  const brandId = selectedBrand?.id as string | undefined;
  const { openCreateDrawer } = useCreateDrawer();
  const prefill = useAmpliarPrefill();
  const toaster = useToaster();

  const { projects, isLoading, mutate } = useVideoScripts(brandId || prefill.brandId);
  const [teleprompterProject, setTeleprompterProject] = useState<VideoProject | null>(null);
  const [editingProject, setEditingProject] = useState<VideoProject | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* -- Generation handlers ----------------------------------------- */

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
          onGenerated={() => mutate()}
        />
      ),
    });
  };

  const runAiPath = async (path: AmpliarAiPath) => {
    const bid = brandId || prefill.brandId;
    if (!bid) {
      toaster.show('Selecione uma marca antes de gerar', 'warning');
      return;
    }
    const p = path.payload;
    const ideaId = String(p.contentIdeaId || prefill.ideaId || '');
    const projectId = String(p.carouselProjectId || prefill.projectId || '');
    const context =
      String(p.additionalContext || buildContextFromPrefill(prefill) || '');
    if (!ideaId && !projectId && !context) {
      toaster.show(
        'Amplie a partir do Swipe ou de um carrossel — ou use o formulário avançado',
        'warning'
      );
      return;
    }
    setAiLoadingId(path.id);
    try {
      const format = String(p.format || 'REELS');
      const maxDuration = Number(p.maxDuration) || 30;
      await videoScriptsApi.generateScript(fetch, {
        brandProfileId: bid,
        carouselProjectId: projectId || undefined,
        contentIdeaId: ideaId || undefined,
        format,
        maxDuration,
        name: String(p.name || prefill.topic || 'Roteiro Ampliar').slice(0, 80),
        additionalContext: context || undefined,
      });
      await mutate();
      toaster.show('Roteiro gerado com IA', 'success');
    } catch (e: any) {
      toaster.show(e.message || 'Falha ao gerar com IA', 'warning');
    } finally {
      setAiLoadingId(null);
    }
  };

  /* -- Delete handler ---------------------------------------------- */

  const handleDelete = async (project: VideoProject) => {
    setDeletingId(project.id);
    try {
      await videoScriptsApi.deleteProject(fetch, project.id);
      await mutate();
      toaster.show('Roteiro excluído', 'success');
    } catch (e: any) {
      toaster.show(e.message || 'Erro ao excluir', 'warning');
    } finally {
      setDeletingId(null);
    }
  };

  /* -- Copy caption ------------------------------------------------ */

  const copyCaption = async (project: VideoProject) => {
    const script = project.script;
    if (!script) return;
    const text = [script.caption, (script.hashtags || []).join(' ')]
      .filter(Boolean)
      .join('\n\n');
    if (text) {
      await navigator.clipboard.writeText(text);
      toaster.show('Caption copiada', 'success');
    }
  };

  /* -- Helpers ----------------------------------------------------- */

  const getSceneText = (scene: VideoScene) =>
    scene.voiceoverText || scene.headline || scene.body || '';

  /* -- Render ------------------------------------------------------ */

  return (
    <PageShell>
      <PageHeader
        description="Roteiros de Reels/TikTok a partir de ideia ou carrossel — com teleprompter."
        actions={<Button onClick={openGenerate}>Formulário avançado</Button>}
      />
      <PageBody className={projects.length === 0 ? '!p-0' : undefined}>
        <div className="px-[20px] pt-[12px] max-w-[960px] w-full mx-auto">
          <AmpliarSourceBanner prefill={prefill} />
          <AmpliarAiPaths
            title="Caminhos de roteiro com IA"
            description="Escolha duração e formato. A IA monta cenas, fala e caption com o DNA e o hook da ideia."
            paths={buildVideoAiPaths(prefill)}
            loadingId={aiLoadingId}
            disabled={!brandId && !prefill.brandId}
            onSelect={runAiPath}
            onAdvanced={openGenerate}
            advancedLabel="Formulário avançado"
          />
        </div>

        {isLoading ? (
          <div className="text-[13px] text-textItemBlur py-[40px] text-center">
            Carregando roteiros…
          </div>
        ) : projects.length === 0 && !aiLoadingId ? (
          <EmptyState
            icon={<Clapperboard className="w-6 h-6" />}
            title="Escolha um formato acima"
            description="Reels 30s é o caminho recomendado. Venha do Swipe para a IA usar a ideia."
            actionLabel="Formulário avançado"
            onAction={openGenerate}
          />
        ) : projects.length === 0 && aiLoadingId ? (
          <div className="text-[13px] text-textItemBlur py-[40px] text-center">
            Gerando roteiro com IA…
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-5">
            {projects.map((project) => {
              const script = project.script;
              const scenes = script?.scenes || [];
              const open = expandedId === project.id;
              const statusColor = VIDEO_STATUS_COLORS[project.status] || VIDEO_STATUS_COLORS.DRAFT;
              const statusLabel = VIDEO_STATUS_LABELS[project.status] || project.status;

              return (
                <SectionCard key={project.id} className="!p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-newTextColor truncate">
                          {project.name}
                        </h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-xs text-textItemBlur mt-1">
                        {scenes.length} cenas · ~
                        {project.totalDurationSec || script?.totalDurationSec || 0}s · {project.format}
                        {project.createdAt
                          ? ` · ${new Date(project.createdAt).toLocaleDateString('pt-BR')}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end shrink-0">
                      <Button
                        secondary
                        className="!h-8 !text-xs"
                        onClick={() => setTeleprompterProject(project)}
                        disabled={!script}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Teleprompter
                      </Button>
                      <Button
                        secondary
                        className="!h-8 !text-xs"
                        onClick={() => setEditingProject(project)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </Button>
                      <Button
                        secondary
                        className="!h-8 !text-xs"
                        onClick={() => copyCaption(project)}
                        disabled={!script}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Caption
                      </Button>
                      <Button
                        secondary
                        className="!h-8 !text-xs"
                        onClick={() => setExpandedId(open ? null : project.id)}
                      >
                        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        Cenas
                      </Button>
                      <Button
                        secondary
                        className="!h-8 !text-xs !text-red-400 hover:!bg-red-500/10"
                        loading={deletingId === project.id}
                        onClick={() => handleDelete(project)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {open && script ? (
                    <div className="mt-4 space-y-3">
                      <VideoSceneTimeline scenes={scenes} />
                      <ol className="space-y-2">
                      {scenes.map((scene, i) => (
                        <li
                          key={scene.index ?? i}
                          className="rounded-[10px] border border-newTableBorder bg-newBgColorInner p-3 text-sm"
                        >
                          <div className="text-[11px] font-semibold text-textItemBlur uppercase">
                            Cena {(scene.index ?? i) + 1} · {scene.durationSec || 0}s
                          </div>
                          <div className="text-newTextColor mt-1 font-medium">
                            {getSceneText(scene)}
                          </div>
                          {scene.motionNotes ? (
                            <div className="text-xs text-textItemBlur mt-1">
                              Visual: {scene.motionNotes}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                    </div>
                  ) : null}

                  {script?.caption ? (
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

      {teleprompterProject ? (
        <VideoTeleprompter
          project={teleprompterProject}
          onClose={() => setTeleprompterProject(null)}
        />
      ) : null}

      {editingProject ? (
        <VideoScriptEditor
          project={editingProject}
          onSaved={() => {
            mutate();
            setEditingProject(null);
          }}
          onClose={() => setEditingProject(null)}
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
