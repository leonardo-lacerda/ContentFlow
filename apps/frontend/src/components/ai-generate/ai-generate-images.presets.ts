// Blocos visuais prontos: a pessoa escolhe em vez de escrever prompt.
// "Estrutura" cuida do layout/copy; "Cor", "Estilo" e "Tipografia" cuidam do
// visual. Quando há inspirações comandando, os 3 últimos saem do prompt e as
// imagens anexadas assumem o visual (ver buildSlideImagePrompt).

export type StructurePreset = {
  id: string;
  label: string;
  description: string;
  layout: string;
};

export type ColorPreset = {
  id: string;
  label: string;
  swatch: string[];
  // Quando vazio, usa as cores do Brand Kit do usuário (preset "brand").
  prompt: string;
};

export type StylePreset = {
  id: string;
  label: string;
  prompt: string;
};

export type TypographyPreset = {
  id: string;
  label: string;
  prompt: string;
};

export const structurePresets: StructurePreset[] = [
  {
    id: 'auto',
    label: 'Automático',
    description: 'A IA decide o melhor layout pelo conteúdo de cada slide.',
    layout: '',
  },
  {
    id: 'headline',
    label: 'Manchete gigante',
    description: 'Título enorme dominando a tela, fundo limpo.',
    layout:
      'título enorme dominando a tela, fundo limpo com muito espaço negativo, pouco ou nenhum elemento gráfico, alinhamento à esquerda ou centralizado.',
  },
  {
    id: 'numbered-list',
    label: 'Lista numerada',
    description: 'Número grande em destaque + título e apoio.',
    layout:
      'número grande em destaque no topo ou na lateral, seguido do título e do texto de apoio; visual de lista escaneável.',
  },
  {
    id: 'stat',
    label: 'Estatística em destaque',
    description: 'Um número/percentual gigante com legenda.',
    layout:
      'um número ou percentual gigante como elemento central da arte, com uma legenda curta abaixo explicando o dado.',
  },
  {
    id: 'quote',
    label: 'Citação / impacto',
    description: 'Frase de impacto centralizada.',
    layout:
      'frase de impacto centralizada como citação editorial, com aspas ou marca de destaque e bastante espaço negativo ao redor.',
  },
  {
    id: 'before-after',
    label: 'Antes × Depois',
    description: 'Tela dividida contrastando dois estados.',
    layout:
      'composição dividida em duas metades contrastando o estado atual e o estado desejado, com rótulos claros em cada lado.',
  },
  {
    id: 'steps',
    label: 'Passo a passo',
    description: 'Indicador de etapa + título da etapa.',
    layout:
      'indicador de etapa em destaque (ex.: Passo 2 de 5), título da etapa grande e um apoio curto abaixo.',
  },
  {
    id: 'cover',
    label: 'Capa / abertura',
    description: 'Título + subtítulo + selo da marca.',
    layout:
      'capa premium com título principal grande, subtítulo de apoio e um pequeno selo/etiqueta discreto da marca.',
  },
  {
    id: 'question',
    label: 'Pergunta provocativa',
    description: 'Pergunta curta como elemento dominante.',
    layout:
      'uma pergunta curta e provocativa como elemento dominante, tipografia grande e fundo com leve textura.',
  },
];

