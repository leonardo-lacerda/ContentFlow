'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { CarouselDesignEditor, type DesignScope } from './carousel-design-editor.component';
import { CreationOptionsCard } from './creation-options.component';

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

export type DesignElement = {
  id: string;
  type: 'logo' | 'product' | 'shape' | 'icon' | 'badge' | 'divider';
  visible: boolean;
};

export type DesignSpec = {
  version: number;
  platform: string;
  aspectRatio: string;
  sizeId: string;
  palette: {
    paletteId: string;
    name: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accent2: string;
    gradient: string;
  };
  typography: {
    fontPairId: string;
    name: string;
    headingFont: string;
    bodyFont: string;
    scale: 'compact' | 'balanced' | 'expressive';
    alignment: 'left' | 'center' | 'right';
  };
  layout: {
    templateId: string;
    density: 'airy' | 'balanced' | 'dense';
    safePadding: 'compact' | 'balanced' | 'airy';
  };
  background: {
    type: 'solid' | 'gradient' | 'image' | 'texture';
    value?: string;
    overlay?: string;
    opacity?: number;
  };
  elements: DesignElement[];
  renderMode: 'native-overlay' | 'hybrid' | 'ai-composed';
  slideOverrides?: Record<string, Partial<DesignSpec>>;
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

const PALETTES: Array<DesignSpec['palette']> = [
  {
    paletteId: 'cobalt-cream',
    name: 'Azul & creme',
    background: '#F4F1E9',
    surface: '#FFFFFF',
    text: '#0B1B3A',
    muted: '#5A6B8C',
    accent: '#1E40FF',
    accent2: '#0B1B3A',
    gradient: 'radial-gradient(circle at top left, #dfe5ff, #f4f1e9 62%)',
  },
  {
    paletteId: 'midnight-neon',
    name: 'Noite neon',
    background: '#0A0A12',
    surface: '#14141F',
    text: '#F5F5FF',
    muted: '#9A9AB0',
    accent: '#00F0FF',
    accent2: '#FF2D95',
    gradient: 'radial-gradient(circle at top left, #213b52, #0a0a12 68%)',
  },
  {
    paletteId: 'mint-fresh',
    name: 'Menta fresco',
    background: '#EEF7F1',
    surface: '#FFFFFF',
    text: '#0F2A1E',
    muted: '#4E6B5E',
    accent: '#0FB57E',
    accent2: '#0A8C61',
    gradient: 'radial-gradient(circle at top right, #baf0d9, #eef7f1 66%)',
  },
  {
    paletteId: 'sunset-pop',
    name: 'Sunset vibrante',
    background: '#FF5E3A',
    surface: '#FF7A52',
    text: '#1A0B07',
    muted: '#7A2E14',
    accent: '#FFD23F',
    accent2: '#2D1810',
    gradient: 'radial-gradient(circle at top left, #ffbf65, #ff5e3a 68%)',
  },
];

const FONTS: Array<Pick<DesignSpec['typography'], 'fontPairId' | 'name' | 'headingFont' | 'bodyFont'>> = [
  { fontPairId: 'archivo-figtree', name: 'Moderna', headingFont: 'Archivo Black', bodyFont: 'Figtree' },
  { fontPairId: 'fraunces-grotesk', name: 'Editorial', headingFont: 'Fraunces', bodyFont: 'Space Grotesk' },
  { fontPairId: 'grotesk-mono', name: 'Tecnológica', headingFont: 'Space Grotesk', bodyFont: 'IBM Plex Mono' },
  { fontPairId: 'instrument-jakarta', name: 'Elegante', headingFont: 'Instrument Serif', bodyFont: 'Plus Jakarta Sans' },
];

const DEFAULT_ELEMENTS: DesignElement[] = [
  { id: 'logo', type: 'logo', visible: true },
  { id: 'product', type: 'product', visible: true },
  { id: 'shape', type: 'shape', visible: true },
  { id: 'badge', type: 'badge', visible: false },
  { id: 'divider', type: 'divider', visible: false },
];

const createDefaultDesign = (aspectRatio = '4:5'): DesignSpec => ({
  version: 1,
  platform: 'Instagram',
  aspectRatio,
  sizeId: aspectRatio === '1:1' ? 'ig-square' : 'ig-portrait',
  palette: PALETTES[0],
  typography: {
    ...FONTS[0],
    scale: 'balanced',
    alignment: 'left',
  },
  layout: { templateId: 'carousel-cover', density: 'balanced', safePadding: 'balanced' },
  background: { type: 'gradient', value: PALETTES[0].gradient, opacity: 1 },
  elements: DEFAULT_ELEMENTS,
  renderMode: 'hybrid',
  slideOverrides: {},
});

const mergeDesign = (base: DesignSpec, patch: Partial<DesignSpec>): DesignSpec => ({
  ...base,
  ...patch,
  palette: { ...base.palette, ...(patch.palette || {}) },
  typography: { ...base.typography, ...(patch.typography || {}) },
  layout: { ...base.layout, ...(patch.layout || {}) },
  background: { ...base.background, ...(patch.background || {}) },
  elements: patch.elements || base.elements,
});

const normalizeDesign = (raw: unknown, aspectRatio: string): DesignSpec => {
  const fallback = createDefaultDesign(aspectRatio);
  if (!raw || typeof raw !== 'object') return fallback;
  const candidate = raw as Partial<DesignSpec>;
  return mergeDesign(fallback, {
    ...candidate,
    aspectRatio: candidate.aspectRatio || aspectRatio,
    elements: Array.isArray(candidate.elements) ? candidate.elements : fallback.elements,
  });
};

const effectiveDesign = (design: DesignSpec, slide: CarouselPreviewSlide, index: number) => {
  const key = slide.id || String(slide.index ?? index + 1);
  const override = design.slideOverrides?.[key];
  return override ? mergeDesign(design, override) : design;
};

const designBackground = (design: DesignSpec) => {
  if (design.background.type === 'image' && design.background.value) {
    return `linear-gradient(${design.background.overlay || 'rgba(0,0,0,.12)'}, ${design.background.overlay || 'rgba(0,0,0,.12)'}), url(${design.background.value}) center/cover`;
  }
  if (design.background.type === 'solid') return design.palette.background;
  if (design.background.type === 'texture') return `repeating-linear-gradient(135deg, ${design.palette.background}, ${design.palette.background} 12px, ${design.palette.surface} 13px)`;
  return design.palette.gradient;
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
  useEffect(() => {
    if (!pendingAction) return;
    const timeout = window.setTimeout(() => setPendingAction(null), 45000);
    return () => window.clearTimeout(timeout);
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
  const isBusy = !isAwaitingUser(status) || submitting;
  const sendAction = useArtifactResponder(respond, onAction);
  const apiFetch = useFetch();

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
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await apiFetch(`/creative/jobs/${encodeURIComponent(jobId)}`);
      if (!response.ok) throw new Error(`Não foi possível acompanhar a geração (HTTP ${response.status})`);
      const job = (await response.json()) as CreativeJobState;
      if (terminalStatuses.has(String(job.status || '').toUpperCase())) return job;
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
    throw new Error('A geração demorou mais que o esperado. O job continua disponível em seus projetos.');
  };

  // Mirrors (loosely) what the server hashes for its own idempotency: prompt,
  // effective per-slide design, and aspect ratio. Doesn't need to match the
  // server byte-for-byte — it only has to change when the server's would.
  const slideFingerprint = (slide: CarouselPreviewSlide, index: number) => {
    const slideDesign = effectiveDesign(design, slide, index);
    return JSON.stringify({
      prompt: slide.imagePrompt || slide.visualDirection || slide.headline,
      headline: slide.headline,
      body: slide.body,
      cta: slide.cta,
      paletteId: slideDesign.palette.paletteId,
      fontPairId: slideDesign.typography.fontPairId,
      templateId: slideDesign.layout.templateId,
      background: slideDesign.background,
      aspectRatio: slideDesign.aspectRatio,
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
      const response = await apiFetch('/creative/carousel/generate-images', {
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
      });
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
      setDraftSlides((current) =>
        current.map((slide, index) => {
          const entry = jobsBySlide.get(slideKey(slide, index));
          if (!entry || entry.error || entry.job?.status === 'SUCCEEDED') return slide;
          return { ...slide, status: 'renderizando…' };
        })
      );

      const settledEntries = await Promise.all(
        entries.map(async (entry) => {
          if (!entry.job?.id || ['SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(String(entry.job.status || '').toUpperCase())) {
            return entry;
          }
          try {
            return { ...entry, job: await waitForCreativeJob(entry.job.id) };
          } catch (error) {
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
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Nao foi possivel gerar as imagens.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="cf-content-artifact cf-carousel-preview" aria-label="Preview do carrossel">
      <header className="cf-content-artifact__header">
        <div>
          <span className="cf-content-artifact__eyebrow">Copy pronta para aprovação</span>
          <h3>{args.title || 'Seu carrossel'}</h3>
          <p>{activeDesign.platform} · {activeDesign.aspectRatio} · {draftSlides.length} slides</p>
        </div>
        <div className="cf-carousel-preview__header-actions">
          <button type="button" className={designOpen ? 'is-active' : ''} onClick={() => setDesignOpen((open) => !open)} disabled={isBusy}>
            {designOpen ? 'Fechar design' : 'Editar design'}
          </button>
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
            onReset={() => {
              setDesignDirty(true);
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
                disabled={isBusy}
                onClick={() => {
                  void generateCarouselImages();
                }}
              >
                {submitting ? 'Gerando imagens…' : (<>Gerar imagens <span aria-hidden="true">→</span></>)}
              </button>
            </div>
            {generationError ? (
              <small className="cf-carousel-copy-editor__error" role="alert">{generationError}</small>
            ) : (
              <small>{pendingRegenerationCount > 0 ? 'As alterações de design estão prontas para regeneração.' : 'As imagens só serão solicitadas depois da aprovação da copy e do design.'}</small>
            )}
          </div>
        </>
      )}

      <footer className="cf-content-artifact__footer">
        <span>Você pode editar cada slide antes de gerar.</span>
      </footer>
    </section>
  );
}
