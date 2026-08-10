'use client';

import { useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

type Scene = {
  videoUrl: string;
  audioUrl?: string;
  captionsUrl?: string;
  overlayText?: string;
  durationSec?: number;
};

const field = 'w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs outline-none focus:border-black';

export function CreativeSceneComposer({ projectId }: { projectId?: string }) {
  const fetch = useFetch();
  const [scenes, setScenes] = useState<Scene[]>([{ videoUrl: '', durationSec: 5 }]);
  const [maxDurationSec, setMaxDurationSec] = useState(60);
  const [message, setMessage] = useState('');
  const [outputUrl, setOutputUrl] = useState('');
  const [running, setRunning] = useState(false);

  const update = (index: number, patch: Partial<Scene>) => setScenes((current) => current.map((scene, itemIndex) => itemIndex === index ? { ...scene, ...patch } : scene));

  const run = async () => {
    if (!projectId) return setMessage('Selecione um projeto antes de compor as cenas.');
    if (scenes.some((scene) => !scene.videoUrl.trim())) return setMessage('Cada cena precisa de um videoUrl.');
    setRunning(true);
    setMessage('Compondo cenas com FFmpeg...');
    try {
      const response = await fetch(`/creative/projects/${projectId}/tools/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'scene-render', scenes, maxDurationSec, idempotencyKey: `ui-scene-render:${Date.now()}` }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.message || 'Não foi possível compor as cenas');
      setOutputUrl(String(body?.output?.url || ''));
      setMessage(`Scene graph concluído com ${scenes.length} cena(s).`);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Compositor por cenas</h2>
          <p className="mt-1 text-sm text-black/55">Encadeie vídeos, áudio, captions e CTA em um render versionado.</p>
        </div>
        <div className="flex gap-2">
          <label className="text-xs text-black/55">Limite (s)<input className={`${field} mt-1 w-24`} type="number" min={1} max={180} value={maxDurationSec} onChange={(event) => setMaxDurationSec(Number(event.target.value))} /></label>
          <button type="button" onClick={() => setScenes((current) => [...current, { videoUrl: '', durationSec: 5 }])} className="rounded-xl border border-black/15 px-3 py-2 text-sm">+ Cena</button>
          <button type="button" disabled={running || !projectId} onClick={run} className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Renderizar</button>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {scenes.map((scene, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-black/10 bg-black/[0.03] p-3 md:grid-cols-[1.2fr_1.2fr_1.2fr_0.5fr_0.8fr_auto]">
            <input className={field} placeholder="Video URL / upload" value={scene.videoUrl} onChange={(event) => update(index, { videoUrl: event.target.value })} />
            <input className={field} placeholder="Audio URL (opcional)" value={scene.audioUrl || ''} onChange={(event) => update(index, { audioUrl: event.target.value || undefined })} />
            <input className={field} placeholder="Captions URL (SRT/VTT)" value={scene.captionsUrl || ''} onChange={(event) => update(index, { captionsUrl: event.target.value || undefined })} />
            <input className={field} placeholder="CTA/overlay" value={scene.overlayText || ''} onChange={(event) => update(index, { overlayText: event.target.value || undefined })} />
            <input className={field} type="number" min={0.1} max={180} step={0.1} value={scene.durationSec || ''} onChange={(event) => update(index, { durationSec: event.target.value ? Number(event.target.value) : undefined })} />
            <button type="button" disabled={scenes.length === 1} onClick={() => setScenes((current) => current.filter((_item, itemIndex) => itemIndex !== index))} className="rounded-lg border border-red-500 px-2 py-1 text-xs text-red-600 disabled:opacity-30">Remover</button>
          </div>
        ))}
      </div>
      {message && <div className="mt-3 rounded-xl bg-yellow-50 px-3 py-2 text-xs">{message}</div>}
      {outputUrl && <a className="mt-3 inline-block text-sm text-blue-600 underline" href={outputUrl} target="_blank" rel="noreferrer">Abrir render composto</a>}
    </section>
  );
}
