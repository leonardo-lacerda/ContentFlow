'use client';


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

export type DesignSlideRef = { id?: string; index?: number };
export type DesignScope = 'all' | 'slide';

export const PALETTES: Array<DesignSpec['palette']> = [
  { paletteId: 'cobalt-cream', name: 'Azul & creme', background: '#F4F1E9', surface: '#FFFFFF', text: '#0B1B3A', muted: '#5A6B8C', accent: '#1E40FF', accent2: '#0B1B3A', gradient: 'radial-gradient(circle at top left, #dfe5ff, #f4f1e9 62%)' },
  { paletteId: 'midnight-neon', name: 'Noite neon', background: '#0A0A12', surface: '#14141F', text: '#F5F5FF', muted: '#9A9AB0', accent: '#00F0FF', accent2: '#FF2D95', gradient: 'radial-gradient(circle at top left, #213b52, #0a0a12 68%)' },
  { paletteId: 'mint-fresh', name: 'Menta fresco', background: '#EEF7F1', surface: '#FFFFFF', text: '#0F2A1E', muted: '#4E6B5E', accent: '#0FB57E', accent2: '#0A8C61', gradient: 'radial-gradient(circle at top right, #baf0d9, #eef7f1 66%)' },
  { paletteId: 'sunset-pop', name: 'Sunset vibrante', background: '#FF5E3A', surface: '#FF7A52', text: '#1A0B07', muted: '#7A2E14', accent: '#FFD23F', accent2: '#2D1810', gradient: 'radial-gradient(circle at top left, #ffbf65, #ff5e3a 68%)' },
];

export const FONTS: Array<Pick<DesignSpec['typography'], 'fontPairId' | 'name' | 'headingFont' | 'bodyFont'>> = [
  { fontPairId: 'archivo-figtree', name: 'Moderna', headingFont: 'Archivo Black', bodyFont: 'Figtree' },
  { fontPairId: 'fraunces-grotesk', name: 'Editorial', headingFont: 'Fraunces', bodyFont: 'Space Grotesk' },
  { fontPairId: 'grotesk-mono', name: 'Tecnológica', headingFont: 'Space Grotesk', bodyFont: 'IBM Plex Mono' },
  { fontPairId: 'instrument-jakarta', name: 'Elegante', headingFont: 'Instrument Serif', bodyFont: 'Plus Jakarta Sans' },
];

const DEFAULT_ELEMENTS: DesignElement[] = [
  { id: 'logo', type: 'logo', visible: true },
  { id: 'product', type: 'product', visible: true },
  { id: 'shape', type: 'shape', visible: true },
  { id: 'icon', type: 'icon', visible: false },
  { id: 'badge', type: 'badge', visible: false },
  { id: 'divider', type: 'divider', visible: false },
];

export const createDefaultDesign = (aspectRatio = '4:5'): DesignSpec => ({
  version: 1,
  platform: 'Instagram',
  aspectRatio,
  sizeId: aspectRatio === '1:1' ? 'ig-square' : 'ig-portrait',
  palette: PALETTES[0],
  typography: { ...FONTS[0], scale: 'balanced', alignment: 'left' },
  layout: { templateId: 'carousel-cover', density: 'balanced' },
  background: { type: 'gradient', value: PALETTES[0].gradient, opacity: 1 },
  elements: DEFAULT_ELEMENTS,
  renderMode: 'hybrid',
  slideOverrides: {},
});

export const mergeDesign = (base: DesignSpec, patch: Partial<DesignSpec>): DesignSpec => ({
  ...base,
  ...patch,
  palette: { ...base.palette, ...(patch.palette || {}) },
  typography: { ...base.typography, ...(patch.typography || {}) },
  layout: { ...base.layout, ...(patch.layout || {}) },
  background: { ...base.background, ...(patch.background || {}) },
  elements: patch.elements || base.elements,
});

export const normalizeDesign = (raw: unknown, aspectRatio: string): DesignSpec => {
  const fallback = createDefaultDesign(aspectRatio);
  if (!raw || typeof raw !== 'object') return fallback;
  const candidate = raw as Partial<DesignSpec>;
  return mergeDesign(fallback, {
    ...candidate,
    aspectRatio: candidate.aspectRatio || aspectRatio,
    elements: Array.isArray(candidate.elements) ? candidate.elements : fallback.elements,
  });
};

export const effectiveDesign = (design: DesignSpec, slide: DesignSlideRef, index: number) => {
  const key = slide.id || String(slide.index ?? index + 1);
  const override = design.slideOverrides?.[key];
  return override ? mergeDesign(design, override) : design;
};

export const designBackground = (design: DesignSpec) => {
  if (design.background.type === 'image' && design.background.value) {
    return `linear-gradient(${design.background.overlay || 'rgba(0,0,0,.12)'}, ${design.background.overlay || 'rgba(0,0,0,.12)'}), url(${design.background.value}) center/cover`;
  }
  if (design.background.type === 'solid') return design.palette.background;
  if (design.background.type === 'texture') return `repeating-linear-gradient(135deg, ${design.palette.background}, ${design.palette.background} 12px, ${design.palette.surface} 13px)`;
  return design.palette.gradient;
};

type Props = {
  design: DesignSpec;
  activeSlide: DesignSlideRef;
  activeIndex: number;
  scope: DesignScope;
  disabled?: boolean;
  onScopeChange: (scope: DesignScope) => void;
  onChange: (patch: Partial<DesignSpec>) => void;
  onReset: () => void;
};

