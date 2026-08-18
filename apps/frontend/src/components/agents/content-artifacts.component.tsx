'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useCopilotChat } from '@copilotkit/react-core';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  CarouselDesignEditor,
  createDefaultDesign,
  designBackground,
  effectiveDesign,
  mergeDesign,
  normalizeDesign,
  removeSlideOverride,
  type DesignElement,
  type DesignScope,
  type DesignSpec,
} from './carousel-design-editor.component';
import { CreationOptionsCard } from './creation-options.component';
import { artifactSignature } from './content-presentation-payload';

export type { DesignSpec, DesignElement } from './carousel-design-editor.component';

export type ContentIdea = {
  id?: string;
  title: string;
  hook?: string;
  audiencePain?: string;
  angle?: string;
  format?: string;
  platform?: string;
  objective?: string;
  suggestedCta?: string;
  suggestedCaption?: string;
};

export type CarouselPreviewSlide = {
  id?: string;
  index?: number;
  role?: string;
  headline: string;
  body?: string;
  highlight?: string;
  cta?: string;
  visualDirection?: string;
  layout?: string;
  imagePrompt?: string;
  imageUrl?: string;
  image?: { url?: string; b64_json?: string };
  status?: string;
};

type CreativeJobState = {
  id?: string;
  status?: string;
  progress?: number;
  output?: { url?: string };
  error?: string;
};

type ActionProps = {
  status?: string;
  respond?: (value: Record<string, unknown>) => void | Promise<void>;
  onAction?: (value: Record<string, unknown>) => void | Promise<void>;
};

function useArtifactResponder(
  respond?: (value: Record<string, unknown>) => void | Promise<void>,
  onAction?: (value: Record<string, unknown>) => void | Promise<void>
) {
  return async (value: Record<string, unknown>) => {
    // The explicit [--content-action--] message is the only continuation path
    // for Studio artifacts. Resolving the same click with `respond` as well
    // creates a second model turn, which can render the same artifact again or
    // start a duplicate copy workflow. `respond` remains available for the
    // legacy render-and-wait path when no action dispatcher is mounted.
    if (onAction) {
      await onAction(value);
      return;
    }
    if (respond) {
      await respond(value);
    }
  };
}

/**
 * CopilotKit drives `status` through inProgress -> executing -> complete, where
 * "executing" is the window in which the tool call is waiting for the user's
 * answer (it is the only status that carries `respond`). Cards rendered from
 * raw assistant text get no status at all and are always interactive.
 */
const isAwaitingUser = (status?: string) => status === undefined || status === 'executing';

const toDataUrl = (value?: string) => value || '';

