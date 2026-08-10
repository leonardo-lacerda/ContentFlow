'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { CreativeWorkflowBuilder } from './workflow-builder.component';
import { CreativeVariantMatrix } from './variant-matrix.component';
import { CreativeSceneComposer } from './scene-composer.component';

type Project = {
  id: string;
  name: string;
  objective?: string;
  status: string;
  aspectRatio: string;
  products?: any[];
  assets?: any[];
  variants?: any[];
  scripts?: any[];
};

type Job = {
  id: string;
  type: string;
  status: string;
  progress: number;
  error?: string;
  output?: { url?: string; provider?: string; model?: string };
};

const card = 'rounded-2xl border border-black/10 bg-white p-5 shadow-sm';
const input = 'w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black';

export function CreativeEnginePage() {
  const fetch = useFetch();
  const [projects, setProjects] = useState<Project[]>([]);
  const [actors, setActors] = useState<any[]>([]);
  const [voices, setVoices] = useState<any[]>([]);
  const [rights, setRights] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [capabilities, setCapabilities] = useState<any[]>([]);
  const [presets, setPresets] = useState<any[]>([]);
  const [credits, setCredits] = useState<{ balance: number; reserved: number }>({ balance: 0, reserved: 0 });
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedActorId, setSelectedActorId] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [actorName, setActorName] = useState('Novo ator');
  const [actorImageUrl, setActorImageUrl] = useState('');
  const [voiceName, setVoiceName] = useState('Nova voz');
  const [voiceLanguage, setVoiceLanguage] = useState('pt-BR');
  const [voicePreviewText, setVoicePreviewText] = useState('Olá, esta é uma prévia da minha voz para anúncios.');
  const [assetName, setAssetName] = useState('Produto');
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [imageAssetId, setImageAssetId] = useState('');
  const [imagePrompt, setImagePrompt] = useState('Hero shot vertical do produto, iluminação de estúdio e composição para anúncio de performance.');
  const [productName, setProductName] = useState('Meu produto');
  const [rightsResourceType, setRightsResourceType] = useState<'actor' | 'voice' | 'asset'>('actor');
  const [rightsResourceId, setRightsResourceId] = useState('');
  const [consentReference, setConsentReference] = useState('');
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
  const [publishVariantId, setPublishVariantId] = useState('');
  const [selectedReviewJobId, setSelectedReviewJobId] = useState('');
  const [publishType, setPublishType] = useState<'draft' | 'schedule' | 'now'>('draft');
  const [publishDate, setPublishDate] = useState(() => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));
  const [publishContent, setPublishContent] = useState('<p>Confira este criativo.</p>');
  const [localizeVariantId, setLocalizeVariantId] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en-US');
  const [scriptDraft, setScriptDraft] = useState<any[]>([]);
  const [projectName, setProjectName] = useState('Minha campanha UGC');
  const [objective, setObjective] = useState('Criar um anúncio vertical de performance para o meu produto');
  const [brief, setBrief] = useState('Apresente o produto, destaque o principal benefício e termine com um CTA claro.');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [exportUrl, setExportUrl] = useState('');

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );
  const latestScript = selectedProject?.scripts?.[0];

  useEffect(() => {
    if (!latestScript) {
      setScriptDraft([]);
      return;
    }
    const scenes = Array.isArray(latestScript.scenes) && latestScript.scenes.length
      ? latestScript.scenes
      : Array.isArray(latestScript.content?.scenes) ? latestScript.content.scenes : [];
    setScriptDraft(scenes.map((scene: any, index: number) => ({
      ...scene,
      index: scene.index ?? scene.sceneIndex ?? index,
      voiceoverText: scene.voiceoverText || scene.scriptText || scene.body || '',
      imagePrompt: scene.imagePrompt || scene.visualPrompt || '',
      durationSec: Number(scene.durationSec || 5),
    })));
  }, [latestScript?.id]);

  async function readJson(path: string, options?: RequestInit) {
    const response = await fetch(path, options);
    const body = await response.json();
    if (!response.ok) throw new Error(body?.message || body?.msg || 'Não foi possível concluir a operação');
    return body;
  }

  async function refresh() {
    const [projectData, actorData, voiceData, jobData, capabilityData, creditData, presetData, rightsData, integrationData, publicationData] = await Promise.all([
      readJson('/creative/projects'),
      readJson('/creative/actors?includeUnapproved=true'),
      readJson('/creative/voices?includeUnapproved=true'),
      readJson('/creative/jobs'),
      readJson('/creative/capabilities'),
      readJson('/creative/credits'),
      readJson('/creative/presets'),
      readJson('/creative/rights'),
      readJson('/integrations/list'),
      readJson(`/creative/publications${selectedProjectId ? `?projectId=${selectedProjectId}` : ''}`),
    ]);
    setProjects(projectData);
    setActors(actorData);
    setVoices(voiceData);
    setRights(rightsData);
    setIntegrations(Array.isArray(integrationData) ? integrationData : integrationData?.integrations || []);
    setPublications(publicationData);
    setJobs(jobData);
    setCapabilities(capabilityData);
    setPresets(presetData);
    setCredits(creditData);
    if (!selectedProjectId && projectData[0]) setSelectedProjectId(projectData[0].id);
  }

  useEffect(() => {
    refresh().catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    const active = jobs.some((job) => ['QUEUED', 'RESERVED', 'RUNNING'].includes(job.status));
    if (!active) return;
    const timer = window.setInterval(() => refresh().catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  }, [jobs]);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const project = await readJson('/creative/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, objective, aspectRatio: '9:16' }),
      });
      setSelectedProjectId(project.id);
      setMessage('Projeto criado. Agora gere o roteiro.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createScript(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId) return setMessage('Selecione um projeto primeiro.');
    setLoading(true);
    try {
      await readJson(`/creative/projects/${selectedProjectId}/scripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      });
      setMessage('Roteiro criado com cenas e direção visual.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function reviseScript(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId || !latestScript?.id || !scriptDraft.length) return setMessage('Gere um roteiro antes de editá-lo.');
    setLoading(true);
    try {
      const content = {
        ...(latestScript.content || {}),
        totalDurationSec: scriptDraft.reduce((total, scene) => total + Number(scene.durationSec || 0), 0),
        scenes: scriptDraft,
      };
      await readJson(`/creative/projects/${selectedProjectId}/scripts/${latestScript.id}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${latestScript.name || 'Script'} revision`, language: latestScript.language, content }),
      });
      setMessage('Nova versão do roteiro criada. A versão anterior foi preservada.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateVariant(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId) return setMessage('Selecione um projeto primeiro.');
    setLoading(true);
    try {
      const quote = await readJson(`/creative/projects/${selectedProjectId}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capability: 'talking-actor', actorId: selectedActorId || undefined, voiceId: selectedVoiceId || undefined, prompt: prompt || undefined }),
      });
      if (!quote.canGenerate) throw new Error(`Créditos insuficientes. Necessário: ${quote.quote.estimatedCredits}.`);
      await readJson(`/creative/projects/${selectedProjectId}/variants/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capability: 'talking-actor', actorId: selectedActorId || undefined, voiceId: selectedVoiceId || undefined, prompt: prompt || undefined }),
      });
      setMessage('Variação enviada para geração.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateImage(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId || !imagePrompt.trim()) return setMessage('Selecione um projeto e informe o prompt da imagem.');
    setLoading(true);
    try {
      const quote = await readJson(`/creative/projects/${selectedProjectId}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capability: 'image-generation', prompt: imagePrompt, aspectRatio: '9:16' }),
      });
      if (!quote.canGenerate) throw new Error(`Créditos insuficientes. Necessário: ${quote.quote.estimatedCredits}.`);
      await readJson(`/creative/projects/${selectedProjectId}/images/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, aspectRatio: '9:16', productAssetIds: imageAssetId ? [imageAssetId] : [] }),
      });
      setMessage('Imagem enviada para geração.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createActor(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await readJson('/creative/actors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: actorName, imageUrl: actorImageUrl || undefined, projectId: selectedProjectId || undefined }),
      });
      setMessage('Ator criado como pendente. Registre o consentimento para aprová-lo.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createVoice(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await readJson('/creative/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: voiceName, language: voiceLanguage }),
      });
      setMessage('Voz criada como pendente. Registre o consentimento para aprová-la.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function previewVoice(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId || !selectedVoiceId || !voicePreviewText.trim()) return setMessage('Selecione uma voz aprovada e informe o texto da prévia.');
    setLoading(true);
    try {
      await readJson(`/creative/projects/${selectedProjectId}/voices/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: selectedVoiceId, text: voicePreviewText.trim(), language: voices.find((voice) => voice.id === selectedVoiceId)?.language }),
      });
      setMessage('Prévia de voz gerada. O link foi salvo no catálogo e também aparece nos jobs.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadAsset(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId || !assetFile) return setMessage('Selecione um projeto e um arquivo de produto.');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', assetFile);
      const uploaded = await readJson('/media/upload-simple', { method: 'POST', body: formData });
      const asset = await readJson('/creative/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          mediaId: uploaded.id,
          type: assetFile.type.startsWith('video/') ? 'VIDEO' : 'PRODUCT',
          name: assetName || assetFile.name,
          url: uploaded.path,
          mimeType: assetFile.type,
          fileSize: assetFile.size,
        }),
      });
      setSelectedAssetId(asset.id);
      setMessage('Produto enviado como pendente. Registre os direitos antes de gerar.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createProduct(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId) return setMessage('Selecione um projeto primeiro.');
    setLoading(true);
    try {
      await readJson('/creative/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, name: productName, assetIds: selectedAssetId ? [selectedAssetId] : [] }),
      });
      setMessage('Produto associado ao projeto.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function grantRights(event: FormEvent) {
    event.preventDefault();
    if (!rightsResourceId || !consentReference.trim()) return setMessage('Selecione um recurso e informe a referência de consentimento.');
    setLoading(true);
    try {
      await readJson('/creative/rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceType: rightsResourceType, resourceId: rightsResourceId, status: 'APPROVED', consentReference: consentReference.trim() }),
      });
      setMessage('Consentimento registrado e recurso aprovado para geração.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function publishVariant(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId || !publishVariantId || !selectedIntegrationId) return setMessage('Selecione projeto, variação e canal conectado.');
    setLoading(true);
    try {
      await readJson(`/creative/projects/${selectedProjectId}/variants/${publishVariantId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: selectedIntegrationId,
          type: publishType,
          date: publishType === 'now' ? new Date().toISOString() : new Date(publishDate).toISOString(),
          content: publishContent,
        }),
      });
      setMessage('Criativo enviado para o fluxo de publicação.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function exportProject() {
    if (!selectedProjectId) return setMessage('Selecione um projeto primeiro.');
    setLoading(true);
    try {
      const result = await readJson(`/creative/projects/${selectedProjectId}/export`, { method: 'POST' });
      setExportUrl(String(result.url || ''));
      setMessage('Pacote exportado com manifest, provenance e mídias públicas disponíveis.');
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function evaluateJob(jobId: string) {
    setLoading(true);
    try {
      const result = await readJson(`/creative/jobs/${jobId}/evaluate`, { method: 'POST' });
      setMessage(`Preflight do job: ${result.score}/100.`);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function reviewJob(jobId: string, approved: boolean) {
    setLoading(true);
    try {
      await readJson(`/creative/jobs/${jobId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, score: approved ? 100 : 0 }),
      });
      setMessage(approved ? 'Output aprovado.' : 'Output rejeitado.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function cancelJob(jobId: string) {
    setLoading(true);
    try {
      await readJson(`/creative/jobs/${jobId}/cancel`, { method: 'POST' });
      setMessage('Job cancelado e créditos reservados foram devolvidos.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function localizeVariant(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId || !localizeVariantId || !targetLanguage) return setMessage('Selecione uma variação e o idioma de destino.');
    setLoading(true);
    try {
      await readJson(`/creative/projects/${selectedProjectId}/variants/${localizeVariantId}/localize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLanguage, idempotencyKey: `ui-localize:${localizeVariantId}:${targetLanguage}` }),
      });
      setMessage('Tradução e nova renderização iniciadas. O original foi preservado.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function runPreset(presetId: string) {
    if (!selectedProjectId) return setMessage('Selecione um projeto antes de executar um preset.');
    setLoading(true);
    try {
      await readJson(`/creative/projects/${selectedProjectId}/presets/${presetId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: selectedActorId || undefined, voiceId: selectedVoiceId || undefined, productAssetIds: selectedAssetId ? [selectedAssetId] : [], prompt: prompt || undefined, targetLanguage, variantId: localizeVariantId || undefined, idempotencyKey: `ui-preset:${presetId}:${Date.now()}` }),
      });
      setMessage(`Preset ${presetId} enviado para geração.`);
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50">Creative Engine</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Da ideia ao anúncio em vídeo</h1>
          <p className="mt-2 max-w-2xl text-sm text-black/60">Produto, roteiro, atores autorizados, geração, variações e workflows em um só lugar.</p>
        </div>
        <div className="rounded-2xl bg-black px-4 py-3 text-white">
          <div className="text-xs text-white/60">Créditos disponíveis</div>
          <div className="text-2xl font-semibold">{credits.balance}</div>
          <div className="text-xs text-white/60">{credits.reserved} reservados</div>
        </div>
      </header>

      {message && <div className="rounded-xl border border-black/10 bg-yellow-50 px-4 py-3 text-sm">{message}</div>}

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form className={card} onSubmit={createProject}>
          <h2 className="text-lg font-semibold">1. Criar projeto</h2>
          <p className="mt-1 text-sm text-black/55">Comece com o objetivo da campanha.</p>
          <div className="mt-4 space-y-3">
            <input className={input} value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Nome do projeto" />
            <textarea className={`${input} min-h-24`} value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Objetivo" />
            <button disabled={loading} className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Criar projeto</button>
          </div>
        </form>

        <div className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Projetos</h2>
              <p className="mt-1 text-sm text-black/55">Escolha o projeto que receberá roteiro e variações.</p>
            </div>
            <select className="rounded-xl border border-black/10 px-3 py-2 text-sm" value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
              <option value="">Selecione</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          {selectedProject ? (
            <>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-black/[0.04] p-3"><div className="text-xs text-black/50">Status</div><div className="mt-1 font-medium">{selectedProject.status}</div></div>
              <div className="rounded-xl bg-black/[0.04] p-3"><div className="text-xs text-black/50">Assets</div><div className="mt-1 font-medium">{selectedProject.assets?.length || 0}</div></div>
              <div className="rounded-xl bg-black/[0.04] p-3"><div className="text-xs text-black/50">Variações</div><div className="mt-1 font-medium">{selectedProject.variants?.length || 0}</div></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" disabled={loading} onClick={exportProject} className="rounded-xl border border-black/15 px-4 py-2 text-sm font-semibold disabled:opacity-50">Exportar pacote ZIP</button>
              {exportUrl && <a className="text-sm text-blue-600 underline" href={exportUrl} target="_blank" rel="noreferrer">Baixar último pacote</a>}
            </div>
            </>
          ) : <div className="mt-6 rounded-xl border border-dashed border-black/15 p-8 text-center text-sm text-black/50">Crie ou selecione um projeto.</div>}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form className={card} onSubmit={createScript}>
          <h2 className="text-lg font-semibold">2. Gerar roteiro</h2>
          <p className="mt-1 text-sm text-black/55">O roteiro será estruturado em cenas, hook, direção visual e CTA.</p>
          <textarea className={`${input} mt-4 min-h-40`} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Brief do anúncio" />
          <button disabled={loading || !selectedProjectId} className="mt-3 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Gerar roteiro</button>
        </form>

        <form className={card} onSubmit={generateVariant}>
          <h2 className="text-lg font-semibold">3. Gerar variação</h2>
          <p className="mt-1 text-sm text-black/55">Use atores/vozes aprovados e acompanhe o custo antes de renderizar.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select className={input} value={selectedActorId} onChange={(event) => setSelectedActorId(event.target.value)}>
              <option value="">Ator aprovado</option>
              {actors.filter((actor) => actor.rightsStatus === 'APPROVED').map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
            </select>
            <select className={input} value={selectedVoiceId} onChange={(event) => setSelectedVoiceId(event.target.value)}>
              <option value="">Voz aprovada</option>
              {voices.filter((voice) => voice.rightsStatus === 'APPROVED').map((voice) => <option key={voice.id} value={voice.id}>{voice.name} · {voice.language}</option>)}
            </select>
          </div>
          <textarea className={`${input} mt-3 min-h-24`} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Instruções adicionais (opcional)" />
          <button disabled={loading || !selectedProjectId} className="mt-3 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Cotizar e gerar vídeo</button>
          <div className="mt-4 text-xs text-black/50">Capabilities configuradas: {capabilities.map((item) => `${item.provider}/${item.capability}`).join(', ') || 'nenhuma — configure um provider'}</div>
        </form>
      </section>

      {latestScript && <section className={card}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Editor de cenas</h2>
            <p className="mt-1 text-sm text-black/55">Versão {latestScript.version} · edite texto, direção visual e duração; salvar cria uma nova versão com provenance.</p>
          </div>
          <button type="button" disabled={loading || !scriptDraft.length} onClick={reviseScript} className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Salvar nova versão</button>
        </div>
        <div className="mt-4 space-y-3">
          {scriptDraft.map((scene, index) => <div key={`${latestScript.id}-${index}`} className="grid gap-3 rounded-xl border border-black/10 p-4 md:grid-cols-[auto_1fr_1fr_100px]">
            <div className="pt-2 text-xs font-semibold uppercase text-black/45">Cena {index + 1}</div>
            <textarea className={`${input} min-h-20`} value={scene.voiceoverText || ''} onChange={(event) => setScriptDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, voiceoverText: event.target.value, scriptText: event.target.value } : item))} placeholder="Texto falado" />
            <textarea className={`${input} min-h-20`} value={scene.imagePrompt || ''} onChange={(event) => setScriptDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, imagePrompt: event.target.value, visualPrompt: event.target.value } : item))} placeholder="Direção visual" />
            <input className={input} type="number" min={1} max={180} value={scene.durationSec || 5} onChange={(event) => setScriptDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, durationSec: Number(event.target.value) } : item))} />
          </div>)}
        </div>
      </section>}

      <form className={card} onSubmit={generateImage}>
        <h2 className="text-lg font-semibold">Imagem de produto</h2>
        <p className="mt-1 text-sm text-black/55">Gere um product shot com quote de créditos e, opcionalmente, uma referência aprovada.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_280px_auto]">
          <textarea className={`${input} min-h-20`} value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} placeholder="Prompt visual" />
          <select className={input} value={imageAssetId} onChange={(event) => setImageAssetId(event.target.value)}>
            <option value="">Sem referência</option>
            {(selectedProject?.assets || []).filter((asset) => asset.status === 'READY' && asset.rightsStatus === 'APPROVED').map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
          </select>
          <button disabled={loading || !selectedProjectId} className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Gerar imagem</button>
        </div>
      </form>

      <section className={card}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Variações em outros idiomas</h2><p className="mt-1 text-sm text-black/55">Traduz o roteiro, cria uma nova versão e mantém o criativo original intacto.</p></div>
          <form className="flex flex-wrap gap-2" onSubmit={localizeVariant}>
            <select className="rounded-xl border border-black/10 px-3 py-2 text-sm" value={localizeVariantId} onChange={(event) => setLocalizeVariantId(event.target.value)}>
              <option value="">Variação pronta</option>
              {(selectedProject?.variants || []).filter((variant) => variant.status === 'READY').map((variant) => <option key={variant.id} value={variant.id}>{variant.id} · {variant.language}</option>)}
            </select>
            <select className="rounded-xl border border-black/10 px-3 py-2 text-sm" value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}><option value="en-US">en-US</option><option value="es-ES">es-ES</option><option value="pt-BR">pt-BR</option></select>
            <button disabled={loading || !selectedProjectId} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Localizar</button>
          </form>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form className={card} onSubmit={uploadAsset}>
          <h2 className="text-lg font-semibold">Produto e asset</h2>
          <p className="mt-1 text-sm text-black/55">Envie uma imagem ou vídeo original. O arquivo permanece pendente até a aprovação dos direitos.</p>
          <input className={`${input} mt-4`} value={assetName} onChange={(event) => setAssetName(event.target.value)} placeholder="Nome do asset" />
          <input className={`${input} mt-2`} type="file" accept="image/*,video/mp4" onChange={(event) => setAssetFile(event.target.files?.[0] || null)} />
          <button disabled={loading || !selectedProjectId} className="mt-3 rounded-xl border border-black/15 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Enviar asset</button>
        </form>
        <form className={card} onSubmit={createProduct}>
          <h2 className="text-lg font-semibold">Associar produto</h2>
          <p className="mt-1 text-sm text-black/55">Agrupe assets aprovados para usar como referência em gerações image-to-image e product showcase.</p>
          <input className={`${input} mt-4`} value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Nome do produto" />
          <select className={`${input} mt-2`} value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value)}>
            <option value="">Selecione um asset</option>
            {(selectedProject?.assets || []).map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.rightsStatus}</option>)}
          </select>
          <button disabled={loading || !selectedProjectId} className="mt-3 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Associar produto</button>
        </form>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Catálogo e consentimento</h2>
            <p className="mt-1 text-sm text-black/55">Cadastre atores e vozes e aprove-os somente com uma referência de consentimento.</p>
          </div>
          <div className="text-xs text-black/50">{actors.length} atores · {voices.length} vozes · {rights.length} registros de direitos</div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <form className="rounded-xl border border-black/10 p-4" onSubmit={createActor}>
            <div className="text-sm font-semibold">Novo ator</div>
            <input className={`${input} mt-3`} value={actorName} onChange={(event) => setActorName(event.target.value)} placeholder="Nome do ator" />
            <input className={`${input} mt-2`} value={actorImageUrl} onChange={(event) => setActorImageUrl(event.target.value)} placeholder="URL da imagem (opcional)" />
            <button disabled={loading} className="mt-3 rounded-xl border border-black/15 px-3 py-2 text-sm font-semibold disabled:opacity-50">Cadastrar ator</button>
          </form>
          <form className="rounded-xl border border-black/10 p-4" onSubmit={createVoice}>
            <div className="text-sm font-semibold">Nova voz</div>
            <input className={`${input} mt-3`} value={voiceName} onChange={(event) => setVoiceName(event.target.value)} placeholder="Nome da voz" />
            <input className={`${input} mt-2`} value={voiceLanguage} onChange={(event) => setVoiceLanguage(event.target.value)} placeholder="Idioma, ex.: pt-BR" />
            <button disabled={loading} className="mt-3 rounded-xl border border-black/15 px-3 py-2 text-sm font-semibold disabled:opacity-50">Cadastrar voz</button>
          </form>
          <form className="rounded-xl border border-black/10 p-4" onSubmit={previewVoice}>
            <div className="text-sm font-semibold">Prévia de voz</div>
            <select className={`${input} mt-3`} value={selectedVoiceId} onChange={(event) => setSelectedVoiceId(event.target.value)}>
              <option value="">Voz aprovada</option>
              {voices.filter((voice) => voice.rightsStatus === 'APPROVED').map((voice) => <option key={voice.id} value={voice.id}>{voice.name} · {voice.language}</option>)}
            </select>
            <textarea className={`${input} mt-2 min-h-20`} value={voicePreviewText} onChange={(event) => setVoicePreviewText(event.target.value)} placeholder="Texto da prévia" />
            <button disabled={loading || !selectedProjectId} className="mt-3 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Gerar prévia</button>
            {voices.find((voice) => voice.id === selectedVoiceId)?.previewUrl && <audio className="mt-3 w-full" controls src={voices.find((voice) => voice.id === selectedVoiceId).previewUrl} />}
          </form>
          <form className="rounded-xl border border-black/10 p-4" onSubmit={grantRights}>
            <div className="text-sm font-semibold">Aprovar recurso</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select className={input} value={rightsResourceType} onChange={(event) => { const value = event.target.value as 'actor' | 'voice' | 'asset'; setRightsResourceType(value); setRightsResourceId(''); }}>
                <option value="actor">Ator</option>
                <option value="voice">Voz</option>
                <option value="asset">Produto</option>
              </select>
              <select className={input} value={rightsResourceId} onChange={(event) => setRightsResourceId(event.target.value)}>
                <option value="">Recurso</option>
                {(rightsResourceType === 'actor' ? actors : rightsResourceType === 'voice' ? voices : selectedProject?.assets || []).map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
              </select>
            </div>
            <input className={`${input} mt-2`} value={consentReference} onChange={(event) => setConsentReference(event.target.value)} placeholder="ID do consentimento / contrato" />
            <button disabled={loading} className="mt-3 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Aprovar recurso</button>
          </form>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <form className={card} onSubmit={publishVariant}>
          <h2 className="text-lg font-semibold">Publicar variação aprovada</h2>
          <p className="mt-1 text-sm text-black/55">Envie o output para um canal conectado como rascunho, agendamento ou publicação imediata.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select className={input} value={publishVariantId} onChange={(event) => setPublishVariantId(event.target.value)}>
              <option value="">Variação pronta</option>
              {(selectedProject?.variants || []).filter((variant) => variant.status === 'READY' && variant.videoUrl).map((variant) => <option key={variant.id} value={variant.id}>{variant.id} · {variant.language} · {variant.format}</option>)}
            </select>
            <select className={input} value={selectedIntegrationId} onChange={(event) => setSelectedIntegrationId(event.target.value)}>
              <option value="">Canal conectado</option>
              {integrations.map((integration) => <option key={integration.id} value={integration.id}>{integration.name || integration.identifier || integration.providerIdentifier}</option>)}
            </select>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select className={input} value={publishType} onChange={(event) => setPublishType(event.target.value as 'draft' | 'schedule' | 'now')}>
              <option value="draft">Rascunho</option>
              <option value="schedule">Agendar</option>
              <option value="now">Publicar agora</option>
            </select>
            <input className={input} type="datetime-local" value={publishDate} onChange={(event) => setPublishDate(event.target.value)} disabled={publishType === 'now'} />
          </div>
          <textarea className={`${input} mt-3 min-h-20`} value={publishContent} onChange={(event) => setPublishContent(event.target.value)} placeholder="Legenda em HTML seguro" />
          <button disabled={loading || !selectedProjectId} className="mt-3 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Enviar para publicação</button>
        </form>
        <div className={card}>
          <h2 className="text-lg font-semibold">Publicações</h2>
          <p className="mt-1 text-sm text-black/55">Histórico idempotente de envios para canais.</p>
          <div className="mt-4 space-y-2">
            {publications.length ? publications.slice(0, 8).map((publication) => <div key={publication.id} className="rounded-xl bg-black/[0.04] p-3 text-xs"><div className="font-medium">{publication.status} · {publication.type}</div><div className="mt-1 text-black/50">{publication.integrationId} · {publication.postIds?.join(', ') || 'sem post id'}</div></div>) : <div className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/50">Nenhuma publicação.</div>}
          </div>
        </div>
      </section>

      <section className={card}>
        <div>
          <h2 className="text-lg font-semibold">Presets de producao</h2>
          <p className="mt-1 text-sm text-black/55">Pontos de partida para UGC, product showcase e localizacao.</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {presets.map((preset) => (
            <div key={preset.id} className="rounded-xl border border-black/10 p-4 text-left transition hover:border-black hover:bg-black/[0.03]">
              <div className="text-sm font-semibold">{preset.name}</div>
              <div className="mt-1 text-xs text-black/55">{preset.description}</div>
              <div className="mt-3 text-[11px] font-medium uppercase tracking-wide text-black/40">{preset.capability}</div>
              <div className="mt-3 flex gap-2"><button type="button" onClick={() => { setPrompt(String(preset.description || '')); setMessage(`Prompt do preset ${preset.id} carregado.`); }} className="rounded-lg border border-black/15 px-2 py-1 text-xs">Usar prompt</button><button type="button" disabled={loading || !selectedProjectId} onClick={() => runPreset(preset.id)} className="rounded-lg bg-black px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">Executar</button></div>
            </div>
          ))}
        </div>
      </section>

      <CreativeWorkflowBuilder projectId={selectedProjectId || undefined} />

      <CreativeSceneComposer projectId={selectedProjectId || undefined} />

      <CreativeVariantMatrix projectId={selectedProjectId || undefined} actors={actors} voices={voices} />

      <section className={card}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Revisão de qualidade</h2>
            <p className="mt-1 text-sm text-black/55">Faça o preflight técnico e registre aprovação humana antes de publicar.</p>
          </div>
          <select className="rounded-xl border border-black/10 px-3 py-2 text-sm" value={selectedReviewJobId} onChange={(event) => setSelectedReviewJobId(event.target.value)}>
            <option value="">Selecione um job</option>
            {jobs.filter((job) => job.status === 'SUCCEEDED').map((job) => <option key={job.id} value={job.id}>{job.type} · {job.id}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={loading || !selectedReviewJobId} onClick={() => evaluateJob(selectedReviewJobId)} className="rounded-xl border border-black/15 px-3 py-2 text-sm">Executar preflight</button>
          <button type="button" disabled={loading || !selectedReviewJobId} onClick={() => reviewJob(selectedReviewJobId, true)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Aprovar output</button>
          <button type="button" disabled={loading || !selectedReviewJobId} onClick={() => reviewJob(selectedReviewJobId, false)} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">Rejeitar output</button>
        </div>
      </section>

      <section className={card}>
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Jobs e outputs</h2><p className="mt-1 text-sm text-black/55">Acompanhe renders, falhas, custos e links.</p></div><button onClick={() => refresh().catch((error) => setMessage(error.message))} className="rounded-xl border border-black/10 px-3 py-2 text-sm">Atualizar</button></div>
        <div className="mt-4 space-y-2">
          {jobs.length ? jobs.map((job) => <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/[0.04] px-4 py-3 text-sm"><div><div className="font-medium">{job.type}</div><div className="text-xs text-black/50">{job.id}</div></div><div className="flex items-center gap-3 text-right"><div><div className="font-medium">{job.status} · {job.progress}%</div>{job.output?.url && <a className="text-xs text-blue-600 underline" href={job.output.url} target="_blank" rel="noreferrer">Abrir output</a>}{job.error && <div className="max-w-md text-xs text-red-600">{job.error}</div>}</div>{!['SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELLED'].includes(job.status) && <button type="button" disabled={loading} onClick={() => cancelJob(job.id)} className="rounded-lg border border-red-500 px-2 py-1 text-xs text-red-600 disabled:opacity-50">Cancelar</button>}</div></div>) : <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-sm text-black/50">Nenhum job ainda.</div>}
        </div>
      </section>
    </main>
  );
}