export function CarouselDesignEditor({ design, activeSlide, activeIndex, scope, disabled, onScopeChange, onChange, onReset }: Props) {
  const activeDesign = effectiveDesign(design, activeSlide, activeIndex);
  const patchScoped = (patch: Partial<DesignSpec>) => onChange(patch);
  const toggleElement = (id: string) => {
    onChange({ elements: activeDesign.elements.map((element) => element.id === id ? { ...element, visible: !element.visible } : element) });
  };

  return (
    <div className="cf-carousel-design-editor" aria-label="Editar design">
      <div className="cf-carousel-design-editor__heading">
        <div>
          <strong>Design da criação</strong>
          <p>Escolha o visual. O sistema usará essas escolhas na imagem final.</p>
        </div>
        <button type="button" className="is-quiet" onClick={onReset} disabled={disabled}>Restaurar IA</button>
      </div>

      <div className="cf-carousel-design-editor__scope">
        <span>Alterar</span>
        <button type="button" className={scope === 'all' ? 'is-active' : ''} onClick={() => onScopeChange('all')} disabled={disabled}>Todos os slides</button>
        <button type="button" className={scope === 'slide' ? 'is-active' : ''} onClick={() => onScopeChange('slide')} disabled={disabled}>Somente este slide</button>
      </div>

      <div className="cf-carousel-design-editor__row">
        <label>Plataforma
          <select value={activeDesign.platform} onChange={(event) => patchScoped({ platform: event.target.value })} disabled={disabled}>
            <option>Instagram</option><option>LinkedIn</option><option>TikTok</option><option>YouTube</option>
          </select>
        </label>
        <label>Formato
          <select value={activeDesign.aspectRatio} onChange={(event) => patchScoped({ aspectRatio: event.target.value, sizeId: event.target.value === '1:1' ? 'ig-square' : 'ig-portrait' })} disabled={disabled}>
            <option value="1:1">1:1 quadrado</option><option value="4:5">4:5 retrato</option><option value="9:16">9:16 vertical</option><option value="16:9">16:9 horizontal</option>
          </select>
        </label>
      </div>

      <fieldset>
        <legend>Paleta</legend>
        <div className="cf-design-choice-grid">
          {PALETTES.map((palette) => (
            <button type="button" key={palette.paletteId} className={activeDesign.palette.paletteId === palette.paletteId ? 'is-selected' : ''} onClick={() => patchScoped({ palette, background: { ...activeDesign.background, type: 'gradient', value: palette.gradient } })} disabled={disabled}>
              <span className="cf-design-swatch" style={{ background: palette.gradient, borderColor: palette.accent }} /><span>{palette.name}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Fonte</legend>
        <div className="cf-design-choice-grid cf-design-choice-grid--fonts">
          {FONTS.map((font) => (
            <button type="button" key={font.fontPairId} className={activeDesign.typography.fontPairId === font.fontPairId ? 'is-selected' : ''} onClick={() => patchScoped({ typography: { ...activeDesign.typography, ...font } })} disabled={disabled}>
              <strong style={{ fontFamily: font.headingFont }}>{font.name}</strong><small>{font.headingFont} + {font.bodyFont}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Cores personalizadas</legend>
        <div className="cf-carousel-design-editor__row">
          <label className="cf-design-color-field">Fundo
            <span><input type="color" value={activeDesign.palette.background} onChange={(event) => patchScoped({ palette: { ...activeDesign.palette, background: event.target.value }, background: { ...activeDesign.background, type: 'solid', value: event.target.value } })} disabled={disabled} />{activeDesign.palette.background}</span>
          </label>
          <label className="cf-design-color-field">Destaque
            <span><input type="color" value={activeDesign.palette.accent} onChange={(event) => patchScoped({ palette: { ...activeDesign.palette, accent: event.target.value } })} disabled={disabled} />{activeDesign.palette.accent}</span>
          </label>
        </div>
      </fieldset>

      <div className="cf-carousel-design-editor__row">
        <label>Layout
          <select value={activeDesign.layout.templateId} onChange={(event) => patchScoped({ layout: { ...activeDesign.layout, templateId: event.target.value } })} disabled={disabled}>
            <option value="carousel-cover">Capa com destaque</option><option value="text-card">Texto e imagem</option><option value="steps">Passo a passo</option><option value="comparison">Comparação</option>
          </select>
        </label>
        <label>Fundo
          <select value={activeDesign.background.type} onChange={(event) => patchScoped({ background: { ...activeDesign.background, type: event.target.value as DesignSpec['background']['type'], value: event.target.value === 'gradient' ? activeDesign.palette.gradient : undefined } })} disabled={disabled}>
            <option value="gradient">Gradiente</option><option value="solid">Cor sólida</option><option value="texture">Textura leve</option><option value="image">Imagem da IA</option>
          </select>
        </label>
      </div>

      <fieldset>
        <legend>Elementos</legend>
        <div className="cf-design-elements">
          {activeDesign.elements.map((element) => (
            <label key={element.id} className="cf-design-toggle"><input type="checkbox" checked={element.visible} onChange={() => toggleElement(element.id)} disabled={disabled} />{element.type === 'logo' ? 'Logo' : element.type === 'product' ? 'Produto' : element.type === 'shape' ? 'Formas' : element.type === 'icon' ? 'Ícones' : element.type === 'badge' ? 'Selo' : 'Divisor'}</label>
          ))}
        </div>
      </fieldset>

      <small className="cf-carousel-design-editor__hint">Modo híbrido selecionado: o visual escolhido será enviado no prompt e a copy aprovada seguirá separada para preservar sua edição.</small>
    </div>
  );
}
