import type { CarouselTemplate } from './ai-generate-images.types';

export const defaultVisualStyle =
  'Carrossel editorial premium para Instagram, texto grande dentro da imagem, tipografia serifada forte combinada com sans limpa, margens generosas, composição minimalista e visual sofisticado.';

// ---------------------------------------------------------------------------
// Template categories (used to group templates in the planning form)
// ---------------------------------------------------------------------------
export const templateCategories = [
  { id: 'educacao', label: 'Educação & Conteúdo' },
  { id: 'autoridade', label: 'Autoridade & Credibilidade' },
  { id: 'vendas', label: 'Vendas & Ofertas' },
  { id: 'engajamento', label: 'Engajamento & Comunidade' },
] as const;

export type TemplateCategoryId = (typeof templateCategories)[number]['id'];

// ---------------------------------------------------------------------------
// 16 Carousel Templates — aligned with backend template-definitions.ts IDs
// ---------------------------------------------------------------------------
export const carouselTemplates: CarouselTemplate[] = [
  // ── Educação & Conteúdo ──────────────────────────────────────────────────
  {
    id: 'educational',
    label: 'Educacional',
    category: 'educacao',
    goal: 'educar e gerar engajamento',
    tone: 'claro, prático e persuasivo',
    slideCount: 6,
    visualStyle: defaultVisualStyle,
    instruction:
      'Estruture como aula visual: gancho, contexto, 3-4 ideias acionáveis e fechamento com CTA de salvamento.',
  },
  {
    id: 'list',
    label: 'Lista',
    category: 'educacao',
    goal: 'educar e gerar engajamento',
    tone: 'claro, prático e persuasivo',
    slideCount: 6,
    visualStyle:
      'Carrossel de lista editorial, números grandes, composição limpa, metáforas visuais fortes e texto legível no celular.',
    instruction:
      'Estruture como lista escaneável, com uma ideia principal por slide e títulos curtos.',
  },
  {
    id: 'myths',
    label: 'Mitos e verdades',
    category: 'educacao',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    slideCount: 6,
    visualStyle:
      'Carrossel editorial de contraste, composição elegante, texto grande na imagem, elementos visuais que separem mito e verdade.',
    instruction:
      'Contraponha crenças comuns com uma visão mais madura e prática.',
  },
  {
    id: 'faq',
    label: 'FAQ',
    category: 'educacao',
    goal: 'educar e gerar engajamento',
    tone: 'claro, prático e persuasivo',
    slideCount: 7,
    visualStyle:
      'Carrossel de FAQ editorial, ícone de pergunta grande em destaque, resposta em texto menor abaixo, composição limpa e hierarquia clara entre pergunta e resposta.',
    instruction:
      'FAQ visual: cada slide apresenta uma pergunta real do público em destaque grande, seguida de resposta curta e direta. Comece pela dúvida mais frequente. Use ícone de interrogação como elemento visual recorrente.',
  },

  // ── Autoridade & Credibilidade ───────────────────────────────────────────
  {
    id: 'authority',
    label: 'Autoridade',
    category: 'autoridade',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    slideCount: 6,
    visualStyle:
      'Carrossel editorial premium, visual sofisticado, metáforas de negócio, tipografia forte e pouco texto por slide.',
    instruction:
      'Defenda uma tese forte e demonstre maturidade estratégica em cada slide.',
  },
  {
    id: 'case',
    label: 'Case',
    category: 'autoridade',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    slideCount: 6,
    visualStyle:
      'Carrossel de case sofisticado, visual analítico, gráficos abstratos, tipografia editorial e leitura fácil.',
    instruction:
      'Estruture como caso: cenário, problema, decisão, execução, resultado e aprendizado.',
  },
  {
    id: 'statistics',
    label: 'Estatísticas',
    category: 'autoridade',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    slideCount: 6,
    visualStyle:
      'Carrossel de dados e números, gráficos abstratos minimalistas, tipografia bold para números, composição limpa e visual analítico.',
    instruction:
      'Apresente dados impactantes com contexto: cada slide com uma estatística grande, breve explicação e por que isso importa. Use números grandes como elemento visual central.',
  },
  {
    id: 'comparison',
    label: 'Comparação',
    category: 'autoridade',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    slideCount: 6,
    visualStyle:
      'Carrossel de comparação visual, composição dividida lado a lado, contraste claro entre opções, tipografia organizada e hierarquia visual.',
    instruction:
      'Compare abordagens ou soluções lado a lado: contexto, critérios de comparação, prós e contras, e recomendação final baseada em dados.',
  },

  // ── Vendas & Ofertas ─────────────────────────────────────────────────────
  {
    id: 'offer',
    label: 'Oferta',
    category: 'vendas',
    goal: 'vender uma oferta',
    tone: 'claro, prático e persuasivo',
    slideCount: 5,
    visualStyle:
      'Carrossel de oferta premium, foco em clareza, contraste forte, texto grande dentro da imagem e CTA visual evidente.',
    instruction:
      'Construa desejo sem exagero: problema, promessa realista, mecanismo, prova e CTA.',
  },
  {
    id: 'before-after',
    label: 'Antes/depois',
    category: 'vendas',
    goal: 'vender uma oferta',
    tone: 'especialista, direto e premium',
    slideCount: 5,
    visualStyle:
      'Carrossel premium com contraste visual entre estado atual e estado desejado, tipografia forte e composição limpa.',
    instruction:
      'Mostre transformação: dor atual, custo de continuar igual, novo mecanismo, resultado e próximo passo.',
  },
  {
    id: 'testimonial',
    label: 'Depoimento/prova',
    category: 'vendas',
    goal: 'vender uma oferta',
    tone: 'especialista, direto e premium',
    slideCount: 6,
    visualStyle:
      'Carrossel de prova social, visual humano com retratos ou silhuetas, aspas grandes, depoimentos em destaque e resultado visível.',
    instruction:
      'Estruture com prova social progressiva: contexto do cliente, desafio, solução aplicada, resultado mensurável e chamada para ação.',
  },
  {
    id: 'problem-solution',
    label: 'Problema-solução',
    category: 'vendas',
    goal: 'vender uma oferta',
    tone: 'claro, prático e persuasivo',
    slideCount: 5,
    visualStyle:
      'Carrossel de transformação, contraste entre dor e alívio, cores que mudam do escuro para o claro, visual esperançoso no final.',
    instruction:
      'Comece com a dor real do público, amplifique o custo de não agir, apresente o mecanismo de solução, prove com dados e feche com CTA claro.',
  },

  // ── Engajamento & Comunidade ─────────────────────────────────────────────
  {
    id: 'storytelling',
    label: 'Storytelling',
    category: 'engajamento',
    goal: 'aquecer audiência',
    tone: 'emocional, acolhedor e inspirador',
    slideCount: 7,
    visualStyle:
      'Carrossel narrativo premium, cenas cinematográficas minimalistas, texto grande dentro da imagem, contraste alto e atmosfera humana.',
    instruction:
      'Estruture como narrativa: tensão inicial, virada, aprendizado e conclusão memorável.',
  },
  {
    id: 'us-vs-them',
    label: 'Us vs Them',
    category: 'engajamento',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    slideCount: 5,
    visualStyle:
      'Carrossel de contraste visual, composição dividida com dois lados, tipografia对比 clara entre abordagens, visual provocativo.',
    instruction:
      'Contraste a abordagem convencional com a que realmente funciona: mito vs verdade aplicado, sem atacar concorrentes diretamente.',
  },
  {
    id: 'best-sellers',
    label: 'Best-sellers',
    category: 'engajamento',
    goal: 'vender uma oferta',
    tone: 'claro, prático e persuasivo',
    slideCount: 5,
    visualStyle:
      'Carrossel de produtos mais vendidos, grid de produtos com destaques, social proof visível, numeração e ranking visual.',
    instruction:
      'Apresente os mais vendidos com contexto: por que são populares, quem compra, resultado esperado e onde adquirir.',
  },
  {
    id: 'negative-hook',
    label: 'Negative hook',
    category: 'engajamento',
    goal: 'capturar leads',
    tone: 'leve, divertido e provocativo',
    slideCount: 6,
    visualStyle:
      'Carrossel provocativo com hooks negativos impactantes, cores ousadas, tipografia bold, visual que quebra expectativas.',
    instruction:
      'Comece com um hook negativo que pare a scroll: "Pare de fazer X". Mostre os erros comuns, explique por que acontecem e termine com o caminho correto.',
  },
];

