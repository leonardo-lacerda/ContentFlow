'use client';

import { useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

export function CreativeVariantMatrix({ projectId, actors, voices }: { projectId?: string; actors: any[]; voices: any[] }) {
  const fetch = useFetch();
  const [actorIds, setActorIds] = useState<string[]>([]);
  const [voiceIds, setVoiceIds] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['pt-BR']);
  const [aspectRatios, setAspectRatios] = useState<string[]>(['9:16']);
  const [prompt, setPrompt] = useState('Create a direct performance marketing variation');
  const [maxItems, setMaxItems] = useState(20);
  const [message, setMessage] = useState('');

  const readJson = async (path: string, options?: RequestInit) => {
    const response = await fetch(path, options);
    const body = await response.json();
    if (!response.ok) throw new Error(body?.message || 'Matrix request failed');
    return body;
  };

  const toggle = (current: string[], value: string, setter: (next: string[]) => void) => setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const payload = { capability: 'talking-actor', actorIds, voiceIds, languages, aspectRatios, prompts: [prompt], maxItems };

  const quote = async () => {
    if (!projectId) return setMessage('Selecione um projeto.');
    try {
      const result = await readJson(`/creative/projects/${projectId}/variant-matrix/quote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setMessage(`${result.count} variações · ${result.estimatedCredits} créditos · ${result.canGenerate ? 'disponível' : 'saldo insuficiente'}`);
    } catch (error: any) { setMessage(error.message); }
  };

  const generate = async () => {
    if (!projectId) return setMessage('Selecione um projeto.');
    try {
      const result = await readJson(`/creative/projects/${projectId}/variant-matrix/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, idempotencyKey: `ui-matrix:${Date.now()}` }) });
      setMessage(`${result.jobs?.length || 0} jobs iniciados${result.errors?.length ? ` · ${result.errors.length} falhas` : ''}.`);
    } catch (error: any) { setMessage(error.message); }
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Matriz de variações</h2><p className="mt-1 text-sm text-black/55">Combine recursos, idiomas e formatos com quote antes do fan-out.</p></div>
        <div className="flex gap-2"><button type="button" onClick={quote} className="rounded-xl border border-blue-600 px-3 py-2 text-sm text-blue-600">Cotizar</button><button type="button" onClick={generate} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Gerar matriz</button></div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <div><div className="mb-2 text-xs font-semibold uppercase text-black/45">Atores aprovados</div>{actors.length ? actors.map((actor) => <label key={actor.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={actorIds.includes(actor.id)} onChange={() => toggle(actorIds, actor.id, setActorIds)} />{actor.name}</label>) : <div className="text-xs text-black/45">Nenhum ator aprovado</div>}</div>
        <div><div className="mb-2 text-xs font-semibold uppercase text-black/45">Vozes aprovadas</div>{voices.length ? voices.map((voice) => <label key={voice.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={voiceIds.includes(voice.id)} onChange={() => toggle(voiceIds, voice.id, setVoiceIds)} />{voice.name}</label>) : <div className="text-xs text-black/45">Nenhuma voz aprovada</div>}</div>
        <div><div className="mb-2 text-xs font-semibold uppercase text-black/45">Idiomas e formatos</div>{['pt-BR', 'en-US', 'es-ES'].map((language) => <label key={language} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={languages.includes(language)} onChange={() => toggle(languages, language, setLanguages)} />{language}</label>)}{['9:16', '1:1', '16:9', '4:5'].map((ratio) => <label key={ratio} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={aspectRatios.includes(ratio)} onChange={() => toggle(aspectRatios, ratio, setAspectRatios)} />{ratio}</label>)}</div>
        <div><label className="text-xs font-semibold uppercase text-black/45">Máximo de itens<input className="mt-2 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm" type="number" min={1} max={100} value={maxItems} onChange={(event) => setMaxItems(Number(event.target.value))} /></label><textarea className="mt-3 min-h-24 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm" value={prompt} onChange={(event) => setPrompt(event.target.value)} /></div>
      </div>
      {message && <div className="mt-3 rounded-xl bg-yellow-50 px-3 py-2 text-xs">{message}</div>}
    </section>
  );
}
