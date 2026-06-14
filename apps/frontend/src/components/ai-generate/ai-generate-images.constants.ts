import type { CarouselTemplate } from './ai-generate-images.types';

export const defaultVisualStyle =
  'Carrossel editorial premium para Instagram, texto grande dentro da imagem, tipografia serifada forte combinada com sans limpa, margens generosas, composição minimalista e visual sofisticado.';

export const carouselTemplates: CarouselTemplate[] = [
  {
    id: 'educational',
    label: 'Educacional',
    goal: 'educar e gerar engajamento',
    tone: 'claro, prático e persuasivo',
    slideCount: 6,
    visualStyle: defaultVisualStyle,
    instruction:
      'Estruture como aula visual: gancho, contexto, 3-4 ideias acionáveis e fechamento com CTA de salvamento.',
  },
  {
    id: 'storytelling',
    label: 'Storytelling',
    goal: 'aquecer audiência',
    tone: 'emocional, acolhedor e inspirador',
    slideCount: 7,
    visualStyle:
      'Carrossel narrativo premium, cenas cinematográficas minimalistas, texto grande dentro da imagem, contraste alto e atmosfera humana.',
    instruction:
      'Estruture como narrativa: tensão inicial, virada, aprendizado e conclusão memorável.',
  },
  {
    id: 'list',
    label: 'Lista',
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
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    slideCount: 6,
    visualStyle:
      'Carrossel editorial de contraste, composição elegante, texto grande na imagem, elementos visuais que separem mito e verdade.',
    instruction:
      'Contraponha crenças comuns com uma visão mais madura e prática.',
  },
  {
    id: 'before-after',
    label: 'Antes/depois',
    goal: 'vender uma oferta',
    tone: 'especialista, direto e premium',
    slideCount: 5,
    visualStyle:
      'Carrossel premium com contraste visual entre estado atual e estado desejado, tipografia forte e composição limpa.',
    instruction:
      'Mostre transformação: dor atual, custo de continuar igual, novo mecanismo, resultado e próximo passo.',
  },
  {
    id: 'case',
    label: 'Case',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    slideCount: 6,
    visualStyle:
      'Carrossel de case sofisticado, visual analítico, gráficos abstratos, tipografia editorial e leitura fácil.',
    instruction:
      'Estruture como caso: cenário, problema, decisão, execução, resultado e aprendizado.',
  },
  {
    id: 'offer',
    label: 'Oferta',
    goal: 'vender uma oferta',
    tone: 'claro, prático e persuasivo',
    slideCount: 5,
    visualStyle:
      'Carrossel de oferta premium, foco em clareza, contraste forte, texto grande dentro da imagem e CTA visual evidente.',
    instruction:
      'Construa desejo sem exagero: problema, promessa realista, mecanismo, prova e CTA.',
  },
  {
    id: 'authority',
    label: 'Autoridade',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    slideCount: 6,
    visualStyle:
      'Carrossel editorial premium, visual sofisticado, metáforas de negócio, tipografia forte e pouco texto por slide.',
    instruction:
      'Defenda uma tese forte e demonstre maturidade estratégica em cada slide.',
  },
];

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
export const REFERENCE_PAGE_SIZE = 72;
