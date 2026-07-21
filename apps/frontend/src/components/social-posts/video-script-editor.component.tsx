'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import {
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
} from '@gitroom/frontend/components/new-layout/page-system';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { X, GripVertical, Plus, Trash2, RotateCw } from 'lucide-react';
import { ReactSortable } from 'react-sortablejs';
import { videoScriptsApi } from './video-scripts.api';
import type {
  VideoProject,
  VideoScene,
  VideoScriptData,
  VideoTextOverlay,
} from './video-scripts.types';

const TRANSITIONS = [
  { id: 'cut', name: 'Corte seco' },
  { id: 'crossfade', name: 'Crossfade' },
  { id: 'slide-left', name: 'Slide esquerda' },
  { id: 'slide-right', name: 'Slide direita' },
  { id: 'zoom-in', name: 'Zoom in' },
  { id: 'zoom-out', name: 'Zoom out' },
];

function makeEmptyScene(index: number): VideoScene {
  return {
    index,
    durationSec: 5,
    headline: '',
    body: '',
    voiceoverText: '',
    imagePrompt: '',
    transition: 'crossfade',
    textOverlays: [],
    motionNotes: '',
    musicCue: '',
  };
}

interface SortableSceneItem extends VideoScene {
  id: string;
}

export function VideoScriptEditor({
  project,
  onSaved,
  onClose,
}: {
  project: VideoProject;
  onSaved: () => void;
  onClose: () => void;
}) {
  const fetch = useFetch();
  const toaster = useToaster();
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const script = project.script;

  const [name, setName] = useState(project.name);
  const [scenes, setScenes] = useState<SortableSceneItem[]>(() =>
    (script?.scenes || []).map((s, i) => ({
      ...s,
      id: `scene-${s.index ?? i}-${Date.now()}`,
    }))
  );
  const [caption, setCaption] = useState(script?.caption || '');
  const [hashtags, setHashtags] = useState((script?.hashtags || []).join(', '));
  const [cta, setCta] = useState(script?.cta || '');
  const [musicStyle, setMusicStyle] = useState(script?.musicStyle || '');
  const [scriptNotes, setScriptNotes] = useState(script?.scriptNotes || '');

  /* -- Save -------------------------------------------------------- */

  const handleSave = async () => {
    setSaving(true);
    try {
      const reorderedScenes = scenes.map((s, i) => ({
        ...s,
        index: i,
        id: undefined,
      }));
      const updatedScript: VideoScriptData = {
        title: name,
        platform: script?.platform || project.format,
        format: script?.format || project.format,
        aspectRatio: script?.aspectRatio || project.aspectRatio,
        language: script?.language || 'pt-BR',
        totalDurationSec: reorderedScenes.reduce((acc, s) => acc + (s.durationSec || 0), 0),
        scenes: reorderedScenes as VideoScene[],
        scriptNotes: scriptNotes || null,
        musicStyle: musicStyle || null,
        cta: cta || null,
        hashtags: hashtags
          .split(',')
          .map((h) => h.trim())
          .filter(Boolean),
        caption: caption || null,
        narration: script?.narration || null,
      };
      await videoScriptsApi.updateProject(fetch, project.id, {
        name,
        script: updatedScript,
        totalDurationSec: updatedScript.totalDurationSec,
      });
      toaster.show('Roteiro salvo', 'success');
      onSaved();
    } catch (e: any) {
      toaster.show(e.message || 'Erro ao salvar', 'warning');
    } finally {
      setSaving(false);
    }
  };

  /* -- Regenerate -------------------------------------------------- */

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await videoScriptsApi.regenerateScript(fetch, project.id, {
        targetDurationSec: project.maxDurationSec,
      });
      toaster.show('Roteiro regenerado', 'success');
      onSaved();
    } catch (e: any) {
      toaster.show(e.message || 'Erro ao regenerar', 'warning');
    } finally {
      setRegenerating(false);
    }
  };

  /* -- Scene helpers ----------------------------------------------- */

  const updateScene = useCallback(
    (id: string, field: keyof VideoScene, value: any) => {
      setScenes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  const addScene = () => {
    setScenes((prev) => [
      ...prev,
      { ...makeEmptyScene(prev.length), id: `scene-new-${Date.now()}` },
    ]);
  };

  const removeScene = (id: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== id));
  };

  /* -- Render ------------------------------------------------------ */

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
        <h2 className="text-lg font-bold">Editar roteiro</h2>
        <div className="flex items-center gap-2">
          <Button
            secondary
            className="!h-8 !text-xs"
            loading={regenerating}
            onClick={handleRegenerate}
          >
            <RotateCw className="w-3.5 h-3.5" />
            Regenerar com IA
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-[800px] w-full mx-auto space-y-6">
        {/* Project name */}
        <FormField label="Nome do roteiro">
          <FormInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do roteiro"
          />
        </FormField>

        {/* Scenes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/80">
              Cenas ({scenes.length})
            </h3>
            <Button secondary className="!h-7 !text-xs" onClick={addScene}>
              <Plus className="w-3 h-3" /> Adicionar cena
            </Button>
          </div>

          <ReactSortable
            list={scenes}
            setList={setScenes}
            handle=".drag-handle"
            animation={200}
            ghostClass="opacity-40"
            className="space-y-3"
          >
            {scenes.map((scene, i) => (
              <div
                key={scene.id}
                className="rounded-[10px] border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <GripVertical className="drag-handle w-4 h-4 text-white/30 cursor-move" />
                  <span className="text-xs font-semibold text-white/60 uppercase">
                    Cena {i + 1}
                  </span>
                  <span className="text-[10px] text-white/30">
                    {scene.durationSec}s
                  </span>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => removeScene(scene.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <FormField label="Headline">
                    <FormInput
                      value={scene.headline}
                      onChange={(e) =>
                        updateScene(scene.id, 'headline', e.target.value)
                      }
                      placeholder="Texto principal da cena"
                    />
                  </FormField>

                  <FormField label="Locução / Voiceover">
                    <FormTextarea
                      value={scene.voiceoverText || ''}
                      onChange={(e) =>
                        updateScene(scene.id, 'voiceoverText', e.target.value)
                      }
                      placeholder="Texto que será narrado"
                      rows={2}
                    />
                  </FormField>

                  <div className="grid grid-cols-3 gap-2">
                    <FormField label="Duração (s)">
                      <FormInput
                        type="number"
                        min={1}
                        max={60}
                        value={scene.durationSec}
                        onChange={(e) =>
                          updateScene(
                            scene.id,
                            'durationSec',
                            Number(e.target.value) || 5
                          )
                        }
                      />
                    </FormField>
                    <FormField label="Transição">
                      <FormSelect
                        value={scene.transition}
                        onChange={(e) =>
                          updateScene(scene.id, 'transition', e.target.value)
                        }
                      >
                        {TRANSITIONS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>
                    <FormField label="Notas visuais">
                      <FormInput
                        value={scene.motionNotes || ''}
                        onChange={(e) =>
                          updateScene(scene.id, 'motionNotes', e.target.value)
                        }
                        placeholder="Ex: zoom lento"
                      />
                    </FormField>
                  </div>
                </div>
              </div>
            ))}
          </ReactSortable>
        </div>

        {/* Metadata */}
        <div className="border-t border-white/10 pt-6 space-y-4">
          <h3 className="text-sm font-semibold text-white/80">Metadados</h3>

          <FormField label="Caption">
            <FormTextarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Legenda do vídeo"
              rows={3}
            />
          </FormField>

          <FormField label="Hashtags" hint="Separadas por vírgula">
            <FormInput
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#marketing, #dicas, #conteudo"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="CTA">
              <FormInput
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Chamada para ação"
              />
            </FormField>
            <FormField label="Estilo musical">
              <FormInput
                value={musicStyle}
                onChange={(e) => setMusicStyle(e.target.value)}
                placeholder="Ex: upbeat, lo-fi"
              />
            </FormField>
          </div>

          <FormField label="Notas do roteiro">
            <FormTextarea
              value={scriptNotes}
              onChange={(e) => setScriptNotes(e.target.value)}
              placeholder="Direções gerais para o vídeo"
              rows={2}
            />
          </FormField>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10 shrink-0">
        <Button secondary onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
