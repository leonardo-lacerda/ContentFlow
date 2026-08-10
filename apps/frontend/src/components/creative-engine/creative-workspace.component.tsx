'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { CreativeEnginePage } from './creative-engine-page.component';
import { useSearchParams } from 'next/navigation';

type CreativeType = 'ugc' | 'product' | 'image' | 'script';
type Step = 0 | 1 | 2 | 3;

type Project = {
  id: string;
  name: string;
  objective?: string;
  status: string;
  aspectRatio?: string;
  assets?: any[];
  variants?: any[];
  scripts?: any[];
};

type Job = {
  id: string;
  type: string;
  status: string;
  progress?: number;
  error?: string;
  output?: { url?: string; provider?: string; model?: string };
};

const typeOptions: Array<{
  id: CreativeType;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'ugc',
    title: 'Vídeo UGC',
    description: 'Uma pessoa apresenta o produto com roteiro, voz e edição.',
    icon: '◉',
  },
  {
    id: 'product',
    title: 'Vídeo do produto',
    description: 'Mostre seu produto com foco em benefício, prova e conversão.',
    icon: '✦',
  },
  {
    id: 'image',
    title: 'Imagem para anúncio',
    description: 'Crie um visual pronto para campanhas e redes sociais.',
    icon: '▧',
  },
  {
    id: 'script',
    title: 'Só o roteiro',
    description: 'Comece pela ideia e refine a mensagem antes de gerar.',
    icon: '≡',
  },
];

const formatOptions = [
  { id: '9:16', label: 'Vertical', hint: 'Reels, TikTok e Shorts' },
  { id: '1:1', label: 'Quadrado', hint: 'Feed e catálogo' },
  { id: '16:9', label: 'Horizontal', hint: 'YouTube e apresentações' },
];

const stepLabels = ['Brief', 'Estilo', 'Gerar', 'Revisar'];

const card = 'rounded-[24px] border border-black/10 bg-white shadow-sm';
const input =
  'w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/5';

