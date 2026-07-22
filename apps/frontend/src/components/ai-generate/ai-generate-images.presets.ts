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
  // Proibições específicas do sistema visual (anti-genérico): o builder injeta
  // como lista de "nunca fazer" no prompt final.
  avoid?: string;
  // Variações de diagramação rotacionadas pelo índice do slide, para que
  // slides irmãos nunca saiam com o mesmo layout dentro do mesmo sistema.
  variations?: string[];
};

// Estilo editorial: cada opção é um "design system" fechado (paleta + tipo +
// textura + atmosfera). Substitui e expande o antigo stylePresets.
export const editorialPresets: DirectionAxisOption[] = [
  {
    id: 'editorial-premium',
    label: 'Editorial premium',
    hint: 'Cara de revista cara e sofisticada',
    prompt:
      'design system editorial de revista premium (referência: Kinfolk, Monocle, Cereal Magazine): fundo off-white ou papel com textura sutil; headline em serifada display de alto contraste em corpo gigante, apoio em sans grotesca discreta; rubricas em caixa alta com tracking bem aberto, fios finos e numeração editorial como dispositivos gráficos; no máximo UM elemento de arte por slide (forma orgânica recortada, imagem em duotone ou detalhe arquitetônico); acento em uma única cor profunda usada com parcimônia; grain fotográfico leve sobre tudo. Atmosfera: sofisticação silenciosa, luxo intelectual.',
    avoid:
      'cores saturadas competindo entre si, gradientes tech, ícones genéricos de app, excesso de elementos decorativos.',
  },
  {
    id: 'corporativo-moderno',
    label: 'Corporativo moderno',
    hint: 'Sério e profissional, de empresa',
    prompt:
      'design system corporativo contemporâneo (referência: branding da Stripe, relatório anual premiado): grid rigoroso e perceptível na organização; tipografia sans grotesca com contraste dramático de pesos — headline pesada, números e dados em light gigante; paleta neutra (off-white, grafite) com UM acento corporativo aplicado apenas em barras de dado, sublinhados e destaques; dispositivos gráficos funcionais: chips de rótulo, linhas de dado, setas finas, blocos chanfrados; cantos retos. Atmosfera: competência, precisão, confiança de mercado.',
    avoid:
      'clip-art, sombras pretas duras, mais de um acento de cor, decoração sem função informativa.',
  },
  {
    id: 'tech-futurista',
    label: 'Tech futurista',
    hint: 'Escuro e moderno, cara de app/tech',
    prompt:
      'design system tech editorial escuro (referência: Vercel, Linear, Arc Browser): fundo grafite-azulado quase preto com gradiente radial muito sutil e grain fino; tipografia geométrica precisa com tracking apertado na headline; microtexto técnico decorativo (coordenadas, medidas, código mono) nas margens; UM acento luminoso frio (ciano elétrico ou verde-lima) usado apenas em fios de 1px, glows discretos e palavras-chave; grid técnico com linhas hairline; formas: wireframes e malhas vetoriais sutis. Atmosfera: engenharia de ponta.',
    avoid:
      'gradiente roxo/azul genérico de IA, neon excessivo, blobs 3D brilhantes, glow espalhado.',
  },
  {
    id: 'minimalista',
    label: 'Minimalista',
    hint: 'Quase nada na tela, só o essencial',
    prompt:
      'design system de minimalismo tipográfico radical (referência: cartaz suíço contemporâneo, identidade da Apple em campanhas de texto): fundo em UMA única cor sólida; a tipografia É a arte — headline em corpo gigantesco ocupando mais da metade da largura, quebras de linha intencionais desenhando forma no espaço; texto deslocado do centro criando assimetria elegante; um único micro-elemento de pontuação visual (ponto de cor, fio fino ou seta pequena). Atmosfera: confiança absoluta.',
    avoid:
      'qualquer ornamento, ícone decorativo, gradiente, textura chamativa ou terceira cor.',
  },
  {
    id: 'luxo',
    label: 'Luxo',
    hint: 'Sofisticado, escuro com toque dourado',
    prompt:
      'design system de luxo contemporâneo (referência: Aesop, editorial da Cartier): fundo preto profundo ou marrom-café quase preto com textura sutil de papel ou tecido; serifada de alto contraste com itálico elegante em palavras-chave; detalhes metálicos comedidos: fio dourado fino, pequeno ornamento geométrico, numeração romana; composição de museu — muito ar, um único objeto ou elemento em destaque com iluminação lateral dramática; grain fotográfico. Atmosfera: exclusividade e desejo.',
    avoid:
      'dourado brilhante exagerado, acúmulo de ornamentos, cores vivas, aparência de cassino.',
  },
  {
    id: 'bold',
    label: 'Bold',
    hint: 'Forte e chamativo, letras e cores grandes',
    prompt:
      'design system de maximalismo tipográfico de cartaz (referência: campanhas da Nike, Spotify Wrapped): blocos de cor sólidos vibrantes em combinações inesperadas de altíssimo contraste; headline em display ultra-pesada condensada, caixa alta, ocupando quase toda a largura — pode inclinar 2-4 graus ou empilhar palavras em escadas; elementos recortados com contorno grosso; setas brutas, riscos de marcador, grafismos crus; hierarquia por escala extrema (a palavra-chave 4-5x maior que o resto). Atmosfera: urgência impossível de ignorar.',
    avoid:
      'tons pastéis tímidos, composição certinha e centralizada, elementos pequenos e educados.',
  },
  {
    id: 'clean',
    label: 'Clean',
    hint: 'Claro, limpo e bem organizado',
    prompt:
      'design system de produto digital claro (referência: Notion, Airbnb): fundo branco ou cinza-claríssimo; cartões de cantos arredondados médios com sombras difusas tintadas (nunca pretas); sans humanista amigável em pesos médios com headline semibold; ícones de linha consistentes dentro de containers circulares suaves; UM acento de cor alegre; chips e divisores organizando a informação com precisão. Atmosfera: clareza e simpatia de produto bem feito.',
    avoid:
      'fundos escuros, drama visual, texturas pesadas, tipografia agressiva ou condensada.',
  },
  {
    id: 'revista',
    label: 'Revista',
    hint: 'Diagramado como página de revista',
    prompt:
      'design system de página de revista impressa (referência: Bloomberg Businessweek, piauí): diagramação editorial ousada com colunas visíveis; mistura intencional de fios pretos grossos e finos; rubricas em caps, letra capitular ou número de matéria gigante como elemento gráfico; contraste tipográfico deliberado (serifada de texto + grotesca condensada nas manchetes); recortes de imagem em janelas retangulares com legendas; carimbos e etiquetas editoriais. Atmosfera: jornalismo premium com wit visual.',
    avoid:
      'cara de app digital, gradientes, sombras suaves difusas, cantos arredondados.',
  },
  {
    id: 'startup',
    label: 'Startup',
    hint: 'Jovem, colorido e otimista',
    prompt:
      'design system de branding de startup contemporânea (referência: Duolingo, Headspace): 2-3 cores vivas harmônicas sobre fundo claro ou colorido suave; formas orgânicas arredondadas com personalidade; sans geométrica rechonchuda com headline bem pesada; adesivos e badges divertidos, sublinhados de marcador; micro-grafismos desenhados à mão (setinhas, estrelas — com moderação). Atmosfera: otimismo competente e acessível.',
    avoid:
      'corporativês frio, foto de banco de imagem, seriedade excessiva, paleta lavada.',
  },
  {
    id: 'institucional',
    label: 'Institucional',
    hint: 'Sóbrio e sério, passa credibilidade',
    prompt:
      'design system institucional sóbrio (referência: universidade tradicional, banco privado centenário): paleta restrita a azul-marinho ou verde-escuro + off-white + UM acento discreto; serifada clássica ou neo-grotesca formal com hierarquia conservadora impecável; dispositivos: fios duplos, selos, brasões geométricos simples; composição simétrica e estável; fotografia em tratamento monocromático quando houver. Atmosfera: tradição e solidez de décadas.',
    avoid:
      'gírias visuais, cores vibrantes, informalidade, elementos flutuando sem âncora.',
  },
];

