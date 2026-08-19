// Single source of truth for the carousel design catalogue — palettes, style
// presets, fonts and the granular style building blocks. Originally declared
// only inside the Studio's design editor (a 'use client' component,
// apps/frontend/src/components/agents/carousel-design-editor.component.tsx),
// which the backend cannot import. carousel-default-design-spec.ts had to
// hand-copy one preset's values to build a default for headless (MCP)
// carousels, which meant any future edit to the frontend catalogue would
// silently desync from that backend default. Moving the data itself here and
// having both sides import from it removes that drift risk permanently.
//
// Values are copied verbatim from the frontend editor, unchanged — this is a
// data move, not a redesign.

export type CarouselPalette = {
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

export const PALETTES: CarouselPalette[] = [
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

export const paletteById = (id: string): CarouselPalette =>
  PALETTES.find((palette) => palette.paletteId === id) || PALETTES[0];

export type CarouselFontPair = {
  fontPairId: string;
  name: string;
  headingFont: string;
  bodyFont: string;
};

export const FONTS: CarouselFontPair[] = [
  { fontPairId: 'archivo-figtree', name: 'Moderna', headingFont: 'Archivo Black', bodyFont: 'Figtree' },
  { fontPairId: 'fraunces-grotesk', name: 'Editorial', headingFont: 'Fraunces', bodyFont: 'Space Grotesk' },
  { fontPairId: 'grotesk-mono', name: 'Tecnológica', headingFont: 'Space Grotesk', bodyFont: 'IBM Plex Mono' },
  { fontPairId: 'instrument-jakarta', name: 'Elegante', headingFont: 'Instrument Serif', bodyFont: 'Plus Jakarta Sans' },
];

export const fontById = (id: string): CarouselFontPair =>
  FONTS.find((font) => font.fontPairId === id) || FONTS[0];

// Granular building blocks. `prompt` is the exact English fragment injected
// into the image prompt; `label` is the Portuguese UI text.
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
// click (or one MCP call with a stylePresetId) gives a professional result.
export type StylePreset = {
  presetId: string;
  presetName: string;
  /** Short Portuguese description, for surfacing real options in conversation (e.g. MCP carousel-styles lookup). */
  description: string;
  paletteId: string;
  visualStyle: string;
  lighting: string;
  mood: string;
  finish: string;
  density: 'airy' | 'balanced' | 'dense';
};

export const STYLE_PRESETS: StylePreset[] = [
  { presetId: 'photo-clean', presetName: 'Foto limpa', description: 'Fotografia comercial limpa, luz suave, paleta azul & creme.', paletteId: 'cobalt-cream', visualStyle: VISUAL_STYLE_OPTIONS[0].prompt, lighting: LIGHTING_OPTIONS[0].prompt, mood: MOOD_OPTIONS[0].prompt, finish: 'crisp high-end commercial finish, sharp focus', density: 'airy' },
  { presetId: 'dark-premium', presetName: 'Premium escuro', description: 'Fotografia cinematográfica, tons escuros, luz dramática.', paletteId: 'midnight-neon', visualStyle: 'cinematic realistic product photography, rich reflective materials', lighting: LIGHTING_OPTIONS[1].prompt, mood: MOOD_OPTIONS[3].prompt, finish: 'matte high-end cinematic finish, film-like grain', density: 'balanced' },
  { presetId: 'flat-editorial', presetName: 'Editorial flat', description: 'Ilustração flat editorial, luz uniforme, paleta grafite & lima.', paletteId: 'graphite-lime', visualStyle: VISUAL_STYLE_OPTIONS[1].prompt, lighting: 'even flat lighting, no harsh shadows', mood: MOOD_OPTIONS[1].prompt, finish: 'clean confident editorial finish, precise geometry', density: 'balanced' },
  { presetId: 'bold-pop', presetName: 'Vibrante pop', description: 'Pôster gráfico de alto contraste, cores vibrantes tipo sunset.', paletteId: 'sunset-pop', visualStyle: VISUAL_STYLE_OPTIONS[3].prompt, lighting: 'high-contrast punchy lighting', mood: MOOD_OPTIONS[2].prompt, finish: 'saturated bold poster finish', density: 'balanced' },
  { presetId: 'render-3d', presetName: '3D suave', description: 'Render 3D suave, formas arredondadas, paleta menta fresco.', paletteId: 'mint-fresh', visualStyle: VISUAL_STYLE_OPTIONS[2].prompt, lighting: 'soft diffused studio lighting', mood: MOOD_OPTIONS[4].prompt, finish: 'glossy soft clay 3D finish', density: 'airy' },
  { presetId: 'tech-gradient', presetName: 'Tech neon', description: 'Estética tech futurista, geometria abstrata, paleta oceano profundo.', paletteId: 'ocean-deep', visualStyle: 'sleek futuristic tech aesthetic with subtle abstract geometry', lighting: LIGHTING_OPTIONS[3].prompt, mood: 'futuristic, modern, premium', finish: 'glossy luminous finish', density: 'balanced' },
  { presetId: 'classic-luxury', presetName: 'Luxo clássico', description: 'Still-life de luxo, mármore e metais quentes, paleta púrpura & ouro.', paletteId: 'royal-gold', visualStyle: 'luxury still-life photography, rich fabrics, marble and warm metallic accents', lighting: LIGHTING_OPTIONS[1].prompt, mood: MOOD_OPTIONS[3].prompt, finish: 'opulent finish, deep shadows and warm golden highlights', density: 'airy' },
  { presetId: 'warm-authentic', presetName: 'Caloroso autêntico', description: 'Fotografia lifestyle autêntica, pessoas reais, paleta coral & areia.', paletteId: 'coral-sand', visualStyle: 'authentic lifestyle photography, real people in natural everyday moments', lighting: LIGHTING_OPTIONS[2].prompt, mood: MOOD_OPTIONS[4].prompt, finish: 'warm organic finish, soft film-like tones', density: 'balanced' },
  { presetId: 'soft-cozy', presetName: 'Acolhedor suave', description: 'Ilustração suave e orgânica, texturas táteis, paleta rosa & argila.', paletteId: 'rose-clay', visualStyle: 'soft stylized illustration, rounded organic shapes and gentle tactile textures', lighting: 'soft diffused ambient lighting', mood: 'calm, caring, comforting, intimate', finish: 'matte pastel finish', density: 'airy' },
  { presetId: 'mono-minimal', presetName: 'Mono minimal', description: 'Composição monocromática de alto contraste, máximo espaço negativo.', paletteId: 'mono-ink', visualStyle: 'bold monochrome composition, single clear subject, maximum negative space', lighting: 'clean even lighting with crisp defined shadows', mood: MOOD_OPTIONS[0].prompt, finish: 'high-contrast monochrome finish', density: 'airy' },
];

export const presetById = (id: string): StylePreset =>
  STYLE_PRESETS.find((preset) => preset.presetId === id) || STYLE_PRESETS[0];

export const styleFromPreset = (preset: StylePreset) => ({
  presetId: preset.presetId,
  presetName: preset.presetName,
  visualStyle: preset.visualStyle,
  lighting: preset.lighting,
  mood: preset.mood,
  finish: preset.finish,
});