function Button({
  children,
  variant = 'primary',
  ...props
}: {
  children: ReactNode;
  variant?: 'primary' | 'soft' | 'outline' | 'danger';
  [key: string]: any;
}) {
  const styles = {
    primary: 'bg-black text-white hover:bg-black/80',
    soft: 'bg-[#f5f1eb] text-black hover:bg-[#eee8df]',
    outline: 'border border-black/15 bg-white text-black hover:border-black/40',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant];
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${
        props.className || ''
      }`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status?: string }) {
  const normalized = String(status || 'DRAFT').toUpperCase();
  const labels: Record<string, string> = {
    DRAFT: 'Rascunho',
    QUEUED: 'Na fila',
    RESERVED: 'Preparando',
    RUNNING: 'Gerando',
    SUCCEEDED: 'Pronto',
    READY: 'Pronto',
    FAILED: 'Falhou',
    PUBLISHED: 'Publicado',
  };
  const tone = ['SUCCEEDED', 'READY', 'PUBLISHED'].includes(normalized)
    ? 'bg-emerald-50 text-emerald-700'
    : ['FAILED'].includes(normalized)
    ? 'bg-red-50 text-red-700'
    : 'bg-amber-50 text-amber-700';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}
    >
      {labels[normalized] || normalized}
    </span>
  );
}

export function CreativeWorkspacePage() {
  const fetch = useFetch();
  const searchParams = useSearchParams();
  const [view, setView] = useState<'home' | 'create' | 'projects' | 'advanced'>(
    () => (searchParams.get('view') === 'projects' ? 'projects' : 'home')
  );
  const [quickMode, setQuickMode] = useState(true);
  const [step, setStep] = useState<Step>(0);
  const [creativeType, setCreativeType] = useState<CreativeType>('ugc');
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [actors, setActors] = useState<any[]>([]);
  const [voices, setVoices] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [credits, setCredits] = useState({ balance: 0, reserved: 0 });
  const [capabilities, setCapabilities] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectName, setProjectName] = useState('Minha campanha');
  const [objective, setObjective] = useState(
    'Criar um anúncio que apresente meu produto e gere conversões.'
  );
  const [brief, setBrief] = useState(
    'Apresente o produto, destaque o principal benefício e termine com um CTA claro.'
  );
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [selectedActorId, setSelectedActorId] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetName, setAssetName] = useState('Produto');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [publishVariantId, setPublishVariantId] = useState('');
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
  const [publishType, setPublishType] = useState<'draft' | 'schedule' | 'now'>(
    'draft'
  );
  const [publishDate, setPublishDate] = useState(() =>
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [publishContent, setPublishContent] = useState(
    'Confira este criativo e descubra o que muda quando você simplifica sua operação.'
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastOutputUrl, setLastOutputUrl] = useState('');

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId]
  );
  const readyVariants = useMemo(
    () =>
      (selectedProject?.variants || []).filter(
        (variant: any) =>
          variant.status === 'READY' || variant.status === 'SUCCEEDED'
      ),
    [selectedProject]
  );
  const activeJobs = jobs.filter((job) =>
    ['QUEUED', 'RESERVED', 'RUNNING'].includes(job.status)
  );

  async function readJson(path: string, options?: RequestInit) {
    const response = await fetch(path, options);
    const body = await response.json();
    if (!response.ok)
      throw new Error(
        body?.message || body?.msg || 'Não foi possível concluir a operação.'
      );
    return body;
  }

  async function refresh() {
    const [
      projectData,
      jobData,
      actorData,
      voiceData,
      creditData,
      capabilityData,
      integrationData,
    ] = await Promise.all([
      readJson('/creative/projects'),
      readJson('/creative/jobs'),
      readJson('/creative/actors?includeUnapproved=true'),
      readJson('/creative/voices?includeUnapproved=true'),
      readJson('/creative/credits'),
      readJson('/creative/capabilities'),
      readJson('/integrations/list'),
    ]);
    setProjects(Array.isArray(projectData) ? projectData : []);
    setJobs(Array.isArray(jobData) ? jobData : []);
    setActors(Array.isArray(actorData) ? actorData : []);
    setVoices(Array.isArray(voiceData) ? voiceData : []);
    setCredits(creditData || { balance: 0, reserved: 0 });
    setCapabilities(Array.isArray(capabilityData) ? capabilityData : []);
    setIntegrations(
      Array.isArray(integrationData)
        ? integrationData
        : integrationData?.integrations || []
    );
    if (!selectedProjectId && projectData?.[0]?.id)
      setSelectedProjectId(projectData[0].id);
  }

  useEffect(() => {
    refresh().catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (searchParams.get('view') === 'projects') setView('projects');
  }, [searchParams]);

  useEffect(() => {
    if (!activeJobs.length) return;
    const timer = window.setInterval(
      () => refresh().catch(() => undefined),
      5000
    );
    return () => window.clearInterval(timer);
  }, [activeJobs.length]);

  async function createProjectIfNeeded() {
    if (selectedProjectId) return selectedProjectId;
    const project = await readJson('/creative/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: projectName.trim() || 'Minha campanha',
        objective,
        aspectRatio,
      }),
    });
    setSelectedProjectId(project.id);
    await refresh();
    return project.id;
  }

  async function nextFromBrief(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const id = await createProjectIfNeeded();
      if (creativeType !== 'image') {
        await readJson(`/creative/projects/${id}/scripts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brief }),
        });
      }
      await refresh();
      setStep(1);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadAsset() {
    if (!assetFile || !selectedProjectId) return;
    const formData = new FormData();
    formData.append('file', assetFile);
    const uploaded = await readJson('/media/upload-simple', {
      method: 'POST',
      body: formData,
    });
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
    await refresh();
    return asset.id;
  }

  async function nextFromStyle(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (assetFile && !selectedAssetId) await uploadAsset();
      setStep(2);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId)
      return setMessage('Volte ao brief para criar o projeto.');
    setLoading(true);
    setMessage('');
    try {
      if (creativeType === 'script') {
        setMessage('Seu roteiro está pronto para revisão.');
      } else {
        const capability =
          creativeType === 'image' ? 'image-generation' : 'talking-actor';
        const quote = await readJson(
          `/creative/projects/${selectedProjectId}/quote`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              capability,
              actorId: selectedActorId || undefined,
              voiceId: selectedVoiceId || undefined,
              prompt: prompt || undefined,
              aspectRatio,
            }),
          }
        );
        if (!quote.canGenerate)
          throw new Error(
            `Saldo insuficiente. Esta geração precisa de ${
              quote.quote?.estimatedCredits || '?'
            } créditos.`
          );
        const result =
          creativeType === 'image'
            ? await readJson(
                `/creative/projects/${selectedProjectId}/images/generate`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    prompt: prompt || brief,
                    aspectRatio,
                    productAssetIds: selectedAssetId ? [selectedAssetId] : [],
                  }),
                }
              )
            : await readJson(
                `/creative/projects/${selectedProjectId}/variants/generate`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    capability,
                    actorId: selectedActorId || undefined,
                    voiceId: selectedVoiceId || undefined,
                    prompt: prompt || undefined,
                    aspectRatio,
                  }),
                }
              );
        setMessage(
          `Geração iniciada. ${
            result?.job?.id
              ? `Job ${result.job.id}`
              : 'Acompanhe o progresso abaixo.'
          }`
        );
        await refresh();
      }
      setStep(3);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function quickGenerate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const id = await createProjectIfNeeded();
      const assetId =
        assetFile && !selectedAssetId ? await uploadAsset() : selectedAssetId;
      if (creativeType !== 'image') {
        await readJson(`/creative/projects/${id}/scripts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brief }),
        });
      }
      if (creativeType === 'script') {
        setMessage(
          'Roteiro criado. Você pode revisar e editar antes de gerar o vídeo.'
        );
      } else {
        const capability =
          creativeType === 'image' ? 'image-generation' : 'talking-actor';
        const quote = await readJson(`/creative/projects/${id}/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            capability,
            prompt: prompt || brief,
            aspectRatio,
          }),
        });
        if (!quote.canGenerate)
          throw new Error(
            `Saldo insuficiente. Esta geração precisa de ${
              quote.quote?.estimatedCredits || '?'
            } créditos.`
          );
        await readJson(
          creativeType === 'image'
            ? `/creative/projects/${id}/images/generate`
            : `/creative/projects/${id}/variants/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              creativeType === 'image'
                ? {
                    prompt: prompt || brief,
                    aspectRatio,
                    productAssetIds: assetId ? [assetId] : [],
                  }
                : { capability, prompt: prompt || undefined, aspectRatio }
            ),
          }
        );
        setMessage(
          'Seu anúncio está sendo gerado. Você pode acompanhar o progresso abaixo.'
        );
      }
      await refresh();
      setQuickMode(false);
      setStep(3);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId || !publishVariantId || !selectedIntegrationId)
      return setMessage('Escolha um criativo pronto e um canal conectado.');
    setLoading(true);
    try {
      await readJson(
        `/creative/projects/${selectedProjectId}/variants/${publishVariantId}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            integrationId: selectedIntegrationId,
            type: publishType,
            date:
              publishType === 'now'
                ? new Date().toISOString()
                : new Date(publishDate).toISOString(),
            content: publishContent,
          }),
        }
      );
      setMessage('Criativo enviado para publicação.');
      await refresh();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function startNew(type: CreativeType = 'ugc') {
    setCreativeType(type);
    setSelectedProjectId('');
    setSelectedAssetId('');
    setAssetFile(null);
    setPrompt('');
    setStep(0);
    setQuickMode(true);
    setView('create');
    setMessage('');
    setProjectName(
      type === 'image'
        ? 'Minha imagem de anúncio'
        : type === 'script'
        ? 'Meu roteiro'
        : 'Minha campanha UGC'
    );
  }

  function resume(project: Project) {
    setSelectedProjectId(project.id);
    setView('create');
    setQuickMode(false);
    setStep(project.scripts?.length || project.variants?.length ? 3 : 0);
  }

  return (
    <main className="min-h-full overflow-y-auto bg-[#f7f4ef] px-5 py-7 text-[#171615] md:px-10 md:py-9">
      <div className="mx-auto max-w-[1180px] space-y-7">
        <header className="flex flex-col gap-5 border-b border-black/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
              <span className="h-2 w-2 rounded-full bg-[#b4530a]" /> Criar
            </div>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
              Crie um anúncio que parece da sua marca.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/60">
              Do brief à publicação em um fluxo simples. As configurações
              técnicas ficam disponíveis quando você precisar delas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-black/40">
                Créditos
              </div>
              <div className="mt-1 text-lg font-semibold">
                {credits.balance}
              </div>
            </div>
            <Button onClick={() => startNew()}>+ Criar anúncio</Button>
          </div>
        </header>

        <nav
          className="flex flex-wrap gap-2"
          aria-label="Navegação do criativo"
        >
          {[
            ['home', 'Visão geral'],
            ['create', 'Criar anúncio'],
            ['projects', 'Projetos'],
            ['advanced', 'Avançado'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id as typeof view)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                view === id
                  ? 'bg-black text-white'
                  : 'bg-white text-black/60 hover:bg-black/5'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {message && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage('')}
              aria-label="Fechar aviso"
            >
              ×
            </button>
          </div>
        )}

        {view === 'home' && (
          <Overview
            projects={projects}
            jobs={jobs}
            onCreate={startNew}
            onResume={resume}
          />
        )}
        {view === 'projects' && (
          <ProjectsView
            projects={projects}
            jobs={jobs}
            onCreate={startNew}
            onResume={resume}
          />
        )}
        {view === 'advanced' && (
          <section className={`${card} overflow-hidden`}>
            <div className="border-b border-black/10 bg-[#171615] px-6 py-5 text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                Laboratório avançado
              </div>
              <h2 className="mt-1 text-2xl font-semibold">
                Controle total para quem precisa.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-white/60">
                Workflows, matriz de variações, compositor de cenas, jobs,
                consentimentos e exportação continuam disponíveis aqui.
              </p>
            </div>
            <div className="p-2 md:p-5">
              <CreativeEnginePage />
            </div>
          </section>
        )}
        {view === 'create' &&
          (quickMode ? (
            <QuickCreate
              creativeType={creativeType}
              setCreativeType={setCreativeType}
              brief={brief}
              setBrief={setBrief}
              prompt={prompt}
              setPrompt={setPrompt}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              assetFile={assetFile}
              setAssetFile={setAssetFile}
              assetName={assetName}
              setAssetName={setAssetName}
              loading={loading}
              onGenerate={quickGenerate}
              onCustomize={() => setQuickMode(false)}
            />
          ) : (
            <CreateFlow
              step={step}
              setStep={setStep}
              creativeType={creativeType}
              setCreativeType={setCreativeType}
              projectName={projectName}
              setProjectName={setProjectName}
              objective={objective}
              setObjective={setObjective}
              brief={brief}
              setBrief={setBrief}
              prompt={prompt}
              setPrompt={setPrompt}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              actors={actors}
              voices={voices}
              capabilities={capabilities}
              selectedActorId={selectedActorId}
              setSelectedActorId={setSelectedActorId}
              selectedVoiceId={selectedVoiceId}
              setSelectedVoiceId={setSelectedVoiceId}
              assetFile={assetFile}
              setAssetFile={setAssetFile}
              assetName={assetName}
              setAssetName={setAssetName}
              selectedProject={selectedProject}
              readyVariants={readyVariants}
              integrations={integrations}
              publishVariantId={publishVariantId}
              setPublishVariantId={setPublishVariantId}
              selectedIntegrationId={selectedIntegrationId}
              setSelectedIntegrationId={setSelectedIntegrationId}
              publishType={publishType}
              setPublishType={setPublishType}
              publishDate={publishDate}
              setPublishDate={setPublishDate}
              publishContent={publishContent}
              setPublishContent={setPublishContent}
              loading={loading}
              onBrief={nextFromBrief}
              onStyle={nextFromStyle}
              onGenerate={generate}
              onPublish={publish}
              onRefresh={() =>
                refresh().catch((error) => setMessage(error.message))
              }
              jobs={jobs}
              lastOutputUrl={lastOutputUrl}
            />
          ))}
      </div>
    </main>
  );
}