// Hierarquia visual: peso relativo entre texto e elementos visuais.
export const hierarchyPresets: DirectionAxisOption[] = [
  {
    id: 'text-dominant',
    label: 'Texto dominante',
    hint: 'O texto manda; pouca imagem',
    prompt:
      'a tipografia É o visual: headline em escala de cartaz (ocupando 50-70% da largura), desenhada com quebras de linha intencionais e contraste dramático de pesos; elementos gráficos reduzidos a pontuação visual mínima.',
  },
  {
    id: 'balanced',
    label: 'Equilibrado',
    hint: 'Texto e imagem com peso parecido',
    prompt:
      'diálogo equilibrado entre tipografia e elemento visual: cada um domina uma zona clara da composição, sem competir — hierarquia de leitura óbvia em 1 segundo (headline → visual → apoio).',
  },
  {
    id: 'visual-dominant',
    label: 'Visual dominante',
    hint: 'A imagem manda; pouco texto',
    prompt:
      'o elemento visual domina 60-75% da área com presença cinematográfica; o texto entra curto, integrado à cena com contraste garantido (scrim ou zona de respiro própria).',
  },
];

// Densidade visual: quantidade de elementos e espaço negativo.
export const densityPresets: DirectionAxisOption[] = [
  {
    id: 'minimal',
    label: 'Minimalista',
    hint: 'Bem vazio, muito espaço sobrando',
    prompt:
      'economia radical: no máximo 3 elementos na arte inteira, espaço negativo como protagonista (60%+ da área vazia de propósito), cada elemento com motivo claro para existir.',
  },
  {
    id: 'medium',
    label: 'Média',
    hint: 'Alguns elementos, sem poluir',
    prompt:
      'densidade editorial controlada: 4-6 elementos organizados em zonas claras, respiro generoso entre grupos, nenhum elemento decorativo sem função.',
  },
  {
    id: 'rich',
    label: 'Rica',
    hint: 'Cheio de elementos e detalhes',
    prompt:
      'composição em camadas ricas — fundo com textura/atmosfera, plano médio com módulos de informação, primeiro plano com destaques — mantendo zonas de respiro estratégicas para o texto respirar; densidade de revista bem diagramada, nunca poluição.',
  },
];

