'use client';

import Link from 'next/link';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { AgentChat } from '@gitroom/frontend/components/agents/agent.chat';
import { PropertiesContext } from '@gitroom/frontend/components/agents/agent';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { HowToUse } from '@gitroom/frontend/components/chat-studio/how-to-use.component';

type Thread = { id: string; title?: string };
type Project = {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  updatedAt?: string;
  scripts?: any[];
  variants?: any[];
  assets?: any[];
};
type Job = {
  id: string;
  status: string;
  type?: string;
  progress?: number;
  error?: string;
};
type Idea = {
  id: string;
  title: string;
  hook?: string;
  status?: string;
  score?: number;
};
type Carousel = {
  id: string;
  title: string;
  status?: string;
  approvalStatus?: string;
  slides?: any;
};
type ThreadArtifact = {
  id: string;
  type: string;
  title?: string;
  createdAt?: string;
};
type DurableArtifact = {
  id: string;
  threadId?: string;
  type: string;
  title: string;
  status?: string;
  currentVersion?: number;
  content?: unknown;
  archivedAt?: string | null;
  versions?: Array<{ version: number }>;
};

const panelButton =
  'rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/10';

export function ChatStudioPage() {
  const apiFetch = useFetch();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const currentId = params?.id || 'new';
  const [threads, setThreads] = useState<Thread[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [threadArtifacts, setThreadArtifacts] = useState<ThreadArtifact[]>([]);
  const [durableArtifacts, setDurableArtifacts] = useState<DurableArtifact[]>([]);
  const [panel, setPanel] = useState<'artifact' | 'resources'>(
    searchParams.get('panel') === 'resources' ? 'resources' : 'artifact'
  );
  const [mobilePanel, setMobilePanel] = useState<
    'none' | 'conversations' | 'artifact' | 'resources'
  >('none');
  const [howToUseOpen, setHowToUseOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const activeJobs = useMemo(
    () =>
      jobs.filter((job) =>
        ['QUEUED', 'RESERVED', 'RUNNING', 'RETRYABLE'].includes(
          String(job.status).toUpperCase()
        )
      ),
    [jobs]
  );
  const activeProject = projects[0];
  const showProjects = searchParams.get('view') === 'projects';
  const currentThread = threads.find((thread) => thread.id === currentId);

  const loadWorkspace = useCallback(async () => {
    const read = async (path: string) => {
      try {
        const response = await apiFetch(path);
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    };

    try {
      const [
        threadData,
        projectData,
        jobData,
        channelData,
        ideaData,
        carouselData,
        threadContextData,
        artifactData,
      ] = await Promise.all([
        read('/copilot/list'),
        read('/creative/projects'),
        read('/creative/jobs'),
        read('/integrations/list'),
        read('/content-ideas/'),
        read('/carousel-projects/'),
        currentId === 'new' ? Promise.resolve(null) : read(`/copilot/${currentId}/context`),
        read(
          currentId === 'new'
            ? '/studio/artifacts'
            : `/studio/artifacts?threadId=${encodeURIComponent(currentId)}&includeArchived=true`
        ),
      ]);
      if (threadData) {
        setThreads(
          Array.isArray(threadData?.threads) ? threadData.threads : []
        );
      }
      if (projectData)
        setProjects(Array.isArray(projectData) ? projectData : []);
      if (jobData) setJobs(Array.isArray(jobData) ? jobData : []);
      if (ideaData) setIdeas(Array.isArray(ideaData) ? ideaData : []);
      if (carouselData) {
        setCarousels(Array.isArray(carouselData) ? carouselData : []);
      }
      if (threadContextData) {
        const artifacts = threadContextData?.metadata?.studioArtifacts;
        setThreadArtifacts(Array.isArray(artifacts) ? artifacts : []);
      } else if (currentId === 'new') {
        setThreadArtifacts([]);
      }
      if (artifactData) {
        setDurableArtifacts(
          Array.isArray(artifactData) ? artifactData : artifactData?.artifacts || []
        );
      }
      if (channelData) {
        setIntegrations(
          Array.isArray(channelData)
            ? channelData
            : channelData?.integrations || []
        );
      }
    } catch {
      // The chat can still be used when optional workspace panels fail to load.
    } finally {
      setLoading(false);
    }
  }, [apiFetch, currentId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace, pathname, currentId]);

  useEffect(() => {
    if (!activeJobs.length) return;
    const timer = window.setInterval(() => loadWorkspace(), 5000);
    return () => window.clearInterval(timer);
  }, [activeJobs.length, loadWorkspace]);

  function openPrompt(prompt: string) {
    const target = currentId && currentId !== 'new' ? currentId : 'new';
    router.push(`/studio/${target}?prompt=${encodeURIComponent(prompt)}`);
  }

  async function archiveCurrentThread() {
    if (currentId === 'new') return;
    try {
      const response = await apiFetch(`/copilot/${currentId}/archive`, {
        method: 'POST',
      });
      if (response.ok) router.push('/studio/new');
    } catch {
      // Keep the conversation open if archiving is temporarily unavailable.
    }
  }

  async function archiveArtifact(id: string) {
    try {
      const response = await apiFetch(`/studio/artifacts/${id}/archive`, {
        method: 'POST',
      });
      if (response.ok) await loadWorkspace();
    } catch {
      // Keep the artifact available if the archive request fails.
    }
  }

  return (
    <PropertiesContext.Provider value={{ properties: integrations } as any}>
      <main className="cf-studio flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        <StudioSidebar
          threads={threads}
          currentId={currentId}
          loading={loading}
          onNew={() => router.push('/studio/new')}
        />

        <section className="cf-studio__surface flex min-w-0 flex-1 flex-col">
          <header className="cf-studio__border flex h-[68px] shrink-0 items-center justify-between border-b px-5 md:px-7">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-white/45">
                <span className="h-2 w-2 rounded-full bg-[var(--cf-lime)]" />
                ContentFlow Studio
              </div>
              <h1 className="mt-1 truncate text-base font-semibold">
                {currentThread?.title || 'Nova criação'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHowToUseOpen(true)}
                  className="cf-studio__help-button inline-flex rounded-xl border px-2 py-2 text-xs font-semibold transition md:px-3"
                >
                  <span aria-hidden="true">?</span>
                  <span className="hidden sm:inline">Como usar</span>
              </button>
              <button
                type="button"
                onClick={() => setMobilePanel('conversations')}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 lg:hidden"
              >
                Conversas
              </button>
              <button
                type="button"
                onClick={() => setMobilePanel('artifact')}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 xl:hidden"
              >
                Artefato
              </button>
              {currentId !== 'new' && (
                <button
                  type="button"
                  onClick={archiveCurrentThread}
                  className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/45 transition hover:border-white/25 hover:text-white md:block"
                >
                  Arquivar
                </button>
              )}
              <Link
                href="/creative/advanced"
                className="hidden rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 transition hover:border-white/25 hover:text-white md:block"
              >
                Laboratório avançado
              </Link>
              <span className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/55">
                {activeJobs.length
                  ? `${activeJobs.length} gerando`
                  : 'Pronto para criar'}
              </span>
            </div>
          </header>

          <div className="min-h-0 flex-1 p-2 md:p-4">
            <div className="cf-studio__border cf-studio__elevated h-full overflow-hidden rounded-2xl border shadow-2xl">
              <AgentChat />
            </div>
          </div>
        </section>

        <StudioPanel
          panel={panel}
          setPanel={setPanel}
          projects={projects}
          jobs={activeJobs}
          activeProject={activeProject}
          integrations={integrations}
          onPrompt={openPrompt}
          showProjects={showProjects}
          ideas={ideas}
          carousels={carousels}
          threadArtifacts={threadArtifacts}
          durableArtifacts={durableArtifacts}
          onArchiveArtifact={archiveArtifact}
        />

        {mobilePanel !== 'none' && (
          <div className="fixed inset-0 z-50 xl:hidden">
            <button
              type="button"
              aria-label="Fechar painel"
              onClick={() => setMobilePanel('none')}
              className="absolute inset-0 bg-black/70"
            />
            <div className="cf-studio__border cf-studio__surface absolute inset-y-0 end-0 w-full max-w-[380px] overflow-x-hidden overflow-y-auto border-l shadow-2xl">
              {mobilePanel === 'conversations' ? (
                <MobileConversations
                  threads={threads}
                  currentId={currentId}
                  onNew={() => {
                    setMobilePanel('none');
                    router.push('/studio/new');
                  }}
                  onClose={() => setMobilePanel('none')}
                />
              ) : (
                <StudioPanel
                  forceVisible
                  panel={mobilePanel === 'resources' ? 'resources' : 'artifact'}
                  setPanel={(value) => setMobilePanel(value)}
                  projects={projects}
                  jobs={activeJobs}
                  activeProject={activeProject}
                  integrations={integrations}
                  onPrompt={(prompt) => {
                    setMobilePanel('none');
                    openPrompt(prompt);
                  }}
                  showProjects={showProjects}
                  ideas={ideas}
                  carousels={carousels}
                  threadArtifacts={threadArtifacts}
                  durableArtifacts={durableArtifacts}
                  onArchiveArtifact={archiveArtifact}
                />
              )}
            </div>
          </div>
        )}
        <HowToUse
          open={howToUseOpen}
          onClose={() => setHowToUseOpen(false)}
          onUseExample={(prompt) => {
            setHowToUseOpen(false);
            openPrompt(prompt);
          }}
        />
      </main>
    </PropertiesContext.Provider>
  );
}

function StudioSidebar({
  threads,
  currentId,
  loading,
  onNew,
}: {
  threads: Thread[];
  currentId: string;
  loading: boolean;
  onNew: () => void;
}) {
  return (
    <aside className="cf-studio__border cf-studio hidden w-[260px] shrink-0 flex-col border-r lg:flex">
      <div className="cf-studio__border border-b p-4">
        <Link
          href="/"
          className="flex items-center gap-3 px-2 py-2 text-sm font-semibold"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-600 text-black">
            ✦
          </span>
          ContentFlow
        </Link>
        <button
          type="button"
          onClick={onNew}
          className="cf-studio__accent mt-5 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition"
        >
          Nova conversa <span className="text-lg">＋</span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
          Conversas recentes
        </div>
        {loading && !threads.length && (
          <div className="space-y-2 px-2">
            <div className="h-9 animate-pulse rounded-xl bg-white/5" />
            <div className="h-9 animate-pulse rounded-xl bg-white/5" />
          </div>
        )}
        {!loading && !threads.length && (
          <div className="px-2 py-6 text-sm leading-6 text-white/40">
            Suas criações aparecerão aqui.
          </div>
        )}
        <div className="space-y-1">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/studio/${thread.id}`}
              className={`block truncate rounded-xl px-3 py-3 text-sm transition ${
                thread.id === currentId
                  ? 'bg-white/10 font-semibold text-white'
                  : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`}
            >
              {thread.title || 'Nova conversa'}
            </Link>
          ))}
        </div>
      </div>
      <div className="cf-studio__border border-t p-4 text-xs leading-5 text-white/35">
        Converse para criar ideias, carrosséis, imagens, vídeos e publicações.
      </div>
    </aside>
  );
}

function MobileConversations({
  threads,
  currentId,
  onNew,
  onClose,
}: {
  threads: Thread[];
  currentId: string;
  onNew: () => void;
  onClose: () => void;
}) {
  return (
    <div className="cf-studio min-h-full p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-white/35">
            ContentFlow Studio
          </div>
          <h2 className="mt-2 text-2xl font-semibold">Conversas</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white/65"
        >
          Fechar
        </button>
      </div>
      <button
        type="button"
        onClick={onNew}
        className="cf-studio__accent mt-6 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold"
      >
        Nova conversa <span className="text-lg">＋</span>
      </button>
      <div className="mt-7 space-y-1">
        {threads.map((thread) => (
          <Link
            key={thread.id}
            href={`/studio/${thread.id}`}
            onClick={onClose}
            className={`block truncate rounded-xl px-3 py-3 text-sm ${
              thread.id === currentId
                ? 'bg-white/10 font-semibold'
                : 'text-white/55 hover:bg-white/5 hover:text-white'
            }`}
          >
            {thread.title || 'Nova conversa'}
          </Link>
        ))}
        {!threads.length && (
          <div className="py-8 text-sm leading-6 text-white/40">
            Nenhuma conversa criada ainda.
          </div>
        )}
      </div>
    </div>
  );
}

function StudioPanel({
  forceVisible = false,
  panel,
  setPanel,
  projects,
  jobs,
  activeProject,
  integrations,
  onPrompt,
  showProjects,
  ideas,
  carousels,
  threadArtifacts,
  durableArtifacts,
  onArchiveArtifact,
}: {
  forceVisible?: boolean;
  panel: 'artifact' | 'resources';
  setPanel: (value: 'artifact' | 'resources') => void;
  projects: Project[];
  jobs: Job[];
  activeProject?: Project;
  integrations: any[];
  onPrompt: (prompt: string) => void;
  showProjects: boolean;
  ideas: Idea[];
  carousels: Carousel[];
  threadArtifacts: ThreadArtifact[];
  durableArtifacts: DurableArtifact[];
  onArchiveArtifact: (id: string) => void;
}) {
  return (
    <aside
      className={`cf-studio-panel cf-studio__surface cf-studio__border min-w-0 overflow-hidden ${
        forceVisible ? 'flex min-h-full' : 'hidden xl:flex'
        } w-[360px] shrink-0 flex-col border-l`}
    >
      <div className="flex h-[68px] shrink-0 items-center gap-1 border-b border-white/10 px-4">
        {[
          ['artifact', 'Artefato'],
          ['resources', 'Recursos'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPanel(id as 'artifact' | 'resources')}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              panel === id
                ? 'bg-white/10 text-white'
                : 'text-white/45 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-5">
        {panel === 'resources' ? (
          <ResourcePanel
            integrations={integrations}
            projects={projects}
            ideas={ideas}
            carousels={carousels}
          />
        ) : (
          <ArtifactPanel
            activeProject={activeProject}
            projects={projects}
            jobs={jobs}
            onPrompt={onPrompt}
            showProjects={showProjects}
            ideas={ideas}
            carousels={carousels}
            threadArtifacts={threadArtifacts}
            durableArtifacts={durableArtifacts}
            onArchiveArtifact={onArchiveArtifact}
          />
        )}
      </div>
    </aside>
  );
}

function ArtifactPanel({
  activeProject,
  projects,
  jobs,
  onPrompt,
  showProjects,
  ideas,
  carousels,
  threadArtifacts,
  durableArtifacts,
  onArchiveArtifact,
}: {
  activeProject?: Project;
  projects: Project[];
  jobs: Job[];
  onPrompt: (prompt: string) => void;
  showProjects: boolean;
  ideas: Idea[];
  carousels: Carousel[];
  threadArtifacts: ThreadArtifact[];
  durableArtifacts: DurableArtifact[];
  onArchiveArtifact: (id: string) => void;
}) {
  const latestVariant = activeProject?.variants?.slice(-1)[0];
  const outputUrl = latestVariant?.output?.url || latestVariant?.url;
  const isVideo = String(outputUrl || '').match(/\.(mp4|mov|webm)(\?|$)/i);

  return (
    <div className="space-y-5">
      {durableArtifacts.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
                Artefatos salvos
              </div>
              <p className="mt-1 text-xs text-white/40">
                Rascunhos, versões e entregas que podem voltar para o chat.
              </p>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/45">
              {durableArtifacts.length}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {durableArtifacts.slice(0, 8).map((artifact) => (
              <div key={artifact.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/85">
                      {artifact.title}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-wide text-white/35">
                      {artifact.type} · v{artifact.currentVersion || 1} · {artifact.status || 'DRAFT'}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-white/35">
                    {artifact.versions?.length || artifact.currentVersion || 1} versÃµes
                  </span>
                </div>
                <div className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">
                  {typeof artifact.content === 'string'
                    ? artifact.content
                    : JSON.stringify(artifact.content || {}).slice(0, 180)}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onPrompt(`Revise o artefato "${artifact.title}" e mostre suas versões.`)}
                    className="rounded-lg bg-cyan-400 px-2.5 py-1.5 text-[11px] font-semibold text-black"
                  >
                    Revisar no chat
                  </button>
                  {!artifact.archivedAt && artifact.status !== 'ARCHIVED' && (
                    <button
                      type="button"
                      onClick={() => onArchiveArtifact(artifact.id)}
                      className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/55 hover:text-white"
                    >
                      Arquivar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {threadArtifacts.length > 0 && (
        <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/55">
            Nesta conversa
          </div>
          <div className="mt-3 space-y-2">
            {threadArtifacts.slice(-5).reverse().map((artifact) => (
              <div key={`${artifact.type}-${artifact.id}`} className="flex items-center gap-3 rounded-xl bg-black/15 px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs text-cyan-100">
                  {artifact.type === 'CAROUSEL' ? '▦' : '✦'}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white/85">
                    {artifact.title || 'Artefato salvo'}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-white/35">
                    {artifact.type === 'CAROUSEL' ? 'Carrossel' : 'Ideia'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
          Seu espaço de criação
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          O que vamos criar?
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/45">
          Comece escrevendo no chat ou escolha um ponto de partida.
        </p>
      </div>

      <div className="grid gap-2">
        <PromptCard
          icon="✦"
          title="Gerar ideias"
          description="Encontre ângulos para o próximo conteúdo."
          onClick={() =>
            onPrompt('Me dê 10 ideias de conteúdo para a minha marca.')
          }
        />
        <PromptCard
          icon="▤"
          title="Criar carrossel"
          description="Transforme uma ideia em slides prontos."
          onClick={() =>
            onPrompt(
              'Crie um carrossel de 7 slides sobre um tema relevante para minha marca.'
            )
          }
        />
        <PromptCard
          icon="▶"
          title="Criar vídeo"
          description="Roteiro, cenas, voz e render em um fluxo."
          onClick={() =>
            onPrompt(
              'Crie um vídeo UGC vertical de 30 segundos para apresentar meu produto.'
            )
          }
        />
        <PromptCard
          icon="□"
          title="Criar imagem"
          description="Visual de campanha com sua identidade."
          onClick={() =>
            onPrompt(
              'Crie uma imagem de anúncio usando minha marca e meu produto.'
            )
          }
        />
      </div>

      <div className="border-t border-white/10 pt-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
          Continuar trabalhando
        </div>
        <div className="grid gap-2">
          <PromptCard
            compact
            icon="↗"
            title="Criar variações"
            description="Adapte este conteúdo para outros canais."
            onClick={() =>
              onPrompt(
                'Crie variações deste conteúdo para Instagram, TikTok e LinkedIn.'
              )
            }
          />
          <PromptCard
            compact
            icon="✓"
            title="Preparar publicação"
            description="Revise e prepare o conteúdo para os canais."
            onClick={() =>
              onPrompt(
                'Prepare este conteúdo para publicação e mostre os canais disponíveis.'
              )
            }
          />
          <PromptCard
            compact
            icon="↓"
            title="Exportar resultado"
            description="Monte um pacote com os arquivos e textos."
            onClick={() => onPrompt('Exporte este conteúdo com todos os arquivos, textos e versões.')}
          />
        </div>
      </div>

      {showProjects && projects.length > 0 && (
        <section>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            Projetos recentes
          </div>
          <div className="space-y-2">
            {projects.slice(0, 8).map((project) => (
              <div
                key={project.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold">
                    {project.name}
                  </span>
                  <Status status={project.status} />
                </div>
                <div className="mt-1 text-xs text-white/35">
                  {(project.variants?.length || 0) +
                    (project.scripts?.length || 0)}{' '}
                  artefatos
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(ideas.length > 0 || carousels.length > 0) && (
        <section>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            Artefatos recentes
          </div>
          <div className="space-y-2">
            {ideas.slice(0, 2).map((idea) => (
              <div
                key={idea.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                    Ideia
                  </span>
                  <Status status={idea.status} />
                </div>
                <div className="mt-2 line-clamp-2 text-sm font-semibold">
                  {idea.title}
                </div>
                {idea.hook && (
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/40">
                    {idea.hook}
                  </div>
                )}
              </div>
            ))}
            {carousels.slice(0, 2).map((carousel) => (
              <div
                key={carousel.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                    Carrossel
                  </span>
                  <Status status={carousel.approvalStatus || carousel.status} />
                </div>
                <div className="mt-2 line-clamp-2 text-sm font-semibold">
                  {carousel.title}
                </div>
                <div className="mt-1 text-xs text-white/40">
                  {Array.isArray(carousel.slides) ? carousel.slides.length : 0}{' '}
                  slides
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {jobs.length > 0 && (
        <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Gerações em andamento</span>
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
          </div>
          <div className="mt-3 space-y-3">
            {jobs.slice(0, 3).map((job) => (
              <div key={job.id} className="rounded-xl bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-white/65">
                    {job.type || 'Criativo'}
                  </span>
                  <span className="text-cyan-200">{job.progress || 0}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan-300 transition-all"
                    style={{
                      width: `${Math.max(
                        5,
                        Math.min(100, job.progress || 5)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeProject ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.14em] text-white/35">
                Projeto recente
              </div>
              <h3 className="mt-2 truncate font-semibold">
                {activeProject.name}
              </h3>
            </div>
            <Status status={activeProject.status} />
          </div>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/45">
            {activeProject.objective ||
              'Projeto criado a partir de uma conversa.'}
          </p>
          <div className="mt-4 flex gap-2 text-xs text-white/40">
            <span>{activeProject.scripts?.length || 0} roteiros</span>
            <span>{activeProject.variants?.length || 0} versões</span>
            <span>{activeProject.assets?.length || 0} assets</span>
          </div>
          {outputUrl && (
            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/20">
              {isVideo ? (
                <video
                  controls
                  className="aspect-video w-full object-cover"
                  src={outputUrl}
                />
              ) : (
                <img
                  src={outputUrl}
                  alt="Último criativo gerado"
                  className="max-h-52 w-full object-contain"
                />
              )}
            </div>
          )}
        </section>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm leading-6 text-white/40">
          O primeiro artefato criado pelo chat aparecerá neste painel.
        </div>
      ) : null}
    </div>
  );
}

function PromptCard({
  icon,
  title,
  description,
  onClick,
  compact = false,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${panelButton} group flex items-center gap-3 border border-white/10 bg-white/[0.03] ${compact ? 'py-2' : ''}`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200 transition group-hover:bg-cyan-300 group-hover:text-black ${compact ? 'h-8 w-8' : 'h-9 w-9'}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-white">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-white/40">
          {description}
        </span>
      </span>
      <span className="ml-auto text-white/25 transition group-hover:translate-x-1 group-hover:text-white">
        →
      </span>
    </button>
  );
}

function ResourcePanel({
  integrations,
  projects,
  ideas,
  carousels,
}: {
  integrations: any[];
  projects: Project[];
  ideas: Idea[];
  carousels: Carousel[];
}) {
  const resources: Array<[string, string, string]> = [
    ['Ideias', `${ideas.length} ideias salvas`, '/ideas'],
    [
      'Carrosséis',
      `${carousels.length} projetos salvos`,
      '/creative?view=projects',
    ],
    [
      'Produtos e assets',
      `${projects.reduce(
        (sum, project) => sum + (project.assets?.length || 0),
        0
      )} disponíveis`,
      '/media',
    ],
    ['Brand DNA', 'Use sua identidade automaticamente', '/brands'],
    [
      'Canais conectados',
      `${integrations.length} canais disponíveis`,
      '/channels',
    ],
    [
      'Projetos',
      `${projects.length} projetos recentes`,
      '/studio/new?view=projects',
    ],
  ];
  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
          Contexto da IA
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Recursos</h2>
        <p className="mt-2 text-sm leading-6 text-white/45">
          A IA consulta estes recursos quando você disser “use minha marca” ou
          “use meu produto”.
        </p>
      </div>
      <div className="space-y-2">
        {resources.map(([title, description, href]) => (
          <Link
            key={title}
            href={href}
            className={`${panelButton} block border border-white/10 bg-white/[0.03]`}
          >
            <div className="font-semibold">{title}</div>
            <div className="mt-1 text-xs text-white/40">{description}</div>
          </Link>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/45">
        Você pode anexar uma foto, vídeo, PDF ou link diretamente no composer do
        chat.
      </div>
    </div>
  );
}

function Status({ status }: { status?: string }) {
  const value = String(status || 'DRAFT').toUpperCase();
  const label: Record<string, string> = {
    DRAFT: 'Rascunho',
    RUNNING: 'Gerando',
    SUCCEEDED: 'Pronto',
    READY: 'Pronto',
    FAILED: 'Falhou',
  };
  return (
    <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/55">
      {label[value] || value}
    </span>
  );
}

export function ChatStudioPlaceholder({ children }: { children?: ReactNode }) {
  return children || null;
}