function Overview({
  projects,
  jobs,
  onCreate,
  onResume,
}: {
  projects: Project[];
  jobs: Job[];
  onCreate: (type?: CreativeType) => void;
  onResume: (project: Project) => void;
}) {
  const active = jobs.filter((job) =>
    ['QUEUED', 'RESERVED', 'RUNNING'].includes(job.status)
  );
  return (
    <div className="space-y-7">
      <section className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => onCreate('ugc')}
          className="group rounded-[24px] bg-black p-6 text-left text-white transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-white/10 px-3 py-2 text-xl">◉</span>
            <span className="text-xl transition group-hover:translate-x-1">
              →
            </span>
          </div>
          <h2 className="mt-9 text-xl font-semibold">Começar um anúncio</h2>
          <p className="mt-2 text-sm leading-5 text-white/60">
            Escolha um formato e siga um caminho guiado.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onCreate('image')}
          className="group rounded-[24px] border border-black/10 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-black/30 hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-[#f5f1eb] px-3 py-2 text-xl">▧</span>
            <span className="text-xl transition group-hover:translate-x-1">
              →
            </span>
          </div>
          <h2 className="mt-9 text-xl font-semibold">Criar imagem</h2>
          <p className="mt-2 text-sm leading-5 text-black/55">
            Um visual pronto para campanha, feed ou catálogo.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onCreate('script')}
          className="group rounded-[24px] border border-black/10 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-black/30 hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-[#f5f1eb] px-3 py-2 text-xl">≡</span>
            <span className="text-xl transition group-hover:translate-x-1">
              →
            </span>
          </div>
          <h2 className="mt-9 text-xl font-semibold">Começar pelo roteiro</h2>
          <p className="mt-2 text-sm leading-5 text-black/55">
            Organize a ideia antes de decidir o formato final.
          </p>
        </button>
      </section>
      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className={`${card} p-6`}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Continue de onde parou</h2>
              <p className="mt-1 text-sm text-black/55">
                Seus projetos recentes aparecem aqui.
              </p>
            </div>
            <span className="text-xs font-semibold text-black/40">
              {projects.length} projetos
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {projects.slice(0, 4).map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                onClick={() => onResume(project)}
              />
            ))}
            {!projects.length && (
              <EmptyState
                title="Ainda não há projetos"
                description="Seu primeiro anúncio começa com um brief simples."
                action="Criar anúncio"
                onClick={() => onCreate()}
              />
            )}
          </div>
        </div>
        <div className={`${card} p-6`}>
          <h2 className="text-xl font-semibold">Atividade</h2>
          <p className="mt-1 text-sm text-black/55">
            Gerações e renders recentes.
          </p>
          <div className="mt-5 space-y-3">
            {active.slice(0, 4).map((job) => (
              <div key={job.id} className="rounded-2xl bg-[#f7f4ef] p-3">
                <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                  <span>{job.type}</span>
                  <StatusPill status={job.status} />
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-[#b4530a] transition-all"
                    style={{ width: `${Math.max(5, job.progress || 0)}%` }}
                  />
                </div>
              </div>
            ))}
            {!active.length && (
              <div className="rounded-2xl bg-[#f7f4ef] p-4 text-sm text-black/55">
                Nenhuma geração em andamento.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProjectsView({
  projects,
  jobs,
  onCreate,
  onResume,
}: {
  projects: Project[];
  jobs: Job[];
  onCreate: (type?: CreativeType) => void;
  onResume: (project: Project) => void;
}) {
  return (
    <section className={`${card} p-6`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
            Biblioteca de criação
          </div>
          <h2 className="mt-2 text-2xl font-semibold">Projetos</h2>
          <p className="mt-1 text-sm text-black/55">
            Um lugar para seus briefs, versões e resultados.
          </p>
        </div>
        <Button onClick={() => onCreate()}>+ Novo projeto</Button>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {projects.map((project) => (
          <button
            type="button"
            key={project.id}
            onClick={() => onResume(project)}
            className="rounded-2xl border border-black/10 bg-[#faf9f7] p-4 text-left transition hover:border-black/30 hover:bg-white"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{project.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-black/55">
                  {project.objective || 'Sem objetivo definido.'}
                </p>
              </div>
              <StatusPill status={project.status} />
            </div>
            <div className="mt-5 flex gap-4 text-xs text-black/45">
              <span>{project.assets?.length || 0} assets</span>
              <span>{project.variants?.length || 0} versões</span>
              <span>{project.scripts?.length || 0} roteiros</span>
            </div>
          </button>
        ))}
        {!projects.length && (
          <div className="md:col-span-2">
            <EmptyState
              title="Sua biblioteca está vazia"
              description="Crie um projeto para começar a acumular versões e resultados."
              action="Criar primeiro projeto"
              onClick={() => onCreate()}
            />
          </div>
        )}
      </div>
      <div className="mt-8 border-t border-black/10 pt-5 text-xs text-black/45">
        {jobs.length} jobs registrados. Outputs e configurações técnicas ficam
        no Laboratório avançado.
      </div>
    </section>
  );
}

function ProjectRow({
  project,
  onClick,
}: {
  project: Project;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-black/10 p-4 text-left transition hover:border-black/30 hover:bg-[#faf9f7]"
    >
      <div className="min-w-0">
        <div className="truncate font-semibold">{project.name}</div>
        <div className="mt-1 truncate text-sm text-black/50">
          {project.objective || 'Sem objetivo definido.'}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusPill status={project.status} />
        <span className="text-lg text-black/35">→</span>
      </div>
    </button>
  );
}

function EmptyState({
  title,
  description,
  action,
  onClick,
}: {
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 bg-[#faf9f7] p-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm">
        ✦
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-black/50">
        {description}
      </p>
      <Button variant="soft" className="mt-4" onClick={onClick}>
        {action}
      </Button>
    </div>
  );
}

function QuickCreate({
  creativeType,
  setCreativeType,
  brief,
  setBrief,
  prompt,
  setPrompt,
  aspectRatio,
  setAspectRatio,
  assetFile,
  setAssetFile,
  assetName,
  setAssetName,
  loading,
  onGenerate,
  onCustomize,
}: {
  creativeType: CreativeType;
  setCreativeType: (value: CreativeType) => void;
  brief: string;
  setBrief: (value: string) => void;
  prompt: string;
  setPrompt: (value: string) => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  assetFile: File | null;
  setAssetFile: (value: File | null) => void;
  assetName: string;
  setAssetName: (value: string) => void;
  loading: boolean;
  onGenerate: (event: FormEvent) => void;
  onCustomize: () => void;
}) {
  const quickTypes = typeOptions.filter(({ id }) => id !== 'script');
  const promptValue = prompt || brief;

  function updatePrompt(value: string) {
    setPrompt(value);
    setBrief(value);
  }

  return (
    <form onSubmit={onGenerate} className="mx-auto max-w-[900px]">
      <section className={`${card} overflow-hidden`}>
        <div className="border-b border-black/10 px-6 py-7 md:px-10 md:py-9">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
              Geracao rapida
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Crie seu anuncio em uma frase.
            </h2>
            <p className="mt-3 text-sm leading-6 text-black/55">
              Escolha um formato, adicione o produto e diga o que voce quer
              comunicar. O restante fica por nossa conta.
            </p>
          </div>
        </div>

        <div className="space-y-8 p-6 md:p-10">
          <div>
            <div className="mb-3 flex items-center justify-between gap-4">
              <label className="text-sm font-semibold">
                O que voce quer criar?
              </label>
              <span className="text-xs text-black/40">1 escolha</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {quickTypes.map((option) => {
                const selected = creativeType === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setCreativeType(option.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected
                        ? 'border-black bg-black text-white shadow-md'
                        : 'border-black/10 bg-white hover:border-black/30 hover:bg-[#faf9f7]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{option.icon}</span>
                      <span
                        className={`h-4 w-4 rounded-full border ${
                          selected
                            ? 'border-white bg-white ring-4 ring-white/20'
                            : 'border-black/20'
                        }`}
                      />
                    </div>
                    <div className="mt-5 font-semibold">{option.title}</div>
                    <div
                      className={`mt-1 text-xs leading-5 ${
                        selected ? 'text-white/60' : 'text-black/50'
                      }`}
                    >
                      {option.id === 'ugc'
                        ? 'Pessoa + roteiro + voz'
                        : option.id === 'product'
                        ? 'Produto em destaque'
                        : 'Visual para campanha'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-4">
              <label htmlFor="quick-brief" className="text-sm font-semibold">
                O que voce quer comunicar?
              </label>
              <span className="text-xs text-black/40">Obrigatorio</span>
            </div>
            <textarea
              id="quick-brief"
              value={promptValue}
              onChange={(event) => updatePrompt(event.target.value)}
              className={`${input} min-h-[150px] resize-y leading-6`}
              placeholder="Ex.: Mostre como meu cafe especial deixa a rotina mais gostosa e termine com uma oferta de primeira compra."
              required
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                'Destaque o principal beneficio',
                'Fale como um criador',
                'Termine com uma oferta',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() =>
                    updatePrompt(
                      promptValue
                        ? `${promptValue} ${suggestion}.`
                        : `${suggestion}.`
                    )
                  }
                  className="rounded-full border border-black/10 bg-[#faf9f7] px-3 py-2 text-xs text-black/60 transition hover:border-black/30 hover:text-black"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_0.8fr]">
            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <span className="text-sm font-semibold">Seu produto</span>
                <span className="text-xs text-black/40">Opcional</span>
              </div>
              <label
                htmlFor="quick-asset"
                className={`flex min-h-[118px] cursor-pointer items-center justify-center rounded-2xl border border-dashed p-4 text-center transition ${
                  assetFile
                    ? 'border-emerald-300 bg-emerald-50/60'
                    : 'border-black/15 bg-[#faf9f7] hover:border-black/35 hover:bg-white'
                }`}
              >
                <div>
                  <div className="text-2xl">{assetFile ? '✓' : '＋'}</div>
                  <div className="mt-2 text-sm font-semibold">
                    {assetFile ? assetFile.name : 'Enviar foto ou video'}
                  </div>
                  <div className="mt-1 text-xs text-black/45">
                    {assetFile ? 'Clique para trocar' : 'PNG, JPG ou MP4'}
                  </div>
                </div>
                <input
                  id="quick-asset"
                  type="file"
                  accept="image/*,video/*"
                  className="sr-only"
                  onChange={(event) =>
                    setAssetFile(event.target.files?.[0] || null)
                  }
                />
              </label>
              {assetFile && (
                <input
                  value={assetName}
                  onChange={(event) => setAssetName(event.target.value)}
                  className={`${input} mt-3`}
                  placeholder="Nome do produto"
                  aria-label="Nome do produto"
                />
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <span className="text-sm font-semibold">Formato</span>
                <span className="text-xs text-black/40">
                  Para onde vai publicar?
                </span>
              </div>
              <div className="space-y-2">
                {formatOptions.map((format) => {
                  const selected = aspectRatio === format.id;
                  return (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => setAspectRatio(format.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        selected
                          ? 'border-black bg-black text-white'
                          : 'border-black/10 bg-white hover:border-black/30'
                      }`}
                    >
                      <span className="text-sm font-semibold">
                        {format.label}
                      </span>
                      <span
                        className={`text-xs ${
                          selected ? 'text-white/55' : 'text-black/45'
                        }`}
                      >
                        {format.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onCustomize}
              className="text-left text-sm font-semibold text-black/55 underline decoration-black/20 underline-offset-4 transition hover:text-black"
            >
              Personalizar configuracoes
            </button>
            <div className="flex items-center gap-4 sm:justify-end">
              <span className="hidden text-xs text-black/40 sm:block">
                1 geracao · sem configuracao tecnica
              </span>
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[170px]"
              >
                {loading ? 'Gerando...' : 'Gerar anuncio'}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}

function CreateFlow(props: any) {
  const {
    step,
    setStep,
    creativeType,
    setCreativeType,
    projectName,
    setProjectName,
    objective,
    setObjective,
    brief,
    setBrief,
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    actors,
    voices,
    selectedActorId,
    setSelectedActorId,
    selectedVoiceId,
    setSelectedVoiceId,
    assetFile,
    setAssetFile,
    assetName,
    setAssetName,
    selectedProject,
    readyVariants,
    integrations,
    publishVariantId,
    setPublishVariantId,
    selectedIntegrationId,
    setSelectedIntegrationId,
    publishType,
    setPublishType,
    publishDate,
    setPublishDate,
    publishContent,
    setPublishContent,
    loading,
    onBrief,
    onStyle,
    onGenerate,
    onPublish,
    onRefresh,
    jobs,
  } = props;
  return (
    <div className="space-y-5">
      <section className={`${card} overflow-hidden`}>
        <div className="border-b border-black/10 px-5 py-5 md:px-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
                Novo criativo
              </div>
              <h2 className="mt-1 text-xl font-semibold">
                {creativeType === 'image'
                  ? 'Imagem de anúncio'
                  : creativeType === 'script'
                  ? 'Roteiro de vídeo'
                  : 'Anúncio em vídeo'}
              </h2>
            </div>
            <span className="text-xs text-black/45">Etapa {step + 1} de 4</span>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-2">
            {stepLabels.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => index <= step && setStep(index)}
                className="group text-left"
                disabled={index > step}
              >
                <div
                  className={`h-1.5 rounded-full transition ${
                    index <= step ? 'bg-black' : 'bg-black/10'
                  }`}
                />
                <div
                  className={`mt-2 text-xs font-semibold ${
                    index === step ? 'text-black' : 'text-black/40'
                  }`}
                >
                  {index + 1}. {label}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 md:p-7">
          {step === 0 && <BriefStep {...props} />}
          {step === 1 && <StyleStep {...props} />}
          {step === 2 && <GenerateStep {...props} />}
          {step === 3 && <ReviewStep {...props} />}
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-black/45">
        <span>Salvamos o projeto conforme você avança.</span>
        <button
          type="button"
          onClick={() => setStep(0)}
          className="underline underline-offset-2"
        >
          Recomeçar este fluxo
        </button>
      </div>
    </div>
  );
}

function BriefStep({
  creativeType,
  setCreativeType,
  projectName,
  setProjectName,
  objective,
  setObjective,
  brief,
  setBrief,
  aspectRatio,
  setAspectRatio,
  loading,
  onBrief,
}: any) {
  return (
    <form onSubmit={onBrief} className="space-y-7">
      <div>
        <h3 className="text-2xl font-semibold">O que você quer criar?</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
          Escolha um ponto de partida. Você poderá ajustar tudo antes de gerar.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {typeOptions.map((option) => (
          <button
            type="button"
            key={option.id}
            onClick={() => setCreativeType(option.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              creativeType === option.id
                ? 'border-black bg-[#f7f4ef] ring-2 ring-black/5'
                : 'border-black/10 hover:border-black/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-lg text-white">
                {option.icon}
              </span>
              <span>
                <span className="block font-semibold">{option.title}</span>
                <span className="mt-1 block text-sm leading-5 text-black/55">
                  {option.description}
                </span>
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Nome do projeto
          <input
            className={`${input} mt-2`}
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Ex.: Campanha de inverno"
          />
        </label>
        <label className="text-sm font-semibold">
          Objetivo
          <textarea
            className={`${input} mt-2 min-h-24`}
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            placeholder="O que este criativo precisa fazer?"
          />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Conte o que precisa aparecer
        <p className="mt-1 text-xs font-normal text-black/45">
          Produto, público, benefício, tom e CTA. Escreva como falaria com um
          criador.
        </p>
        <textarea
          className={`${input} mt-2 min-h-32`}
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
        />
      </label>
      <div className="flex flex-col gap-3 border-t border-black/10 pt-5 md:flex-row md:items-center md:justify-between">
        <label className="text-sm font-semibold">
          Formato
          <select
            className={`${input} mt-2 md:w-64`}
            value={aspectRatio}
            onChange={(event) => setAspectRatio(event.target.value)}
          >
            {formatOptions.map((format) => (
              <option key={format.id} value={format.id}>
                {format.label} · {format.hint}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? 'Preparando…' : 'Continuar para estilo →'}
        </Button>
      </div>
    </form>
  );
}

function StyleStep({
  selectedProject,
  actors,
  voices,
  selectedActorId,
  setSelectedActorId,
  selectedVoiceId,
  setSelectedVoiceId,
  prompt,
  setPrompt,
  assetFile,
  setAssetFile,
  assetName,
  setAssetName,
  loading,
  onStyle,
}: any) {
  const approvedActors = actors.filter(
    (actor: any) => actor.rightsStatus === 'APPROVED'
  );
  const approvedVoices = voices.filter(
    (voice: any) => voice.rightsStatus === 'APPROVED'
  );
  return (
    <form onSubmit={onStyle} className="space-y-7">
      <div>
        <h3 className="text-2xl font-semibold">Dê personalidade ao criativo</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
          Use as escolhas recomendadas ou deixe a IA trabalhar com o seu brief.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Pessoa do vídeo
          <span className="mt-1 block text-xs font-normal text-black/45">
            Aparece apenas em formatos de vídeo.
          </span>
          <select
            className={`${input} mt-2`}
            value={selectedActorId}
            onChange={(event) => setSelectedActorId(event.target.value)}
          >
            <option value="">Escolher depois</option>
            {approvedActors.map((actor: any) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Voz
          <span className="mt-1 block text-xs font-normal text-black/45">
            Usamos somente vozes aprovadas.
          </span>
          <select
            className={`${input} mt-2`}
            value={selectedVoiceId}
            onChange={(event) => setSelectedVoiceId(event.target.value)}
          >
            <option value="">Voz padrão</option>
            {approvedVoices.map((voice: any) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} · {voice.language}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Direção opcional
        <textarea
          className={`${input} mt-2 min-h-28`}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ex.: câmera na mão, energia direta, cortes rápidos, mostrar o produto no primeiro segundo."
        />
      </label>
      <div className="rounded-2xl border border-dashed border-black/15 bg-[#faf9f7] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-semibold">
              Quer usar o produto como referência?
            </div>
            <p className="mt-1 text-sm text-black/50">
              Envie uma imagem ou vídeo. Direitos pendentes serão sinalizados
              antes da geração.
            </p>
          </div>
          <label className="cursor-pointer rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-semibold hover:border-black/40">
            <input
              className="sr-only"
              type="file"
              accept="image/*,video/mp4"
              onChange={(event) =>
                setAssetFile(event.target.files?.[0] || null)
              }
            />
            {assetFile ? 'Trocar arquivo' : 'Escolher arquivo'}
          </label>
        </div>
        {assetFile && (
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              className={input}
              value={assetName}
              onChange={(event) => setAssetName(event.target.value)}
              placeholder="Nome do asset"
            />
            <span className="self-center truncate text-sm text-black/50">
              {assetFile.name}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-black/10 pt-5 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={() => {
            onStyle({ preventDefault: () => {} });
          }}
          className="text-sm font-semibold text-black/55 underline underline-offset-2"
        >
          Pular por enquanto
        </button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando…' : 'Continuar para geração →'}
        </Button>
      </div>
      <div className="text-xs text-black/40">
        {selectedProject
          ? `Projeto: ${selectedProject.name}`
          : 'Projeto será criado ao avançar do brief.'}
      </div>
    </form>
  );
}

function GenerateStep({
  creativeType,
  prompt,
  setPrompt,
  aspectRatio,
  setAspectRatio,
  loading,
  onGenerate,
  capabilities,
}: any) {
  const title =
    creativeType === 'image'
      ? 'Pronto para criar sua imagem?'
      : creativeType === 'script'
      ? 'Seu roteiro está pronto'
      : 'Pronto para gerar seu anúncio?';
  return (
    <form onSubmit={onGenerate} className="space-y-7">
      <div>
        <h3 className="text-2xl font-semibold">{title}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
          Você verá o resultado na próxima etapa. A geração pode levar alguns
          minutos e não bloqueia o restante do produto.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-[#f7f4ef] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-black/40">
            Formato
          </div>
          <div className="mt-2 font-semibold">
            {formatOptions.find((item) => item.id === aspectRatio)?.label}
          </div>
          <div className="mt-1 text-xs text-black/50">{aspectRatio}</div>
        </div>
        <div className="rounded-2xl bg-[#f7f4ef] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-black/40">
            Tipo
          </div>
          <div className="mt-2 font-semibold">
            {typeOptions.find((item) => item.id === creativeType)?.title}
          </div>
          <div className="mt-1 text-xs text-black/50">Uma geração por vez</div>
        </div>
        <div className="rounded-2xl bg-[#f7f4ef] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-black/40">
            Provider
          </div>
          <div className="mt-2 font-semibold">Configurado automaticamente</div>
          <div className="mt-1 text-xs text-black/50">
            {capabilities?.length || 0} capacidades disponíveis
          </div>
        </div>
      </div>
      {creativeType !== 'script' && (
        <label className="block text-sm font-semibold">
          Último ajuste antes de gerar
          <textarea
            className={`${input} mt-2 min-h-24`}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ex.: mais espontâneo, CTA mais direto…"
          />
        </label>
      )}
      <div className="flex flex-col-reverse gap-3 border-t border-black/10 pt-5 md:flex-row md:items-center md:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setAspectRatio(aspectRatio === '9:16' ? '1:1' : '9:16')
          }
        >
          Trocar formato
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? 'Enviando para geração…'
            : creativeType === 'script'
            ? 'Ver roteiro →'
            : 'Gerar agora →'}
        </Button>
      </div>
    </form>
  );
}

function ReviewStep({
  selectedProject,
  readyVariants,
  integrations,
  publishVariantId,
  setPublishVariantId,
  selectedIntegrationId,
  setSelectedIntegrationId,
  publishType,
  setPublishType,
  publishDate,
  setPublishDate,
  publishContent,
  setPublishContent,
  loading,
  onPublish,
  onRefresh,
  jobs,
}: any) {
  const recentJob = jobs.find((job: Job) => job.output?.url) || jobs[0];
  return (
    <div className="space-y-7">
      <div>
        <h3 className="text-2xl font-semibold">
          Revise e escolha o próximo passo
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
          Aprove o que ficou bom, gere outra versão ou envie direto para um
          canal.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl bg-[#171615] p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Resultado
            </div>
            <StatusPill status={recentJob?.status || selectedProject?.status} />
          </div>
          <div className="mt-8 flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-center">
            <div>
              <div className="text-4xl">✦</div>
              <p className="mt-3 text-sm text-white/60">
                A prévia aparecerá aqui quando o job terminar.
              </p>
              {recentJob?.output?.url && (
                <a
                  className="mt-4 inline-block rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
                  href={recentJob.output.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir resultado
                </a>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-4 text-sm font-semibold text-white/60 underline underline-offset-2"
          >
            Atualizar status
          </button>
        </div>
        <form onSubmit={onPublish} className={`${card} p-5`}>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/40">
            Publicação
          </div>
          <h4 className="mt-2 text-lg font-semibold">
            Quando quiser, publique
          </h4>
          <div className="mt-5 space-y-3">
            <select
              className={input}
              value={publishVariantId}
              onChange={(event) => setPublishVariantId(event.target.value)}
            >
              <option value="">Escolha uma versão pronta</option>
              {readyVariants.map((variant: any) => (
                <option key={variant.id} value={variant.id}>
                  {variant.id} · {variant.language || 'pt-BR'}
                </option>
              ))}
            </select>
            <select
              className={input}
              value={selectedIntegrationId}
              onChange={(event) => setSelectedIntegrationId(event.target.value)}
            >
              <option value="">Escolha um canal conectado</option>
              {integrations.map((integration: any) => (
                <option key={integration.id} value={integration.id}>
                  {integration.name ||
                    integration.identifier ||
                    integration.providerIdentifier}
                </option>
              ))}
            </select>
            <select
              className={input}
              value={publishType}
              onChange={(event) => setPublishType(event.target.value)}
            >
              <option value="draft">Salvar como rascunho</option>
              <option value="schedule">Agendar publicação</option>
              <option value="now">Publicar agora</option>
            </select>
            <input
              className={input}
              type="datetime-local"
              value={publishDate}
              onChange={(event) => setPublishDate(event.target.value)}
              disabled={publishType === 'now'}
            />
            <textarea
              className={`${input} min-h-24`}
              value={publishContent}
              onChange={(event) => setPublishContent(event.target.value)}
              placeholder="Legenda"
            />
            <Button type="submit" disabled={loading || !readyVariants.length}>
              {loading ? 'Enviando…' : 'Enviar para publicação'}
            </Button>
          </div>
        </form>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="soft"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ← Editar brief
        </Button>
        <span className="self-center text-sm text-black/45">
          {selectedProject
            ? `${selectedProject.variants?.length || 0} versões no projeto`
            : 'Aguardando projeto'}
        </span>
      </div>
    </div>
  );
}