// Composição: sistema de layout-base do carrossel. Cada sistema traz
// `variations` — diagramações irmãs rotacionadas pelo índice do slide, para
// manter unidade de família SEM repetir o mesmo layout em todos os slides.
export const compositionPresets: DirectionAxisOption[] = [
  {
    id: 'centered',
    label: 'Centralizada',
    hint: 'Tudo no meio, simétrico',
    prompt:
      'sistema de composição de eixo central disciplinado: massa principal no eixo vertical, respiro simétrico.',
    variations: [
      'pilha vertical central em escadaria de escalas: rubrica pequena no topo, headline gigante, apoio menor, selo no rodapé.',
      'headline centralizada compacta com um único elemento gráfico coroando o topo da composição.',
      'elemento visual central dominante com a headline logo abaixo, simetria de altar.',
      'eixo central mantido, mas com UM elemento rompendo a simetria em uma borda — tensão controlada.',
    ],
  },
  {
    id: 'asymmetric',
    label: 'Assimétrica',
    hint: 'Desalinhado de propósito, dinâmico',
    prompt:
      'sistema de composição assimétrica com diagonal implícita e contrapesos deliberados.',
    variations: [
      'massa de texto ancorada no terço esquerdo, elemento visual sangrando para fora da borda direita.',
      'headline no topo esquerdo, contrapeso visual no rodapé direito, diagonal implícita atravessando a arte.',
      'texto no quadrante inferior esquerdo com grande área de respiro acima; rubrica mínima no canto superior direito.',
      'elemento gráfico gigante cortado pela borda esquerda, todo o texto alinhado à direita.',
    ],
  },
  {
    id: 'grid',
    label: 'Grid (grade)',
    hint: 'Alinhado em colunas e linhas',
    prompt:
      'sistema de grade estruturada com alinhamentos rígidos e ritmo visível.',
    variations: [
      'grade 2×2 com UMA célula destacada em cor de acento carregando a informação-chave.',
      'três faixas horizontais: rubrica no topo, conteúdo dominante no centro, rodapé de dados.',
      'grade de cartões iguais com UM cartão maior quebrando o ritmo de propósito.',
      'colunas verticais separadas por fios finos, com numeração grande abrindo cada coluna.',
    ],
  },
  {
    id: 'magazine',
    label: 'Magazine',
    hint: 'Manchete e colunas, como revista',
    prompt:
      'sistema de diagramação de revista: manchete, colunas, fios e hierarquia editorial.',
    variations: [
      'manchete cruzando toda a largura no topo, corpo em duas colunas abaixo com fio divisor.',
      'letra capitular ou número de matéria gigante abrindo o slide, texto correndo ao lado.',
      'janela de imagem retangular com legenda, headline sobrepondo parcialmente a janela.',
      'rubrica em caps + fio grosso + headline empilhada em três linhas, rodapé com paginação editorial.',
    ],
  },
  {
    id: 'bento',
    label: 'Bento',
    hint: 'Blocos de tamanhos diferentes encaixados',
    prompt:
      'sistema bento grid: células modulares de tamanhos variados perfeitamente encaixadas com espaçamento idêntico.',
    variations: [
      'célula hero de dois terços para a headline, células menores de apoio completando o quadro.',
      'bento vertical: célula do topo com número/dado gigante, células inferiores com texto de apoio.',
      'uma célula em cor de acento sólida carregando o destaque, demais células neutras.',
      'bento irregular com uma célula de textura/imagem e as demais em cor sólida.',
    ],
  },
  {
    id: 'modular',
    label: 'Modular',
    hint: 'Seções separadas e repetidas',
    prompt:
      'sistema modular com seções bem delimitadas, repetíveis entre slides como family system.',
    variations: [
      'módulo de cabeçalho fixo + área de conteúdo, com o número do slide como elemento gráfico grande.',
      'faixa lateral fina de identidade + módulo principal de conteúdo dominando o restante.',
      'módulos empilhados com espaçamento idêntico e UM módulo em cor invertida como destaque.',
      'moldura modular fina nas bordas, conteúdo respirando no centro com folga.',
    ],
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
      'zero fotografia e zero ilustração figurativa: a arte nasce só de tipografia, campos de cor e formas geométricas abstratas com acabamento gráfico impecável.',
  },
  {
    id: 'icons',
    label: 'Ícones e formas',
    hint: 'Ícones e formas geométricas simples',
    prompt:
      'ícones de linha consistentes (mesma espessura de traço em todos) e formas geométricas simples como apoio visual — desenhados como parte do design system, nunca emojis nem clip-art.',
  },
  {
    id: 'illustration',
    label: 'Ilustrações',
    hint: 'Desenhos / ilustrações',
    prompt:
      'ilustração autoral com estilo consistente entre os slides (mesma linguagem de traço, mesma paleta) como elemento visual principal — qualidade de ilustrador editorial contratado, com personalidade própria.',
  },
  {
    id: 'people',
    label: 'Pessoas',
    hint: 'Fotos de pessoas',
    prompt:
      'fotografia de pessoas com direção de arte: luz natural dramática ou de estúdio bem definida, tratamento de cor coeso com a paleta da marca, poses naturais de reportagem (nunca pose de banco de imagem), recortes ousados.',
  },
  {
    id: 'product',
    label: 'Produto',
    hint: 'Foco no seu produto',
    prompt:
      'still de produto com padrão de campanha: objeto hero com iluminação de estúdio esculpida, sombra tintada realista, fundo que conversa com a paleta — presença de anúncio impresso premium.',
  },
  {
    id: 'mockups',
    label: 'Mockups',
    hint: 'Telas/celular mostrando o produto',
    prompt:
      'mockup de tela/dispositivo em perspectiva interessante (nunca frontal chapado), com sombra e reflexo realistas, UI legível, integrado à composição como objeto de cena.',
  },
  {
    id: 'ai-free',
    label: 'IA livre',
    hint: 'A IA escolhe a imagem',
    prompt:
      'liberdade para escolher o dispositivo visual mais forte para o conteúdo deste slide — metáfora visual inteligente, objeto inesperado ou cena conceitual — sempre com acabamento de campanha publicitária.',
  },
];

// Intensidade da marca: peso do logo + rigidez no respeito às cores do Brand Kit.
export const brandIntensityPresets: DirectionAxisOption[] = [
  {
    id: 'brand-dominant',
    label: 'Marca dominante',
    hint: 'Logo e cores da marca em destaque',
    prompt:
      'a marca comanda a paleta: cores da marca em papéis claros (fundo/texto/acento), assinatura visível e consistente na mesma posição em todos os slides, sensação de campanha proprietária.',
  },
  {
    id: 'balanced',
    label: 'Equilibrado',
    hint: 'Marca presente, mas discreta',
    prompt:
      'cores da marca respeitadas como base da paleta com liberdade tonal (variações de luminosidade permitidas); assinatura pequena e discreta, sempre na mesma posição.',
  },
  {
    id: 'content-dominant',
    label: 'Conteúdo dominante',
    hint: 'Marca quase invisível, foco no conteúdo',
    prompt:
      'marca quase invisível: no máximo um microsselo textual em um canto; a paleta serve ao conteúdo, não ao branding.',
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
