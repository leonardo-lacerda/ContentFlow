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

// ---------------------------------------------------------------------------
// Direção Criativa — 6 eixos de características visuais.
//
// Cada opção carrega um fragmento de prompt determinístico (`prompt`). O
// compilador (direction-compiler.ts) resolve as 6 escolhas em fragmentos e os
// injeta no buildSlideImagePrompt já existente. Sem imagens de referência: a
// direção nasce da estratégia (template + objetivo + plataforma + Brand Kit).
// ---------------------------------------------------------------------------

export type DirectionAxisOption = {
  id: string;
  label: string;
  prompt: string;
  hint?: string;
};

// Estilo editorial: cada opção é um "design system" fechado (paleta + tipo +
// textura + atmosfera). Substitui e expande o antigo stylePresets.
export const editorialPresets: DirectionAxisOption[] = [
  {
    id: 'editorial-premium',
    label: 'Editorial premium',
    hint: 'Cara de revista cara e sofisticada',
    prompt:
      'estética editorial premium de revista sofisticada, tipografia serifada forte combinada com sans limpa, muito espaço negativo, paleta sóbria e contraste elegante.',
  },
  {
    id: 'corporativo-moderno',
    label: 'Corporativo moderno',
    hint: 'Sério e profissional, de empresa',
    prompt:
      'visual corporativo moderno e confiável, grid organizado, tipografia sans-serif limpa, paleta neutra com um acento de marca, aparência profissional.',
  },
  {
    id: 'tech-futurista',
    label: 'Tech futurista',
    hint: 'Escuro e moderno, cara de app/tech',
    prompt:
      'estética tech futurista, fundos escuros, acentos luminosos sutis, tipografia geométrica, sensação de produto digital de ponta.',
  },
  {
    id: 'minimalista',
    label: 'Minimalista',
    hint: 'Quase nada na tela, só o essencial',
    prompt:
      'minimalismo radical, quase nenhum elemento gráfico, foco total na tipografia e no espaço negativo.',
  },
  {
    id: 'luxo',
    label: 'Luxo',
    hint: 'Sofisticado, escuro com toque dourado',
    prompt:
      'estética de luxo, paleta escura ou monocromática com acento metálico/dourado discreto, tipografia serifada refinada, sensação premium e exclusiva.',
  },
  {
    id: 'bold',
    label: 'Bold',
    hint: 'Forte e chamativo, letras e cores grandes',
    prompt:
      'visual bold e impactante, tipografia display pesada, blocos de cor sólidos, alto contraste e energia.',
  },
  {
    id: 'clean',
    label: 'Clean',
    hint: 'Claro, limpo e bem organizado',
    prompt:
      'visual clean e arejado, fundo claro, formas simples, tipografia sans neutra, organização impecável.',
  },
  {
    id: 'revista',
    label: 'Revista',
    hint: 'Diagramado como página de revista',
    prompt:
      'diagramação de revista impressa, colunas, fios e marcadores editoriais, hierarquia tipográfica rica.',
  },
  {
    id: 'startup',
    label: 'Startup',
    hint: 'Jovem, colorido e otimista',
    prompt:
      'estética de startup moderna, formas geométricas e cores vivas equilibradas, tom acessível e otimista.',
  },
  {
    id: 'institucional',
    label: 'Institucional',
    hint: 'Sóbrio e sério, passa credibilidade',
    prompt:
      'visual institucional sóbrio, paleta restrita, tipografia formal, sensação de credibilidade e solidez.',
  },
];

// Hierarquia visual: peso relativo entre texto e elementos visuais.
export const hierarchyPresets: DirectionAxisOption[] = [
  {
    id: 'text-dominant',
    label: 'Texto dominante',
    hint: 'O texto manda; pouca imagem',
    prompt:
      'o texto é o elemento dominante: headline grande ocupando a maior parte da arte, elementos visuais reduzidos a apoio.',
  },
  {
    id: 'balanced',
    label: 'Equilibrado',
    hint: 'Texto e imagem com peso parecido',
    prompt:
      'equilíbrio entre texto e elementos visuais, com hierarquia clara entre headline, apoio e gráficos.',
  },
  {
    id: 'visual-dominant',
    label: 'Visual dominante',
    hint: 'A imagem manda; pouco texto',
    prompt:
      'o elemento visual domina a composição; o texto aparece curto e direto, integrado à imagem.',
  },
];

