'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useCopilotChat } from '@copilotkit/react-core';
import { Role, TextMessage } from '@copilotkit/runtime-client-gql';
import { CarouselDesignEditor, type DesignScope } from './carousel-design-editor.component';

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

type ActionProps = {
  status?: string;
  respond?: (value: Record<string, unknown>) => void | Promise<void>;
  onAction?: (value: Record<string, unknown>) => void | Promise<void>;
};

function useArtifactResponder(
  respond?: (value: Record<string, unknown>) => void | Promise<void>,
  onAction?: (value: Record<string, unknown>) => void | Promise<void>
) {
  const { appendMessage } = useCopilotChat();
  return async (value: Record<string, unknown>) => {
    if (onAction) {
      await onAction(value);
      return;
    }
    if (respond) {
      await respond(value);
      return;
    }
    await appendMessage(
      new TextMessage({
        role: Role.User,
        content: `[--content-action--]\nACTION: ${String(value.action || 'continue')}. Execute this button action now and return the next Studio artifact, not a generic explanation.\nPAYLOAD: ${JSON.stringify(value)}\n[--content-action--]`,
      })
    );
  };
}

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
  layout: { templateId: 'carousel-cover', density: 'balanced' },
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

export function ContentIdeasCard({ args, status, respond, onAction }: ActionProps & { args: Record<string, any> }) {
  const ideas = useMemo<ContentIdea[]>(
    () => (Array.isArray(args.ideas) ? args.ideas : []).filter((idea) => idea?.title),
    [args.ideas]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'carousel' | 'image' | null>(null);
  // A completed artifact is interactive. Only lock its actions while the
  // follow-up request is actually running.
  const isBusy = status === 'executing';
  const sendAction = useArtifactResponder(respond, onAction);

  return (
    <section className="cf-content-artifact cf-content-ideas" aria-label="Ideias prontas">
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
                    setPendingAction('carousel');
                    void sendAction({ action: 'transform-carousel', selectedIdea: idea, selectedIdeaId: id }).catch(() => {
                      setPendingAction(null);
                    });
                  }}
                >
                  Transformar em carrossel
                </button>
                <button
                  type="button"
                  className="is-secondary"
                  disabled={isBusy}
                  onClick={() => {
                    setSelectedId(id);
                    setPendingAction('image');
                    void sendAction({ action: 'generate-image', selectedIdea: idea, selectedIdeaId: id }).catch(() => {
                      setPendingAction(null);
                    });
                  }}
                >
                  Criar imagem
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {pendingAction && (
        <p className="cf-content-artifact__pending" role="status">
          {pendingAction === 'carousel'
            ? 'Preparando a copy completa e a estrutura dos slides…'
            : 'Preparando as opções do seu visual…'}
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
  const isBusy = status === 'executing';
  const sendAction = useArtifactResponder(respond, onAction);

  useEffect(() => {
    setDraftSlides(slides);
    setDesign(normalizeDesign(args.designSpec, args.aspectRatio || '4:5'));
    setActive((current) => Math.min(current, Math.max(slides.length - 1, 0)));
  }, [args.designSpec, args.slides, args.aspectRatio, slides]);

  const updateActiveSlide = (field: 'headline' | 'body' | 'cta', value: string) => {
    setDraftSlides((current) => current.map((slide, index) => (index === active ? { ...slide, [field]: value } : slide)));
  };

  const activeSlide = draftSlides[active];
  const activeDesign = activeSlide ? effectiveDesign(design, activeSlide, active) : design;
  const draftCarousel = { ...args, slides: draftSlides, designSpec: design };

  const updateDesign = (patch: Partial<DesignSpec>) => {
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

      <div className="cf-carousel-preview__rail" role="list" aria-label="Slides do carrossel">
        {draftSlides.map((slide, index) => {
          const image = toDataUrl(slide.imageUrl || slide.image?.url || slide.image?.b64_json);
          const slideDesign = effectiveDesign(design, slide, index);
          const canvasStyle: CSSProperties = {
            background: designBackground(slideDesign),
            color: slideDesign.palette.text,
            fontFamily: slideDesign.typography.bodyFont,
            textAlign: slideDesign.typography.alignment,
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
                <img src={image} alt={slide.headline} />
              ) : (
                <div className={`cf-carousel-slide__canvas cf-carousel-slide__canvas--${slide.layout || 'text-card'}`} style={canvasStyle}>
                  {slideDesign.elements.some((element) => element.id === 'logo' && element.visible) && <span className="cf-carousel-slide__brand">ContentFlow</span>}
                  <span className="cf-carousel-slide__index">{String(slide.index || index + 1).padStart(2, '0')}</span>
                  <div>
                    {slide.highlight && <strong style={{ color: slideDesign.palette.accent }}>{slide.highlight}</strong>}
                    <h4 style={{ fontFamily: slideDesign.typography.headingFont }}>{slide.headline}</h4>
                    {slide.body && <p>{slide.body}</p>}
                  </div>
                  {slide.cta && <em style={{ background: slideDesign.palette.accent, color: slideDesign.palette.background }}>{slide.cta}</em>}
                </div>
              )}
              <span className="cf-carousel-slide__badge">{index + 1}/{draftSlides.length}</span>
            </button>
          );
        })}
      </div>

      {activeSlide && (
        <>
          <div className="cf-carousel-preview__details">
            <div>
              <strong>Slide {active + 1}: {activeSlide.role || 'conteúdo'}</strong>
              <p>{activeSlide.visualDirection || activeSlide.imagePrompt || 'Direção visual pronta para gerar.'}</p>
            </div>
            <span>{activeSlide.status || 'copy em revisão'}</span>
          </div>

          {designOpen && (
            <CarouselDesignEditor
              design={design}
              activeSlide={activeSlide}
              activeIndex={active}
              scope={scope}
              disabled={isBusy}
              onScopeChange={setScope}
              onChange={updateDesign}
              onReset={() => setDesign(createDefaultDesign(args.aspectRatio || '4:5'))}
            />
          )}

          <div className="cf-carousel-copy-editor" aria-label="Editar copy do slide">
            <div className="cf-carousel-copy-editor__heading">
              <div>
                <strong>Copy do slide {active + 1}</strong>
                <p>Revise o texto antes de aprovar a geração das imagens.</p>
              </div>
              <span>Etapa 1 de 2</span>
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
              <button type="button" className="is-secondary" disabled={isBusy} onClick={() => sendAction({ action: 'approve-carousel-copy', confirmed: true, copyApproved: true, designApproved: false, carousel: draftCarousel })}>
                Salvar copy e revisar
              </button>
              <button type="button" disabled={isBusy} onClick={() => sendAction({ action: 'generate-images', confirmed: true, copyApproved: true, designApproved: true, designSpec: design, carousel: draftCarousel })}>
                Aprovar copy e gerar imagens <span aria-hidden="true">→</span>
              </button>
            </div>
            <small>As imagens só serão solicitadas depois da aprovação da copy e do design.</small>
          </div>
        </>
      )}

      <footer className="cf-content-artifact__footer">
        <span>Você pode editar cada slide antes de gerar.</span>
      </footer>
    </section>
  );
}
