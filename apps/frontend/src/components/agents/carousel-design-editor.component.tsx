'use client';


export type DesignElement = {
  id: string;
  type: 'logo' | 'product' | 'shape' | 'icon' | 'badge' | 'divider';
  visible: boolean;
};

// The style block is the single biggest lever on how the AI image actually
// looks. Unlike fonts (which an image model cannot render as a named typeface)
// these fields are stored as concrete English prompt fragments so the backend
// (compileDesignPrompt) can inject them verbatim into the image prompt, where
// gpt-image-2 honours them strongly.
export type DesignStyle = {
  presetId: string;
  presetName: string;
  visualStyle: string;
  lighting: string;
  mood: string;
  finish: string;
};

export type DesignSpec = {
  version: number;
  platform: string;
  aspectRatio: string;
  sizeId: string;
  style: DesignStyle;
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

export type DesignSlideRef = {
  id?: string;
  index?: number;
  imagePrompt?: string;
  visualDirection?: string;
  headline?: string;
};
export type DesignScope = 'all' | 'slide';

export const PALETTES: Array<DesignSpec['palette']> = [
  { paletteId: 'cobalt-cream', name: 'Azul & creme', background: '#F4F1E9', surface: '#FFFFFF', text: '#0B1B3A', muted: '#5A6B8C', accent: '#1E40FF', accent2: '#0B1B3A', gradient: 'radial-gradient(circle at top left, #dfe5ff, #f4f1e9 62%)' },
  { paletteId: 'midnight-neon', name: 'Noite neon', background: '#0A0A12', surface: '#14141F', text: '#F5F5FF', muted: '#9A9AB0', accent: '#00F0FF', accent2: '#FF2D95', gradient: 'radial-gradient(circle at top left, #213b52, #0a0a12 68%)' },
  { paletteId: 'mint-fresh', name: 'Menta fresco', background: '#EEF7F1', surface: '#FFFFFF', text: '#0F2A1E', muted: '#4E6B5E', accent: '#0FB57E', accent2: '#0A8C61', gradient: 'radial-gradient(circle at top right, #baf0d9, #eef7f1 66%)' },
  { paletteId: 'sunset-pop', name: 'Sunset vibrante', background: '#FF5E3A', surface: '#FF7A52', text: '#1A0B07', muted: '#7A2E14', accent: '#FFD23F', accent2: '#2D1810', gradient: 'radial-gradient(circle at top left, #ffbf65, #ff5e3a 68%)' },
  { paletteId: 'graphite-lime', name: 'Grafite & lima', background: '#14171A', surface: '#1E2226', text: '#F5F7F2', muted: '#9BA4A0', accent: '#BFFF38', accent2: '#5A6B2E', gradient: 'radial-gradient(circle at top left, #2c3a12, #14171a 66%)' },
  { paletteId: 'royal-gold', name: 'Púrpura & ouro', background: '#1A1030', surface: '#241640', text: '#F6F1FF', muted: '#A99BC8', accent: '#F5C451', accent2: '#7C4DFF', gradient: 'radial-gradient(circle at top left, #4a2d7a, #1a1030 68%)' },
  { paletteId: 'ocean-deep', name: 'Oceano profundo', background: '#07222B', surface: '#0E323E', text: '#EAF7F9', muted: '#7FA6AD', accent: '#2BD4C4', accent2: '#0B7285', gradient: 'radial-gradient(circle at top right, #124454, #07222b 66%)' },
  { paletteId: 'coral-sand', name: 'Coral & areia', background: '#FBEFE6', surface: '#FFFFFF', text: '#3A1E14', muted: '#8A6A5A', accent: '#FF6B4A', accent2: '#E0A96D', gradient: 'radial-gradient(circle at top left, #ffd9c2, #fbefe6 64%)' },
  { paletteId: 'rose-clay', name: 'Rosa & argila', background: '#F3E7E8', surface: '#FFFFFF', text: '#3B2230', muted: '#8A6674', accent: '#C24D6C', accent2: '#9A6250', gradient: 'radial-gradient(circle at top right, #f2cdd4, #f3e7e8 64%)' },
  { paletteId: 'mono-ink', name: 'Mono', background: '#FAFAF7', surface: '#FFFFFF', text: '#141414', muted: '#6B6B66', accent: '#141414', accent2: '#8A8A85', gradient: 'linear-gradient(160deg, #ffffff, #efefea 72%)' },
];

export const FONTS: Array<Pick<DesignSpec['typography'], 'fontPairId' | 'name' | 'headingFont' | 'bodyFont'>> = [
  { fontPairId: 'archivo-figtree', name: 'Moderna', headingFont: 'Archivo Black', bodyFont: 'Figtree' },
  { fontPairId: 'fraunces-grotesk', name: 'Editorial', headingFont: 'Fraunces', bodyFont: 'Space Grotesk' },
  { fontPairId: 'grotesk-mono', name: 'Tecnológica', headingFont: 'Space Grotesk', bodyFont: 'IBM Plex Mono' },
  { fontPairId: 'instrument-jakarta', name: 'Elegante', headingFont: 'Instrument Serif', bodyFont: 'Plus Jakarta Sans' },
];

// Granular building blocks. `prompt` is the exact English fragment injected into
// the image prompt; `label` is the Portuguese UI text.
export const VISUAL_STYLE_OPTIONS: Array<{ id: string; label: string; prompt: string }> = [
  { id: 'photo', label: 'Fotografia real', prompt: 'realistic professional photography, true-to-life textures and materials' },
  { id: 'flat', label: 'Ilustração flat', prompt: 'clean flat vector illustration, bold simple shapes, no gradients on the subject' },
  { id: '3d', label: 'Render 3D', prompt: 'soft 3D render, smooth rounded shapes, subtle depth of field' },
  { id: 'poster', label: 'Pôster gráfico', prompt: 'bold graphic poster design, strong shapes and high visual contrast' },
  { id: 'abstract', label: 'Abstrato minimal', prompt: 'minimalist abstract composition, refined geometric shapes and negative space' },
];

export const LIGHTING_OPTIONS: Array<{ id: string; label: string; prompt: string }> = [
  { id: 'soft', label: 'Suave e clara', prompt: 'soft bright studio lighting with gentle, even shadows' },
  { id: 'dramatic', label: 'Dramática', prompt: 'dramatic low-key cinematic lighting with deep directional shadows' },
  { id: 'natural', label: 'Natural', prompt: 'natural daylight, realistic soft ambient illumination' },
  { id: 'neon', label: 'Neon/luminosa', prompt: 'luminous neon accent lighting with a subtle glow' },
];

export const MOOD_OPTIONS: Array<{ id: string; label: string; prompt: string }> = [
  { id: 'minimal', label: 'Minimalista', prompt: 'clean, minimal, spacious, premium' },
  { id: 'corporate', label: 'Corporativo', prompt: 'professional, trustworthy, corporate, structured' },
  { id: 'energetic', label: 'Energético', prompt: 'energetic, vibrant, punchy, high-impact' },
  { id: 'sophisticated', label: 'Sofisticado', prompt: 'sophisticated, elegant, high-end, refined' },
  { id: 'friendly', label: 'Amigável', prompt: 'friendly, warm, approachable, human' },
];

// Ready-made looks. Each bundles a complete, coherent visual direction —
// style fragments, the palette that matches, and a layout density — so one
// click gives a professional result; the user can then fine-tune any
// dimension below. `density` mirrors layout.density, which the backend
// injects into the image prompt.
export type StylePreset = {
  presetId: string;
  presetName: string;
  paletteId: string;
  visualStyle: string;
  lighting: string;
  mood: string;
  finish: string;
  density: DesignSpec['layout']['density'];
};

export const STYLE_PRESETS: StylePreset[] = [
  { presetId: 'photo-clean', presetName: 'Foto limpa', paletteId: 'cobalt-cream', visualStyle: VISUAL_STYLE_OPTIONS[0].prompt, lighting: LIGHTING_OPTIONS[0].prompt, mood: MOOD_OPTIONS[0].prompt, finish: 'crisp high-end commercial finish, sharp focus', density: 'airy' },
  { presetId: 'dark-premium', presetName: 'Premium escuro', paletteId: 'midnight-neon', visualStyle: 'cinematic realistic product photography, rich reflective materials', lighting: LIGHTING_OPTIONS[1].prompt, mood: MOOD_OPTIONS[3].prompt, finish: 'matte high-end cinematic finish, film-like grain', density: 'balanced' },
  { presetId: 'flat-editorial', presetName: 'Editorial flat', paletteId: 'graphite-lime', visualStyle: VISUAL_STYLE_OPTIONS[1].prompt, lighting: 'even flat lighting, no harsh shadows', mood: MOOD_OPTIONS[1].prompt, finish: 'clean confident editorial finish, precise geometry', density: 'balanced' },
  { presetId: 'bold-pop', presetName: 'Vibrante pop', paletteId: 'sunset-pop', visualStyle: VISUAL_STYLE_OPTIONS[3].prompt, lighting: 'high-contrast punchy lighting', mood: MOOD_OPTIONS[2].prompt, finish: 'saturated bold poster finish', density: 'balanced' },
  { presetId: 'render-3d', presetName: '3D suave', paletteId: 'mint-fresh', visualStyle: VISUAL_STYLE_OPTIONS[2].prompt, lighting: 'soft diffused studio lighting', mood: MOOD_OPTIONS[4].prompt, finish: 'glossy soft clay 3D finish', density: 'airy' },
  { presetId: 'tech-gradient', presetName: 'Tech neon', paletteId: 'ocean-deep', visualStyle: 'sleek futuristic tech aesthetic with subtle abstract geometry', lighting: LIGHTING_OPTIONS[3].prompt, mood: 'futuristic, modern, premium', finish: 'glossy luminous finish', density: 'balanced' },
  { presetId: 'classic-luxury', presetName: 'Luxo clássico', paletteId: 'royal-gold', visualStyle: 'luxury still-life photography, rich fabrics, marble and warm metallic accents', lighting: LIGHTING_OPTIONS[1].prompt, mood: MOOD_OPTIONS[3].prompt, finish: 'opulent finish, deep shadows and warm golden highlights', density: 'airy' },
  { presetId: 'warm-authentic', presetName: 'Caloroso autêntico', paletteId: 'coral-sand', visualStyle: 'authentic lifestyle photography, real people in natural everyday moments', lighting: LIGHTING_OPTIONS[2].prompt, mood: MOOD_OPTIONS[4].prompt, finish: 'warm organic finish, soft film-like tones', density: 'balanced' },
  { presetId: 'soft-cozy', presetName: 'Acolhedor suave', paletteId: 'rose-clay', visualStyle: 'soft stylized illustration, rounded organic shapes and gentle tactile textures', lighting: 'soft diffused ambient lighting', mood: 'calm, caring, comforting, intimate', finish: 'matte pastel finish', density: 'airy' },
  { presetId: 'mono-minimal', presetName: 'Mono minimal', paletteId: 'mono-ink', visualStyle: 'bold monochrome composition, single clear subject, maximum negative space', lighting: 'clean even lighting with crisp defined shadows', mood: MOOD_OPTIONS[0].prompt, finish: 'high-contrast monochrome finish', density: 'airy' },
];

const paletteById = (id: string) => PALETTES.find((palette) => palette.paletteId === id) || PALETTES[0];

export const styleFromPreset = (preset: StylePreset): DesignStyle => ({
  presetId: preset.presetId,
  presetName: preset.presetName,
  visualStyle: preset.visualStyle,
  lighting: preset.lighting,
  mood: preset.mood,
  finish: preset.finish,
});

const DEFAULT_ELEMENTS: DesignElement[] = [
  { id: 'logo', type: 'logo', visible: true },
  { id: 'product', type: 'product', visible: true },
  { id: 'shape', type: 'shape', visible: true },
  { id: 'icon', type: 'icon', visible: false },
  { id: 'badge', type: 'badge', visible: false },
  { id: 'divider', type: 'divider', visible: false },
];

export const createDefaultDesign = (aspectRatio = '4:5'): DesignSpec => ({
  version: 2,
  platform: 'Instagram',
  aspectRatio,
  sizeId: aspectRatio === '1:1' ? 'ig-square' : 'ig-portrait',
  style: styleFromPreset(STYLE_PRESETS[0]),
  palette: paletteById(STYLE_PRESETS[0].paletteId),
  typography: { ...FONTS[0], scale: 'balanced', alignment: 'left' },
  layout: { templateId: 'carousel-cover', density: 'balanced', safePadding: 'balanced' },
  background: { type: 'gradient', value: paletteById(STYLE_PRESETS[0].paletteId).gradient, opacity: 1 },
  elements: DEFAULT_ELEMENTS,
  renderMode: 'hybrid',
  slideOverrides: {},
});

export const mergeDesign = (base: DesignSpec, patch: Partial<DesignSpec>): DesignSpec => ({
  ...base,
  ...patch,
  style: { ...base.style, ...(patch.style || {}) },
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

// Drops one slide's override so it falls back to the shared design, leaving
// every other slide's override (and the shared design itself) untouched.
// Used by "Restaurar IA" when scoped to a single slide - resetting one slide
// must never discard customizations made to the others.
export const removeSlideOverride = (design: DesignSpec, key: string): DesignSpec => {
  if (!design.slideOverrides || !(key in design.slideOverrides)) return design;
  const { [key]: _removed, ...rest } = design.slideOverrides;
  return { ...design, slideOverrides: rest };
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
  onImagePromptChange?: (value: string) => void;
};

export function CarouselDesignEditor({ design, activeSlide, activeIndex, scope, disabled, onScopeChange, onChange, onReset, onImagePromptChange }: Props) {
  const activeDesign = effectiveDesign(design, activeSlide, activeIndex);
  const patchScoped = (patch: Partial<DesignSpec>) => onChange(patch);
  const toggleElement = (id: string) => {
    onChange({ elements: activeDesign.elements.map((element) => element.id === id ? { ...element, visible: !element.visible } : element) });
  };
  // Editing any single style dimension detaches from the named preset so the UI
  // stops implying the whole preset is still active.
  const patchStyle = (patch: Partial<DesignStyle>) => patchScoped({
    style: { ...activeDesign.style, ...patch, presetId: 'custom', presetName: 'Personalizado' },
  });
  const applyPreset = (preset: StylePreset) => patchScoped({
    style: styleFromPreset(preset),
    palette: paletteById(preset.paletteId),
    background: { ...activeDesign.background, type: 'gradient', value: paletteById(preset.paletteId).gradient },
    layout: { ...activeDesign.layout, density: preset.density },
  });
  const matchOption = (options: Array<{ prompt: string }>, value: string) =>
    options.some((option) => option.prompt === value) ? value : '';

  return (
    <div className="cf-carousel-design-editor" aria-label="Editar design">
      <div className="cf-carousel-design-editor__heading">
        <div>
          <strong>Design da criação</strong>
          <p>Escolha um estilo pronto ou ajuste cada detalhe. Tudo isso vai direto no prompt da imagem gerada pela IA.</p>
        </div>
        <button type="button" className="is-quiet" onClick={onReset} disabled={disabled}>
          {scope === 'slide' ? 'Restaurar este slide' : 'Restaurar todos os slides'}
        </button>
      </div>

      <div className="cf-segmented" role="group" aria-label="Escopo das mudanças">
        <button type="button" className={scope === 'all' ? 'is-active' : ''} onClick={() => onScopeChange('all')} disabled={disabled}>Todos os slides</button>
        <button type="button" className={scope === 'slide' ? 'is-active' : ''} onClick={() => onScopeChange('slide')} disabled={disabled}>Somente este slide</button>
      </div>

      <fieldset>
        <legend>Estilo visual <span className="cf-design-tag">maior impacto</span></legend>
        <div className="cf-design-style-grid">
          {STYLE_PRESETS.map((preset) => {
            const palette = paletteById(preset.paletteId);
            return (
              <button
                type="button"
                key={preset.presetId}
                className={`cf-design-style-card ${activeDesign.style.presetId === preset.presetId ? 'is-selected' : ''}`}
                onClick={() => applyPreset(preset)}
                disabled={disabled}
                aria-pressed={activeDesign.style.presetId === preset.presetId}
              >
                <span className="cf-design-style-card__preview" style={{ background: palette.gradient }}>
                  <span className="cf-design-style-card__chip" style={{ background: palette.accent }} />
                  <span className="cf-design-style-card__chip cf-design-style-card__chip--second" style={{ background: palette.accent2 }} />
                </span>
                <strong>{preset.presetName}</strong>
              </button>
            );
          })}
        </div>
      </fieldset>

      {onImagePromptChange && (
        <fieldset>
          <legend>Direção da imagem deste slide</legend>
          {scope === 'slide' ? (
            <label className="cf-design-imageprompt">
              <textarea
                value={activeSlide.imagePrompt || activeSlide.visualDirection || ''}
                onChange={(event) => onImagePromptChange(event.target.value)}
                placeholder="Descreva a arte deste slide: cena, objeto focal, enquadramento, ambiente…"
                rows={3}
                disabled={disabled}
              />
              <small>A direção de arte vai no prompt da imagem — é a maior alavanca sobre o que a IA gera. Em inglês funciona melhor.</small>
            </label>
          ) : (
            <small>A direção de arte é individual: mude o escopo para “Somente este slide” para editá-la.</small>
          )}
        </fieldset>
      )}

      <fieldset>
        <legend>Ajuste fino do visual</legend>
        <div className="cf-carousel-design-editor__row">
          <label>Estilo
            <select value={matchOption(VISUAL_STYLE_OPTIONS, activeDesign.style.visualStyle)} onChange={(event) => patchStyle({ visualStyle: event.target.value })} disabled={disabled}>
              {!matchOption(VISUAL_STYLE_OPTIONS, activeDesign.style.visualStyle) && <option value={activeDesign.style.visualStyle}>Do preset</option>}
              {VISUAL_STYLE_OPTIONS.map((option) => <option key={option.id} value={option.prompt}>{option.label}</option>)}
            </select>
          </label>
          <label>Luz
            <select value={matchOption(LIGHTING_OPTIONS, activeDesign.style.lighting)} onChange={(event) => patchStyle({ lighting: event.target.value })} disabled={disabled}>
              {!matchOption(LIGHTING_OPTIONS, activeDesign.style.lighting) && <option value={activeDesign.style.lighting}>Do preset</option>}
              {LIGHTING_OPTIONS.map((option) => <option key={option.id} value={option.prompt}>{option.label}</option>)}
            </select>
          </label>
          <label>Clima
            <select value={matchOption(MOOD_OPTIONS, activeDesign.style.mood)} onChange={(event) => patchStyle({ mood: event.target.value })} disabled={disabled}>
              {!matchOption(MOOD_OPTIONS, activeDesign.style.mood) && <option value={activeDesign.style.mood}>Do preset</option>}
              {MOOD_OPTIONS.map((option) => <option key={option.id} value={option.prompt}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Paleta de cores</legend>
        <div className="cf-design-choice-grid">
          {PALETTES.map((palette) => (
            <button type="button" key={palette.paletteId} className={activeDesign.palette.paletteId === palette.paletteId ? 'is-selected' : ''} onClick={() => patchScoped({ palette, background: { ...activeDesign.background, type: 'gradient', value: palette.gradient } })} disabled={disabled} aria-pressed={activeDesign.palette.paletteId === palette.paletteId}>
              <span className="cf-design-swatch" style={{ background: palette.gradient, borderColor: palette.accent }} /><span>{palette.name}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Cores personalizadas</legend>
        <div className="cf-design-colors">
          <label className="cf-design-color-field">Fundo
            <span><input type="color" value={activeDesign.palette.background} onChange={(event) => patchScoped({ palette: { ...activeDesign.palette, background: event.target.value }, background: { ...activeDesign.background, type: 'solid', value: event.target.value } })} disabled={disabled} />{activeDesign.palette.background}</span>
          </label>
          <label className="cf-design-color-field">Texto principal
            <span><input type="color" value={activeDesign.palette.text} onChange={(event) => patchScoped({ palette: { ...activeDesign.palette, text: event.target.value } })} disabled={disabled} />{activeDesign.palette.text}</span>
          </label>
          <label className="cf-design-color-field">Texto secundário
            <span><input type="color" value={activeDesign.palette.muted} onChange={(event) => patchScoped({ palette: { ...activeDesign.palette, muted: event.target.value } })} disabled={disabled} />{activeDesign.palette.muted}</span>
          </label>
          <label className="cf-design-color-field">Destaque
            <span><input type="color" value={activeDesign.palette.accent} onChange={(event) => patchScoped({ palette: { ...activeDesign.palette, accent: event.target.value } })} disabled={disabled} />{activeDesign.palette.accent}</span>
          </label>
        </div>
      </fieldset>

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
        <label>Margem interna
          <select value={activeDesign.layout.safePadding} onChange={(event) => patchScoped({ layout: { ...activeDesign.layout, safePadding: event.target.value as DesignSpec['layout']['safePadding'] } })} disabled={disabled}>
            <option value="compact">Compacta</option><option value="balanced">Confortável</option><option value="airy">Ampla</option>
          </select>
        </label>
        <label>Densidade
          <select value={activeDesign.layout.density} onChange={(event) => patchScoped({ layout: { ...activeDesign.layout, density: event.target.value as DesignSpec['layout']['density'] } })} disabled={disabled}>
            <option value="airy">Leve</option><option value="balanced">Equilibrada</option><option value="dense">Densa</option>
          </select>
        </label>
      </div>

      <fieldset>
        <legend>Tipografia da prévia</legend>
        <div className="cf-design-choice-grid cf-design-choice-grid--fonts">
          {FONTS.map((font) => (
            <button type="button" key={font.fontPairId} className={activeDesign.typography.fontPairId === font.fontPairId ? 'is-selected' : ''} onClick={() => patchScoped({ typography: { ...activeDesign.typography, ...font } })} disabled={disabled} aria-pressed={activeDesign.typography.fontPairId === font.fontPairId}>
              <strong style={{ fontFamily: font.headingFont }}>{font.name}</strong><small>{font.headingFont} + {font.bodyFont}</small>
            </button>
          ))}
        </div>
        <div className="cf-carousel-design-editor__row">
          <label>Escala do texto
            <select value={activeDesign.typography.scale} onChange={(event) => patchScoped({ typography: { ...activeDesign.typography, scale: event.target.value as DesignSpec['typography']['scale'] } })} disabled={disabled}>
              <option value="compact">Compacta</option><option value="balanced">Equilibrada</option><option value="expressive">Expressiva</option>
            </select>
          </label>
          <label>Alinhamento
            <select value={activeDesign.typography.alignment} onChange={(event) => patchScoped({ typography: { ...activeDesign.typography, alignment: event.target.value as DesignSpec['typography']['alignment'] } })} disabled={disabled}>
              <option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Elementos</legend>
        <div className="cf-design-elements">
          {activeDesign.elements.map((element) => {
            const label = element.type === 'logo' ? 'Logo' : element.type === 'product' ? 'Produto' : element.type === 'shape' ? 'Formas' : element.type === 'icon' ? 'Ícones' : element.type === 'badge' ? 'Selo' : 'Divisor';
            return (
              <button type="button" key={element.id} className="cf-design-chip" aria-pressed={element.visible} onClick={() => toggleElement(element.id)} disabled={disabled}>
                <span className="cf-design-chip__dot" />{label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <small className="cf-carousel-design-editor__hint">Estilo, luz, clima, paleta, cores, layout, elementos e a direção de imagem vão no prompt gerado pela IA. Fontes e escala afetam a prévia do card; o alinhamento do texto também é enviado à IA.</small>
    </div>
  );
}