// Densidade visual: quantidade de elementos e espaço negativo.
export const densityPresets: DirectionAxisOption[] = [
  {
    id: 'minimal',
    label: 'Minimalista',
    hint: 'Bem vazio, muito espaço sobrando',
    prompt:
      'pouquíssimos elementos, máximo espaço negativo, composição respirada.',
  },
  {
    id: 'medium',
    label: 'Média',
    hint: 'Alguns elementos, sem poluir',
    prompt:
      'densidade média, alguns elementos de apoio organizados sem poluir.',
  },
  {
    id: 'rich',
    label: 'Rica',
    hint: 'Cheio de elementos e detalhes',
    prompt:
      'composição rica em elementos visuais, camadas e detalhes, mantendo a legibilidade do texto.',
  },
];

// Composição: sistema de layout-base do carrossel.
export const compositionPresets: DirectionAxisOption[] = [
  {
    id: 'centered',
    label: 'Centralizada',
    hint: 'Tudo no meio, simétrico',
    prompt: 'composição centralizada, elementos alinhados ao centro com simetria.',
  },
  {
    id: 'asymmetric',
    label: 'Assimétrica',
    hint: 'Desalinhado de propósito, dinâmico',
    prompt:
      'composição assimétrica e dinâmica, com tensão visual e alinhamentos deslocados.',
  },
  {
    id: 'grid',
    label: 'Grid (grade)',
    hint: 'Alinhado em colunas e linhas',
    prompt: 'composição em grid estruturado, blocos alinhados a uma grade visível.',
  },
  {
    id: 'magazine',
    label: 'Magazine',
    hint: 'Manchete e colunas, como revista',
    prompt:
      'diagramação estilo magazine, com manchete, colunas e hierarquia de revista.',
  },
  {
    id: 'bento',
    label: 'Bento',
    hint: 'Blocos de tamanhos diferentes encaixados',
    prompt:
      'composição em bento grid, blocos modulares de tamanhos variados encaixados.',
  },
  {
    id: 'modular',
    label: 'Modular',
    hint: 'Seções separadas e repetidas',
    prompt:
      'composição modular com seções bem delimitadas e repetíveis entre os slides.',
  },
];

// Uso de imagens: o dial de previsibilidade. "Sem imagens" e "Ícones e formas"
// produzem texto-na-arte muito mais confiável que foto realista.
export const imageryPresets: DirectionAxisOption[] = [
  {
    id: 'none',
    label: 'Sem imagens',
    hint: 'Só texto, cor e formas',
    prompt:
      'sem fotografias; arte construída apenas com tipografia, cor e formas.',
  },
  {
    id: 'icons',
    label: 'Ícones e formas',
    hint: 'Ícones e formas geométricas simples',
    prompt:
      'use ícones e formas geométricas simples como elementos visuais de apoio.',
  },
  {
    id: 'illustration',
    label: 'Ilustrações',
    hint: 'Desenhos / ilustrações',
    prompt:
      'use ilustrações (flat ou editoriais) como elemento visual principal.',
  },
  {
    id: 'people',
    label: 'Pessoas',
    hint: 'Fotos de pessoas',
    prompt:
      'use imagens de pessoas reais e autênticas, integradas à composição.',
  },
  {
    id: 'product',
    label: 'Produto',
    hint: 'Foco no seu produto',
    prompt: 'destaque o produto em primeiro plano, bem iluminado.',
  },
  {
    id: 'mockups',
    label: 'Mockups',
    hint: 'Telas/celular mostrando o produto',
    prompt:
      'use mockups de telas/dispositivos para mostrar o produto em contexto.',
  },
  {
    id: 'ai-free',
    label: 'IA livre',
    hint: 'A IA escolhe a imagem',
    prompt:
      'imagens geradas livremente pela IA conforme o conteúdo de cada slide.',
  },
];

// Intensidade da marca: peso do logo + rigidez no respeito às cores do Brand Kit.
export const brandIntensityPresets: DirectionAxisOption[] = [
  {
    id: 'brand-dominant',
    label: 'Marca dominante',
    hint: 'Logo e cores da marca em destaque',
    prompt:
      'presença de marca forte: logo evidente, cores da marca dominando a paleta, assinatura clara.',
  },
  {
    id: 'balanced',
    label: 'Equilibrado',
    hint: 'Marca presente, mas discreta',
    prompt:
      'presença de marca equilibrada: cores da marca respeitadas, logo discreto.',
  },
  {
    id: 'content-dominant',
    label: 'Conteúdo dominante',
    hint: 'Marca quase invisível, foco no conteúdo',
    prompt:
      'marca sutil: assinatura mínima, foco quase total no conteúdo.',
  },
];

export const directionAxes = {
  editorial: editorialPresets,
  hierarchy: hierarchyPresets,
  density: densityPresets,
  composition: compositionPresets,
  imagery: imageryPresets,
  brandIntensity: brandIntensityPresets,
} as const;

export const findDirectionOption = (
  options: DirectionAxisOption[],
  id: string
) => options.find((option) => option.id === id) || options[0];