export const colorPresets: ColorPreset[] = [
  {
    id: 'brand',
    label: 'Cores da minha marca',
    swatch: [],
    prompt: '',
  },
  {
    id: 'light-min',
    label: 'Minimalista claro',
    swatch: ['#FAFAF8', '#111111', '#E5E2DD'],
    prompt:
      'fundo off-white claro, texto quase preto e acentos sutis em cinza claro; visual limpo e minimalista.',
  },
  {
    id: 'dark-premium',
    label: 'Dark premium',
    swatch: ['#0B0B0F', '#F5F5F5', '#C9A227'],
    prompt:
      'fundo escuro profundo, texto claro de alto contraste e um acento dourado/metálico discreto; sofisticado e premium.',
  },
  {
    id: 'vibrant',
    label: 'Vibrante',
    swatch: ['#FF3D54', '#FFD23F', '#1E1E1E'],
    prompt:
      'cores vibrantes e saturadas com contraste forte, energia jovem e moderna.',
  },
  {
    id: 'pastel',
    label: 'Pastel suave',
    swatch: ['#F6D5E0', '#CDE7E1', '#3A3A3A'],
    prompt:
      'paleta pastel suave e acolhedora, tons claros e delicados com texto escuro legível.',
  },
  {
    id: 'earthy',
    label: 'Terroso / natural',
    swatch: ['#E7DDCB', '#7A5C3E', '#2E2A24'],
    prompt:
      'tons terrosos e naturais (bege, marrom, verde-oliva), atmosfera orgânica e calorosa.',
  },
  {
    id: 'blue-corporate',
    label: 'Azul corporativo',
    swatch: ['#0B5CFF', '#FFFFFF', '#0A2540'],
    prompt:
      'azul corporativo confiável com branco e azul-marinho, visual profissional e tecnológico.',
  },
];

export const stylePresets: StylePreset[] = [
  { id: 'auto', label: 'Automático', prompt: '' },
  {
    id: 'editorial',
    label: 'Editorial minimalista',
    prompt:
      'arte editorial minimalista de revista premium, muito espaço negativo e composição sofisticada.',
  },
  {
    id: 'photo',
    label: 'Foto realista',
    prompt:
      'fotografia realista de alta qualidade, iluminação natural, profundidade de campo e aparência autêntica.',
  },
  {
    id: 'flat',
    label: 'Ilustração flat',
    prompt:
      'ilustração flat moderna, formas geométricas limpas, sem gradientes pesados, visual de design contemporâneo.',
  },
  {
    id: 'render3d',
    label: '3D render',
    prompt:
      'render 3D moderno, objetos com volume e iluminação suave, aparência tátil e premium.',
  },
  {
    id: 'gradient',
    label: 'Gradiente moderno',
    prompt:
      'fundos com gradientes suaves e modernos, atmosfera tech e fluida.',
  },
  {
    id: 'collage',
    label: 'Colagem / recortes',
    prompt:
      'estética de colagem com recortes, sobreposição de elementos e textura analógica.',
  },
];

export const typographyPresets: TypographyPreset[] = [
  { id: 'auto', label: 'Automático', prompt: '' },
  {
    id: 'sans-bold',
    label: 'Sans bold moderno',
    prompt:
      'tipografia sans-serif pesada e moderna, títulos em bold com alta legibilidade.',
  },
  {
    id: 'serif-elegant',
    label: 'Serif elegante',
    prompt:
      'tipografia serifada elegante e editorial nos títulos, com sans limpa no apoio.',
  },
  {
    id: 'display-condensed',
    label: 'Display condensada',
    prompt:
      'tipografia display condensada e impactante nos títulos, estilo pôster.',
  },
  {
    id: 'mono-tech',
    label: 'Mono / técnica',
    prompt:
      'tipografia monoespaçada/técnica para um visual moderno e preciso.',
  },
];

export const defaultVisualPresets = {
  structurePreset: 'auto',
  colorPreset: 'brand',
  stylePreset: 'auto',
  typographyPreset: 'auto',
} as const;

export const findStructurePreset = (id: string) =>
  structurePresets.find((preset) => preset.id === id) || structurePresets[0];
export const findColorPreset = (id: string) =>
  colorPresets.find((preset) => preset.id === id) || colorPresets[0];
export const findStylePreset = (id: string) =>
  stylePresets.find((preset) => preset.id === id) || stylePresets[0];
export const findTypographyPreset = (id: string) =>
  typographyPresets.find((preset) => preset.id === id) || typographyPresets[0];