// The shared fetch wrapper returns a promise that never resolves on some
// auth/billing responses (to freeze the page during a redirect), and a backend
// that is restarting can accept the TCP connection but never answer. Either
// leaves the "Gerando imagens…" button spinning forever. Racing every
// generation request against a timeout guarantees the flow always ends in a
// success or a clear, retriable error instead of an infinite spinner.
const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} demorou demais e foi interrompida. Tente novamente.`)),
      ms
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const readableTextOn = (color: string) => {
  const hex = color.replace('#', '').trim();
  const normalized = hex.length === 3 ? hex.split('').map((value) => value + value).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return '#111510';
  const channels = [0, 2, 4].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const luminance = channels.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.54 ? '#111510' : '#FFFFFF';
};

const safePaddingValue = (value: DesignSpec['layout']['safePadding']) => ({
  compact: '16px',
  balanced: '22px',
  airy: '28px',
}[value] || '22px');

const typographyScaleValue = (value: DesignSpec['typography']['scale']) => ({
  compact: 0.9,
  balanced: 1,
  expressive: 1.14,
}[value] || 1);

export function ContentIdeasCard({ args, status, respond, onAction }: ActionProps & { args: Record<string, any> }) {
  const ideas = useMemo<ContentIdea[]>(
    () => (Array.isArray(args.ideas) ? args.ideas : []).filter((idea) => idea?.title),
    [args.ideas]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'copy' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [configuringIdea, setConfiguringIdea] = useState<{ id: string; idea: ContentIdea } | null>(null);
  // Lock the actions while the args are still streaming in, and again once the
  // user has picked an idea and the follow-up request is on its way.
  const isBusy = !isAwaitingUser(status) || pendingAction !== null || configuringIdea !== null;
  const sendAction = useArtifactResponder(respond, onAction);
  // Same fix as the action-status banner in agent.chat.tsx ("stops the
  // spinner appears then silently vanishes behaviour"): a blind clock cannot
  // tell a slow-but-working generation from a genuinely stuck one. A full
  // carousel copy is 7 slides of headline/body/CTA/visual direction/layout/
  // imagePrompt each - a heavier generation than a plain chat reply - and a
  // fixed 45s timer fired false negatives on legitimately slow (but
  // eventually successful) runs. Track the real agent run via isLoading
  // instead: only decide "nothing came back" once the run that started after
  // clicking Gerar Copy has actually finished.
  const { isLoading } = useCopilotChat();
  const sawRunLoading = useRef(false);
  useEffect(() => {
    if (!pendingAction) {
      sawRunLoading.current = false;
      return;
    }
    if (isLoading) {
      sawRunLoading.current = true;
      return;
    }
    if (!sawRunLoading.current) return;
    // isLoading just flipped back to false after we watched this run go —
    // give the new artifact a brief moment to mount before giving up on it.
    const settle = window.setTimeout(() => {
      setPendingAction(null);
      setActionError(
        'Não recebi a copy completa desta vez. Tente novamente — às vezes a segunda tentativa funciona.'
      );
    }, 800);
    return () => window.clearTimeout(settle);
  }, [pendingAction, isLoading]);
  // Backstop only, same role as the 90s backstop in agent.chat.tsx: covers a
  // dropped connection or a run that never flips isLoading back at all. Not
  // the primary signal, so it can afford to be generous.
  useEffect(() => {
    if (!pendingAction) return;
    const backstop = window.setTimeout(() => {
      setPendingAction(null);
      setActionError(
        'Não recebi a copy completa desta vez. Tente novamente — às vezes a segunda tentativa funciona.'
      );
    }, 120000);
    return () => window.clearTimeout(backstop);
  }, [pendingAction]);
  const optionsArgs = useMemo(
    () => configuringIdea ? {
      creationType: 'carousel',
      title: 'Defina a estrutura da sua copy',
      brief: 'Escolha a plataforma, o formato, o tom, o estilo e a quantidade de slides. Depois eu gero a copy completa para você revisar.',
      suggestedPlatform: configuringIdea.idea.platform,
      suggestedAspectRatio: configuringIdea.idea.platform?.toLowerCase().includes('linkedin') ? '4:5' : '4:5',
      suggestedTone: 'direto',
      suggestedStyle: 'minimalista',
      suggestedSlideCount: 7,
    } : null,
    [configuringIdea]
  );

  return (
    <section
      className={`cf-content-artifact cf-content-ideas ${pendingAction ? 'is-processing' : ''}`}
      aria-label="Ideias prontas"
      aria-busy={pendingAction ? 'true' : 'false'}
    >
      <header className="cf-content-artifact__header">
        <div>
          <span className="cf-content-artifact__eyebrow">Ideias prontas para usar</span>
          <h3>{args.title || `${ideas.length || 10} ideias para sua marca`}</h3>
          <p>Escolha uma ideia e transforme-a em uma peça completa sem precisar reescrever o briefing.</p>
        </div>
        <span className="cf-content-artifact__count">{ideas.length}</span>
      </header>

      <div className="cf-content-ideas__grid">
        {ideas.map((idea, index) => {
          const id = idea.id || `${index}-${idea.title}`;
          const selected = selectedId === id;
          return (
            <article className={`cf-content-idea ${selected ? 'is-selected' : ''}`} key={id}>
              <div className="cf-content-idea__top">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <small>{[idea.format, idea.platform].filter(Boolean).join(' · ') || 'Conteúdo'}</small>
              </div>
              <h4>{idea.title}</h4>
              {idea.hook && <p className="cf-content-idea__hook">“{idea.hook}”</p>}
              {idea.angle && <p>{idea.angle}</p>}
              <div className="cf-content-idea__meta">
                {idea.objective && <span>{idea.objective}</span>}
                {idea.suggestedCta && <span>CTA: {idea.suggestedCta}</span>}
              </div>
              <div className="cf-content-idea__actions">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setSelectedId(id);
                    setConfiguringIdea({ id, idea });
                  }}
                >
                  Gerar Copy
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {configuringIdea && optionsArgs && (
        <CreationOptionsCard
          args={optionsArgs}
          respond={async (value) => {
            setConfiguringIdea(null);
            if (!value?.confirmed) return;
            setActionError(null);
            setPendingAction('copy');
            try {
              await sendAction({
                action: 'transform-carousel',
                selectedIdea: configuringIdea.idea,
                selectedIdeaId: configuringIdea.id,
                creationType: 'carousel',
                options: value.options,
                confirmed: true,
              });
            } catch {
              setPendingAction(null);
              setActionError(
                'Não consegui iniciar a geração da copy agora. Tente novamente em instantes.'
              );
            }
          }}
        />
      )}
      {pendingAction && (
        <p className="cf-content-artifact__pending" role="status">
          Gerando a copy completa com as opções escolhidas…
        </p>
      )}
      {actionError && (
        <p className="cf-content-artifact__error" role="alert">
          {actionError}
        </p>
      )}
    </section>
  );
}

export function CarouselPreviewCard({ args, status, respond, onAction }: ActionProps & { args: Record<string, any> }) {
  const slides = useMemo<CarouselPreviewSlide[]>(
    () => (Array.isArray(args.slides) ? args.slides : []).filter((slide) => slide?.headline),
    [args.slides]
  );
  const [active, setActive] = useState(0);
  const [draftSlides, setDraftSlides] = useState<CarouselPreviewSlide[]>(slides);
  const [design, setDesign] = useState<DesignSpec>(() => normalizeDesign(args.designSpec, args.aspectRatio || '4:5'));
  const [designOpen, setDesignOpen] = useState(false);
  const [scope, setScope] = useState<DesignScope>('all');
  const [submitting, setSubmitting] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [designDirty, setDesignDirty] = useState(false);
  // Reusing the same Creative Engine project across "generate images" clicks
  // (instead of the backend creating a new one every time) is what lets the
  // server's content-hash idempotency actually kick in: that hash includes
  // projectId, so a fresh project on every click made an unmodified slide
  // look "new" and billed it again.
  const [projectId, setProjectId] = useState<string | undefined>(args.projectId);
  // What prompt/copy/design each slide was last generated from. A slide whose
  // fingerprint still matches its current inputs is skipped from the request
  // entirely — editing one slide out of five should not re-send the other four.
  const [generatedFingerprints, setGeneratedFingerprints] = useState<Record<string, string>>({});
  // Full-size preview opened when a generated slide image is clicked.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  // Live count of how many slide images finished, so the user always sees
  // progress advancing instead of a button that looks frozen.
  const [genProgress, setGenProgress] = useState<{ done: number; total: number } | null>(null);
  // Confirmation shown after the generated images are copied to the media library.
  const [savedToMedia, setSavedToMedia] = useState(false);
  const isBusy = !isAwaitingUser(status) || submitting;
  const sendAction = useArtifactResponder(respond, onAction);
  const apiFetch = useFetch();
  // Stable identifier for this specific carousel card, derived from its
  // persisted payload (slide headlines). Survives reloads of the chat thread,
  // so it's the key under which generated images are saved and re-loaded from
  // the server. The backend hashes it before storing.
  const carouselCardKey = artifactSignature('carousel', args);

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxUrl(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxUrl]);

  useEffect(() => {
    // CopilotKit re-invokes this render on any background chat activity (new
    // messages, thread polling), each time with a structurally-equal but
    // referentially-new `args.slides`. Overwriting draftSlides unconditionally
    // discarded locally-generated imageUrl/status on the very next unrelated
    // re-render — a "gerar imagens" click could succeed and then vanish from
    // the screen seconds later with no error. Carry over imageUrl/status by
    // slide id whenever the slide's actual content (what was sent to the
    // provider) is unchanged; only a real content change resets it.
    setDraftSlides((current) => {
      if (!current.length) return slides;
      const previousByKey = new Map(current.map((slide, index) => [slide.id || String(slide.index ?? index), slide]));
      return slides.map((incoming, index) => {
        const key = incoming.id || String(incoming.index ?? index);
        const previous = previousByKey.get(key);
        if (!previous) return incoming;
        const sameContent =
          previous.headline === incoming.headline &&
          previous.body === incoming.body &&
          previous.cta === incoming.cta &&
          previous.imagePrompt === incoming.imagePrompt;
        return sameContent ? { ...incoming, imageUrl: previous.imageUrl, image: previous.image, status: previous.status } : incoming;
      });
    });
    setActive((current) => Math.min(current, Math.max(slides.length - 1, 0)));
  }, [args.slides, slides]);

  const incomingDesignKey = useMemo(
    () => JSON.stringify({ aspectRatio: args.aspectRatio || '4:5', designSpec: args.designSpec || null }),
    [args.aspectRatio, args.designSpec]
  );

  useEffect(() => {
    setDesign(normalizeDesign(args.designSpec, args.aspectRatio || '4:5'));
    setDesignDirty(false);
  }, [incomingDesignKey]);

  const updateActiveSlide = (field: 'headline' | 'body' | 'cta', value: string) => {
    setDraftSlides((current) => current.map((slide, index) => (index === active ? { ...slide, [field]: value } : slide)));
  };

  // The per-slide art-direction prompt, edited in the design panel. Written to
  // imagePrompt (which the generation payload prefers over visualDirection) so
  // editing it immediately marks the slide for regeneration via the fingerprint.
  const updateActiveSlideImagePrompt = (value: string) => {
    setDraftSlides((current) => current.map((slide, index) => (index === active ? { ...slide, imagePrompt: value } : slide)));
  };

  const activeSlide = draftSlides[active];
  const activeDesign = activeSlide ? effectiveDesign(design, activeSlide, active) : design;
  const draftCarousel = { ...args, slides: draftSlides, designSpec: design };

  const updateDesign = (patch: Partial<DesignSpec>) => {
    setDesignDirty(true);
    setDesign((current) => {
      if (scope === 'all' || !activeSlide) return mergeDesign(current, patch);
      const key = activeSlide.id || String(activeSlide.index ?? active + 1);
      const previous = current.slideOverrides?.[key] || {};
      const nextOverride = mergeDesign(mergeDesign(current, previous as Partial<DesignSpec>), patch);
      const { slideOverrides: _ignoredSlideOverrides, ...cleanOverride } = nextOverride;
      return {
        ...current,
        slideOverrides: {
          ...(current.slideOverrides || {}),
          [key]: cleanOverride,
        },
      };
    });
  };

  const slideKey = (slide: CarouselPreviewSlide, index: number) => slide.id || String(slide.index ?? index);

  const waitForCreativeJob = async (jobId: string): Promise<CreativeJobState> => {
    const terminalStatuses = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED']);
    // Slides waiting their turn sit in QUEUED/RESERVED; that wait is the
    // carousel's sequential queue, not this job's own render.
    const queuedStatuses = new Set(['QUEUED', 'RESERVED', 'PENDING']);
    const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
    // The backend renders carousel slides sequentially, one image job at a
    // time (confirmed in production: ~1-2 minutes per slide, and a slow
    // provider day stretches that). A slide queued near the end of a 7-slide
    // carousel can wait many minutes just for its turn, so a single fixed
    // budget counted from the "Gerar imagens" click gave up on healthy late
    // slides. Patience is therefore split in two: a generous budget for
    // waiting in the queue, and a separate one that only starts ticking when
    // THIS job actually reports RUNNING. RETRYABLE means a transient provider
    // failure that the backend redrives — it counts as rendering, and a fresh
    // provider attempt (RETRYABLE → RUNNING) re-arms the render budget.
    const queueTimeoutMs = 45 * 60_000;
    const renderTimeoutMs = 20 * 60_000;
    const startedAt = Date.now();
    let renderDeadline = 0;
    let lastStatus = '';
    let missingStreak = 0;
    //
    // Polling has to survive transient hiccups without failing the slide.
    // Because every job in a carousel polls in parallel, a batch of slides
    // briefly exceeds the creative-read rate bucket, so a 429 here means
    // "slow down" — NOT "the generation failed". The KIE job keeps running
    // server-side and the image lands a moment later. The same is true for a
    // 5xx from a redeploying backend or a dropped connection: back off and
    // keep polling instead of surfacing a scary "Falha ao gerar (HTTP 429)".
    while (Date.now() - startedAt < queueTimeoutMs + renderTimeoutMs) {
      let response: Response;
      try {
        response = await withTimeout(
          apiFetch(`/creative/jobs/${encodeURIComponent(jobId)}`),
          15000,
          'O acompanhamento da geração'
        );
      } catch {
        // Timeout or network blip: transient, keep waiting.
        await sleep(3000);
        continue;
      }
      if (response.status === 429 || response.status >= 500) {
        // Rate limited or backend hiccup: back off a little longer so we stop
        // adding pressure, then keep polling. The job is still running.
        await sleep(4000);
        continue;
      }
      if (response.status === 404) {
        // The job row can lag a beat behind creation; tolerate a short window
        // before concluding it truly doesn't exist.
        missingStreak += 1;
        if (missingStreak > 5) {
          throw new Error('Não foi possível acompanhar a geração (job não encontrado).');
        }
        await sleep(2000);
        continue;
      }
      if (!response.ok) {
        // 401/403 and similar won't fix themselves by retrying.
        throw new Error(`Não foi possível acompanhar a geração (HTTP ${response.status})`);
      }
      missingStreak = 0;
      const job = (await response.json()) as CreativeJobState;
      const status = String(job.status || '').toUpperCase();
      if (terminalStatuses.has(status)) return job;
      const previousStatus = lastStatus;
      lastStatus = status;
      if (queuedStatuses.has(status)) {
        if (Date.now() - startedAt > queueTimeoutMs) break;
        await sleep(5000);
        continue;
      }
      // RUNNING/RETRYABLE: the slide is on the provider. Start the render
      // budget on the first such observation, and re-arm it when a backend
      // redrive (RETRYABLE → RUNNING) begins a fresh provider attempt.
      if (!renderDeadline || (status === 'RUNNING' && previousStatus === 'RETRYABLE')) {
        renderDeadline = Date.now() + renderTimeoutMs;
      }
      if (Date.now() > renderDeadline) break;
      await sleep(2000);
    }
    throw new Error('A geração demorou muito mais que o esperado. O job continua disponível em seus projetos.');
  };

  // Mirrors (loosely) what the server hashes for its own idempotency. Must
  // cover EVERY field that reaches the compiled image prompt — style
  // fragments, full palette, layout, background, elements, platform/format,
  // alignment — or a design edit silently skips regeneration (the slide never
  // re-enters toGenerate). Deliberately EXCLUDES preview-only fields
  // (typography fonts/scale, palette.gradient CSS) so tweaking the card
  // preview doesn't bill a regeneration the image can't reflect.
  const slideFingerprint = (slide: CarouselPreviewSlide, index: number) => {
    const slideDesign = effectiveDesign(design, slide, index);
    return JSON.stringify({
      prompt: slide.imagePrompt || slide.visualDirection || slide.headline,
      headline: slide.headline,
      body: slide.body,
      cta: slide.cta,
      style: {
        visualStyle: slideDesign.style.visualStyle,
        lighting: slideDesign.style.lighting,
        mood: slideDesign.style.mood,
        finish: slideDesign.style.finish,
      },
      palette: {
        paletteId: slideDesign.palette.paletteId,
        background: slideDesign.palette.background,
        surface: slideDesign.palette.surface,
        text: slideDesign.palette.text,
        muted: slideDesign.palette.muted,
        accent: slideDesign.palette.accent,
        accent2: slideDesign.palette.accent2,
      },
      layout: slideDesign.layout,
      background: slideDesign.background,
      elements: slideDesign.elements.map((element) => [element.id, element.visible]),
      platform: slideDesign.platform,
      sizeId: slideDesign.sizeId,
      aspectRatio: slideDesign.aspectRatio,
      alignment: slideDesign.typography.alignment,
      renderMode: slideDesign.renderMode,
    });
  };

  const pendingRegenerationCount = draftSlides.filter((slide, index) => {
    const hasImage = Boolean(slide.imageUrl || slide.image?.url);
    return hasImage && generatedFingerprints[slideKey(slide, index)] !== slideFingerprint(slide, index);
  }).length;

  // Calls the Creative Engine directly instead of routing through the chat
  // agent. The browser already holds everything the generation needs (the
  // approved slides, the design spec, each slide's imagePrompt); the agent
  // reliably failed to chain generate-images into a real creativeEngineTool
  // call on its own, so it added a point of failure without adding anything
  // the model actually needed to decide.
  const generateCarouselImages = async () => {
    setGenerationError(null);
    const toGenerate = draftSlides.filter((slide, index) => {
      const key = slideKey(slide, index);
      const hasImage = Boolean(slide.imageUrl || slide.image?.url);
      return !hasImage || generatedFingerprints[key] !== slideFingerprint(slide, index);
    });
    if (!toGenerate.length) {
      setGenerationError(null);
      return;
    }
    setSubmitting(true);
    try {
      const response = await withTimeout(
        apiFetch('/creative/carousel/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: args.title || 'ContentFlow carousel',
          aspectRatio: design.aspectRatio,
          designSpec: design,
          confirmed: true,
          slides: toGenerate.map((slide) => {
            const index = draftSlides.indexOf(slide);
            return {
              id: slide.id,
              index: slide.index ?? index,
              headline: slide.headline,
              body: slide.body,
              cta: slide.cta,
              imagePrompt: slide.imagePrompt || slide.visualDirection || slide.headline,
              aspectRatio: design.aspectRatio,
            };
          }),
        }),
        }),
        90000,
        'A solicitação de geração de imagens'
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (response.status === 403 || body?.code === 'FEATURE_NOT_INCLUDED') {
          throw new Error(
            body?.message ||
              'A geração de imagens não está incluída no seu plano atual. Faça upgrade para gerar imagens.'
          );
        }
        throw new Error(
          body?.message || `Falha ao gerar as imagens (HTTP ${response.status})`
        );
      }
      const data: {
        projectId?: string;
        jobs?: Array<{ slideId?: string; slideIndex: number; job?: CreativeJobState; error?: string }>;
      } = await response.json();
      if (data.projectId) setProjectId(data.projectId);
      const entries = data.jobs || [];
      const jobsBySlide = new Map(entries.map((entry) => [entry.slideId || String(entry.slideIndex), entry]));
      setSavedToMedia(false);
      setGenProgress({ done: 0, total: entries.length });
      const markOneDone = () =>
        setGenProgress((current) =>
          current ? { ...current, done: Math.min(current.total, current.done + 1) } : current
        );
      setDraftSlides((current) =>
        current.map((slide, index) => {
          const entry = jobsBySlide.get(slideKey(slide, index));
          if (!entry || entry.error || entry.job?.status === 'SUCCEEDED') return slide;
          return { ...slide, status: 'renderizando…' };
        })
      );

      // Resolve each job independently and tick the progress counter as each
      // one lands, so the user watches "3 de 7" climb instead of staring at a
      // button that looks stuck until everything finishes at once.
      const settledEntries = await Promise.all(
        entries.map(async (entry) => {
          const alreadyTerminal =
            !entry.job?.id ||
            ['SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(String(entry.job.status || '').toUpperCase());
          if (alreadyTerminal) {
            markOneDone();
            return entry;
          }
          try {
            const settled = { ...entry, job: await waitForCreativeJob(entry.job.id) };
            markOneDone();
            return settled;
          } catch (error) {
            markOneDone();
            return { ...entry, error: error instanceof Error ? error.message : 'Falha ao acompanhar a geração' };
          }
        })
      );

      const anyFailed = settledEntries.some((entry) => Boolean(entry.error) || ['FAILED', 'CANCELLED', 'REFUNDED'].includes(String(entry.job?.status || '').toUpperCase()));
      const anySucceeded = settledEntries.some((entry) => entry.job?.status === 'SUCCEEDED' && Boolean(entry.job.output?.url));
      const newFingerprints: Record<string, string> = {};
      const settledBySlide = new Map(settledEntries.map((entry) => [entry.slideId || String(entry.slideIndex), entry]));
      settledEntries.forEach((entry) => {
        if (entry.job?.status !== 'SUCCEEDED' || !entry.job.output?.url) return;
        const index = draftSlides.findIndex((slide, slideIndex) => slideKey(slide, slideIndex) === (entry.slideId || String(entry.slideIndex)));
        if (index >= 0) newFingerprints[slideKey(draftSlides[index], index)] = slideFingerprint(draftSlides[index], index);
      });
      setDraftSlides((current) =>
        current.map((slide, index) => {
          const key = slideKey(slide, index);
          const entry = settledBySlide.get(key);
          if (!entry) return slide;
          if (entry.error || entry.job?.status === 'FAILED') {
            return { ...slide, status: `Falha ao gerar: ${entry.error || 'erro do provedor'}` };
          }
          const url = entry.job?.output?.url;
          if (entry.job?.status === 'SUCCEEDED' && url) {
            return { ...slide, imageUrl: url, status: 'imagem gerada' };
          }
          if (!entry.job?.id) {
            return { ...slide, status: 'Falha ao gerar: o servidor não retornou um job' };
          }
          return slide;
        })
      );
      setGeneratedFingerprints((current) => ({ ...current, ...newFingerprints }));
      // A plan/permission block fails every slide with the same message and
      // retrying won't help — point the user at billing instead of "try again".
      const planBlocked =
        anyFailed &&
        !anySucceeded &&
        settledEntries.every(
          (entry) =>
            !entry.error ||
            /plano|inclu[ií]d|feature_not_included|upgrade/i.test(entry.error)
        ) &&
        settledEntries.some((entry) => /plano|inclu[ií]d|feature_not_included|upgrade/i.test(entry.error || ''));
      if (planBlocked) {
        const planMessage = settledEntries.find((entry) => entry.error)?.error;
        setGenerationError(
          planMessage || 'A geração de imagens não está incluída no seu plano atual.'
        );
      } else if (anyFailed) {
        setGenerationError('Algumas imagens falharam. Revise os slides marcados e tente novamente.');
      } else if (!anySucceeded) {
        setGenerationError('A geração foi iniciada, mas o servidor ainda não disponibilizou as imagens. Tente novamente em instantes.');
      } else {
        setDesignDirty(false);
      }
      if (anySucceeded) {
        void persistGeneratedImagesToMedia(settledEntries);
        void persistGeneratedImagesToStudioStore(settledEntries);
      }
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Nao foi possivel gerar as imagens.');
    } finally {
      setSubmitting(false);
      setGenProgress(null);
    }
  };

  // Copies the freshly generated slide images into the media library (/media),
  // reusing the existing /media/carousel endpoint. Best-effort: the preview
  // still shows the images even if this fails.
  const persistGeneratedImagesToMedia = async (
    settledEntries: Array<{ slideId?: string; slideIndex: number; job?: CreativeJobState; error?: string }>
  ) => {
    const images = settledEntries
      .filter((entry) => entry.job?.status === 'SUCCEEDED' && Boolean(entry.job.output?.url))
      .map((entry) => ({
        index: Math.min(10, Math.max(1, (Number(entry.slideIndex) || 0) + 1)),
        image: String(entry.job!.output!.url),
      }));
    if (!images.length) return;
    try {
      const response = await withTimeout(
        apiFetch('/media/carousel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: (args.title || 'Carrossel do estúdio').slice(0, 160),
            images,
          }),
        }),
        60000,
        'O salvamento das imagens na biblioteca'
      );
      if (response.ok) setSavedToMedia(true);
    } catch {
      // Non-fatal: the images remain visible in the preview regardless.
    }
  };

  // Persists the generated slide images against this card's stable key, so that
  // leaving and reopening the chat re-hydrates them (see the mount effect below).
  const persistGeneratedImagesToStudioStore = async (
    settledEntries: Array<{ slideId?: string; slideIndex: number; job?: CreativeJobState; error?: string }>
  ) => {
    if (!carouselCardKey) return;
    const images = settledEntries
      .filter((entry) => entry.job?.status === 'SUCCEEDED' && Boolean(entry.job.output?.url))
      .map((entry) => ({
        slideId: entry.slideId || String(entry.slideIndex),
        imageUrl: String(entry.job!.output!.url),
      }));
    if (!images.length) return;
    try {
      await withTimeout(
        apiFetch('/creative/studio-carousel/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardKey: carouselCardKey, images }),
        }),
        30000,
        'O salvamento das imagens do carrossel'
      );
    } catch {
      // Best-effort: the images still show in this session regardless.
    }
  };

  // On mount (and whenever a different card is shown), pull any previously
  // generated images for this card from the server and fill in the slides that
  // don't already have a locally-generated image. This is what makes the images
  // reappear after the user leaves the chat and comes back.
  useEffect(() => {
    if (!carouselCardKey) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await withTimeout(
          apiFetch(`/creative/studio-carousel/images?cardKey=${encodeURIComponent(carouselCardKey)}`),
          15000,
          'O carregamento das imagens salvas'
        );
        if (cancelled || !response.ok) return;
        const data = (await response.json()) as {
          images?: Array<{ slideId: string; imageUrl: string }>;
        };
        const bySlide = new Map((data.images || []).map((item) => [item.slideId, item.imageUrl]));
        if (cancelled || !bySlide.size) return;
        const hydratedFingerprints: Record<string, string> = {};
        setDraftSlides((current) =>
          current.map((slide, index) => {
            const url = bySlide.get(slideKey(slide, index));
            if (url && !(slide.imageUrl || slide.image?.url)) {
              hydratedFingerprints[slideKey(slide, index)] = slideFingerprint(slide, index);
              return { ...slide, imageUrl: url, status: 'imagem gerada' };
            }
            return slide;
          })
        );
        if (Object.keys(hydratedFingerprints).length) {
          // Locally-generated fingerprints win (…cur last): a fresh render this
          // session is more authoritative than what the server had saved.
          setGeneratedFingerprints((cur) => ({ ...hydratedFingerprints, ...cur }));
        }
      } catch {
        // Best-effort: a failed reload just means the user sees no image yet.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselCardKey]);

  return (
    <section className="cf-content-artifact cf-carousel-preview" aria-label="Preview do carrossel">
      <header className="cf-content-artifact__header">
        <div>
          <span className="cf-content-artifact__eyebrow">Copy pronta para aprovação</span>
          <h3>{args.title || 'Seu carrossel'}</h3>
          <p>{activeDesign.platform} · {activeDesign.aspectRatio} · {draftSlides.length} slides</p>
        </div>
        <div className="cf-carousel-preview__header-actions">
          <span className="cf-content-artifact__count">{draftSlides.length}</span>
        </div>
      </header>

      <div className={`cf-carousel-preview__workspace ${designOpen ? 'is-editing' : ''}`}>
        <div className="cf-carousel-preview__rail" role="list" aria-label="Slides do carrossel">
          {draftSlides.map((slide, index) => {
          const image = toDataUrl(slide.imageUrl || slide.image?.url || slide.image?.b64_json);
          const slideDesign = effectiveDesign(design, slide, index);
          const safePadding = safePaddingValue(slideDesign.layout.safePadding);
          const textScale = typographyScaleValue(slideDesign.typography.scale);
          const canvasStyle: CSSProperties = {
            background: designBackground(slideDesign),
            color: slideDesign.palette.text,
            fontFamily: slideDesign.typography.bodyFont,
            textAlign: slideDesign.typography.alignment,
            padding: safePadding,
          };
          const slideStyle: CSSProperties = {
            aspectRatio: slideDesign.aspectRatio.replace(':', ' / '),
          };
          const isRendering = String(slide.status || '').toLowerCase().includes('renderiz');
          return (
            <button
              type="button"
              role="listitem"
              className={`cf-carousel-slide ${active === index ? 'is-active' : ''}`}
              style={slideStyle}
              key={slide.id || `${index}-${slide.headline}`}
              onClick={() => setActive(index)}
            >
              {image ? (
                <div className="cf-carousel-slide__image-preview">
                  <img src={image} alt={slide.headline} />
                  <span
                    className="cf-carousel-slide__zoom"
                    role="button"
                    tabIndex={0}
                    aria-label="Abrir imagem em tamanho grande"
                    onClick={(event) => {
                      event.stopPropagation();
                      setLightboxUrl(image);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        setLightboxUrl(image);
                      }
                    }}
                  >
                    ⤢
                  </span>
                  {designDirty && (
                    <div className="cf-carousel-slide__live-overlay" style={{ color: slideDesign.palette.text, textAlign: slideDesign.typography.alignment, fontFamily: slideDesign.typography.bodyFont, padding: safePadding }}>
                      <span className="cf-carousel-slide__live-label">Prévia da edição</span>
                      <div>
                        <h4 style={{ color: slideDesign.palette.text, fontFamily: slideDesign.typography.headingFont, fontSize: `clamp(${16 * textScale}px, 2.1vw, ${25 * textScale}px)` }}>{slide.headline}</h4>
                        {slide.body && <p style={{ color: slideDesign.palette.muted, fontSize: `${11 * textScale}px` }}>{slide.body}</p>}
                        {slide.cta && <em style={{ background: slideDesign.palette.accent, color: readableTextOn(slideDesign.palette.accent) }}>{slide.cta}</em>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`cf-carousel-slide__canvas cf-carousel-slide__canvas--${slide.layout || 'text-card'}`} style={canvasStyle}>
                  {slideDesign.elements.some((element) => element.id === 'logo' && element.visible) && <span className="cf-carousel-slide__brand" style={{ color: slideDesign.palette.muted }}>ContentFlow</span>}
                  <span className="cf-carousel-slide__index" style={{ color: slideDesign.palette.muted }}>{String(slide.index || index + 1).padStart(2, '0')}</span>
                  <div>
                    {slide.highlight && <strong style={{ color: slideDesign.palette.accent }}>{slide.highlight}</strong>}
                    <h4 style={{ color: slideDesign.palette.text, fontFamily: slideDesign.typography.headingFont, fontSize: `clamp(${16 * textScale}px, 2.1vw, ${25 * textScale}px)` }}>{slide.headline}</h4>
                    {slide.body && <p style={{ color: slideDesign.palette.muted, fontFamily: slideDesign.typography.bodyFont, fontSize: `${11 * textScale}px` }}>{slide.body}</p>}
                  </div>
                  {slide.cta && <em style={{ background: slideDesign.palette.accent, color: readableTextOn(slideDesign.palette.accent) }}>{slide.cta}</em>}
                </div>
              )}
              {isRendering && (
                <div className="cf-carousel-slide__rendering" aria-hidden="true">
                  <span className="cf-carousel-slide__spinner" />
                  <span>Gerando imagem…</span>
                </div>
              )}
              <span className="cf-carousel-slide__badge">{index + 1}/{draftSlides.length}</span>
            </button>
          );
          })}
        </div>

        {activeSlide && designOpen && (
          <CarouselDesignEditor
            design={design}
            activeSlide={activeSlide}
            activeIndex={active}
            scope={scope}
            disabled={isBusy}
            onScopeChange={setScope}
            onChange={updateDesign}
            onImagePromptChange={updateActiveSlideImagePrompt}
            onReset={() => {
              setDesignDirty(true);
              // "Restaurar IA" used to always replace the WHOLE design spec,
              // wiping every slide's override regardless of which scope was
              // selected - so trying to reset just the slide you're looking
              // at (scope: 'slide') silently reset every other slide too.
              // Match the scope toggle: reset only the active slide's
              // override when scoped to it, the whole spec when scoped to
              // all slides.
              if (scope === 'slide' && activeSlide) {
                const key = slideKey(activeSlide, active);
                setDesign((current) => removeSlideOverride(current, key));
                return;
              }
              setDesign(createDefaultDesign(args.aspectRatio || '4:5'));
            }}
          />
        )}
      </div>

      {activeSlide && (
        <>
          <div className="cf-carousel-preview__details">
            <div>
              <strong>Slide {active + 1}: {activeSlide.role || 'conteúdo'}</strong>
              <p>{activeSlide.visualDirection || activeSlide.imagePrompt || 'Direção visual pronta para gerar.'}</p>
            </div>
            <span>{pendingRegenerationCount > 0 ? `${pendingRegenerationCount} slide(s) precisam ser regenerado(s)` : activeSlide.status || 'copy em revisão'}</span>
          </div>

          <div className="cf-carousel-copy-editor" aria-label="Editar copy do slide">
            <div className="cf-carousel-copy-editor__heading">
              <div>
                <strong>Copy do slide {active + 1}</strong>
                <p>Revise o texto antes de aprovar a geração das imagens.</p>
              </div>
              <span>Etapa 2 de 2</span>
            </div>
            <label>
              Título
              <input value={activeSlide.headline || ''} onChange={(event) => updateActiveSlide('headline', event.target.value)} disabled={isBusy} />
            </label>
            <label>
              Texto do slide
              <textarea value={activeSlide.body || ''} onChange={(event) => updateActiveSlide('body', event.target.value)} rows={4} disabled={isBusy} />
            </label>
            <label>
              Chamada para ação
              <input value={activeSlide.cta || ''} onChange={(event) => updateActiveSlide('cta', event.target.value)} disabled={isBusy} placeholder="Ex.: Salve este post" />
            </label>
            <div className="cf-carousel-copy-editor__actions">
              <button
                type="button"
                className="is-secondary"
                disabled={isBusy}
                onClick={() => {
                  setSubmitting(true);
                  void sendAction({ action: 'approve-carousel-copy', confirmed: true, copyApproved: true, designApproved: false, carousel: draftCarousel }).catch(() => {
                    setSubmitting(false);
                  });
                }}
              >
                Salvar copy e revisar
              </button>
              <button
                type="button"
                className={designOpen ? 'is-active' : ''}
                onClick={() => setDesignOpen((open) => !open)}
                disabled={isBusy}
              >
                {designOpen ? 'Fechar design' : 'Editar design'}
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  void generateCarouselImages();
                }}
              >
                {submitting
                  ? genProgress
                    ? `Gerando ${genProgress.done} de ${genProgress.total}…`
                    : 'Gerando imagens…'
                  : (<>Gerar imagens <span aria-hidden="true">→</span></>)}
              </button>
            </div>
            {submitting && (
              <div className="cf-carousel-gen-progress" role="status" aria-live="polite">
                <div className="cf-carousel-gen-progress__bar">
                  <div
                    className="cf-carousel-gen-progress__fill"
                    style={{
                      width: genProgress && genProgress.total > 0
                        ? `${Math.round((genProgress.done / genProgress.total) * 100)}%`
                        : '15%',
                    }}
                    data-indeterminate={genProgress ? 'false' : 'true'}
                  />
                </div>
                <span>
                  {genProgress
                    ? `${genProgress.done} de ${genProgress.total} imagens prontas — as imagens são geradas uma por vez, pode levar alguns minutos. Pode deixar esta tela aberta.`
                    : 'Enviando para geração…'}
                </span>
              </div>
            )}
            {!submitting && savedToMedia && (
              <small className="cf-carousel-copy-editor__saved" role="status">
                ✓ Imagens salvas na sua biblioteca de mídia (/media).
              </small>
            )}
            {generationError ? (
              <small className="cf-carousel-copy-editor__error" role="alert">{generationError}</small>
            ) : !submitting && !savedToMedia ? (
              <small>{pendingRegenerationCount > 0 ? 'As alterações de design estão prontas para regeneração.' : 'As imagens só serão solicitadas depois da aprovação da copy e do design.'}</small>
            ) : null}
          </div>
        </>
      )}

      <footer className="cf-content-artifact__footer">
        <span>Você pode editar cada slide antes de gerar.</span>
      </footer>

      {/* Rendered through a portal into <body> so the fullscreen overlay
          escapes this section — the card keeps a lingering transform (from its
          entrance animation) plus overflow:hidden, which would otherwise trap
          and clip a position:fixed child inside the copy block. */}
      {lightboxUrl &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="cf-carousel-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Imagem ampliada"
            onClick={() => setLightboxUrl(null)}
          >
            <button
              type="button"
              className="cf-carousel-lightbox__close"
              aria-label="Fechar"
              onClick={() => setLightboxUrl(null)}
            >
              ×
            </button>
            <img
              src={lightboxUrl}
              alt="Imagem do slide ampliada"
              onClick={(event) => event.stopPropagation()}
            />
          </div>,
          document.body
        )}
    </section>
  );
}