// ---------------------------------------------------------------------------
// Option sets for the planning form
// ---------------------------------------------------------------------------

export const goalOptions = [
  { value: 'educar e gerar engajamento', label: 'Educar e engajar' },
  { value: 'vender uma oferta', label: 'Vender um produto/serviço' },
  { value: 'gerar autoridade', label: 'Mostrar autoridade' },
  { value: 'capturar leads', label: 'Capturar leads' },
];

export const platformOptions = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
];

export const toneOptions = [
  { value: 'claro, prático e persuasivo', label: 'Claro e persuasivo' },
  { value: 'especialista, direto e premium', label: 'Especialista e premium' },
  { value: 'leve, divertido e provocativo', label: 'Leve e divertido' },
  { value: 'emocional, acolhedor e inspirador', label: 'Emocional e inspirador' },
];

export const audienceOptions = [
  'Empreendedores',
  'Pequenas empresas',
  'Profissionais de marketing',
  'Desenvolvedores',
  'Designers',
  'Criadores de conteúdo',
  'Gestores / C-level',
  'Consumidor final (B2C)',
];

export const nicheOptions = [
  { value: 'educacao', label: 'Educação' },
  { value: 'saude', label: 'Saúde' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'e-commerce', label: 'E-commerce' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'financas', label: 'Finanças' },
  { value: 'restaurantes', label: 'Restaurantes' },
  { value: 'moda', label: 'Moda' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'geral', label: 'Geral' },
];

export const visualStylePresets = [
  { label: 'Editorial premium', value: defaultVisualStyle },
  {
    label: 'Cinematográfico',
    value:
      'Carrossel narrativo premium, cenas cinematográficas minimalistas, texto grande dentro da imagem, contraste alto e atmosfera humana.',
  },
  {
    label: 'Lista limpa',
    value:
      'Carrossel de lista editorial, números grandes, composição limpa, metáforas visuais fortes e texto legível no celular.',
  },
  {
    label: 'Analítico / dados',
    value:
      'Carrossel sofisticado com visual analítico, gráficos abstratos, tipografia editorial e leitura fácil.',
  },
];

export const logoUsageOptions = [
  { value: 'subtle', label: 'Assinatura discreta' },
  { value: 'text', label: 'Só selo textual' },
  { value: 'none', label: 'Não usar logo' },
];

export const logoPositionOptions = [
  { value: 'top-right', label: 'Topo direito' },
  { value: 'top-left', label: 'Topo esquerdo' },
  { value: 'bottom-right', label: 'Rodapé direito' },
  { value: 'bottom-left', label: 'Rodapé esquerdo' },
];

export const logoScaleOptions = [
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'badge', label: 'Selo/pill' },
];

export const inputClass =
  'h-[48px] w-full rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] px-[16px] text-[15px] outline-none placeholder:text-black/35 dark:placeholder:text-white/35 text-black dark:text-white transition duration-200 focus:border-black/40 dark:focus:border-white/40 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 hover:border-black/20 dark:hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50';
export const textAreaClass =
  'w-full resize-y rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-[16px] text-[15px] outline-none placeholder:text-black/35 dark:placeholder:text-white/35 text-black dark:text-white transition duration-200 focus:border-black/40 dark:focus:border-white/40 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 hover:border-black/20 dark:hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50';

export const GENERATED_IMAGE_CONCURRENCY = 2;
export const MIN_CAROUSEL_SLIDES = 2;
export const MAX_CAROUSEL_SLIDES = 10;
export const MAX_UNDO_HISTORY = 50;
export const REFERENCE_PAGE_SIZE = 72;
