/**
 * Template Definitions — ContentFlow Carousel Template Engine v2.0.0
 *
 * Este arquivo é a fundação do sistema de templates do backend.
 * Contém todas as definições de tipo e o array completo de 16 templates
 * de carrossel, incluindo regras narrativas, verificações editoriais,
 * direções visuais e instruções para geração por IA.
 *
 * O frontend terá seu próprio tipo simplificado (`CarouselTemplate`) para
 * compatibilidade retroativa, mas este é o single source of truth para
 * o catálogo de templates do sistema.
 */

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export const TEMPLATE_SCHEMA_VERSION = '2.0.0';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SlideRule = {
  type: 'cover' | 'hook' | 'content' | 'proof' | 'transition' | 'cta';
  role: string;
  maxHeadlineChars: number;
  maxBodyChars: number;
  requiresCta: boolean;
};

export type EditorialCheck = {
  id: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  pattern?: string; // regex como string
  message: string;
};

export type TemplateNarrativeStructure = {
  name: string;
  description: string;
  slideSequence: SlideRule[];
  promptInstruction: string;
};

export type CarouselTemplateDefinition = {
  id: string;
  label: string;
  description: string;
  version: string;
  active: boolean;
  category: string;
  goal: string;
  tone: string;
  preferredPlatforms: string[];
  preferredNiches: string[];
  recommendedSlideCount: { min: number; max: number; default: number };
  narrative: TemplateNarrativeStructure;
  visualStyle: string;
  textDensity: 'minimal' | 'light' | 'medium' | 'rich';
  defaultDirection: {
    editorial: string;
    hierarchy: string;
    density: string;
    composition: string;
    imagery: string;
    brandIntensity: string;
  };
  recommendedCta: string;
  ctaVariations: string[];
  editorialChecks: EditorialCheck[];
  instruction: string;
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function getTemplateDefinitionById(
  id: string
): CarouselTemplateDefinition | undefined {
  return carouselTemplateDefinitions.find((t) => t.id === id);
}

// ---------------------------------------------------------------------------
// Template Definitions — Array completo de 16 templates
// ---------------------------------------------------------------------------

export const carouselTemplateDefinitions: CarouselTemplateDefinition[] = [
  // =========================================================================
  // 1. EDUCATIONAL
  // =========================================================================
  {
    id: 'educational',
    label: 'Educacional',
    description:
      'Carrossel educativo que ensina um conceito de forma visual e escaneável. Ideal para educar a audiência e gerar engajamento com conteúdo acionável.',
    version: '1.0.0',
    active: true,
    category: 'educacao',
    goal: 'educar e gerar engajamento',
    tone: 'claro, prático e persuasivo',
    preferredPlatforms: ['instagram', 'linkedin'],
    preferredNiches: [
      'education',
      'technology',
      'health',
      'finance',
      'fitness',
      'marketing',
      'consulting',
      'e-commerce',
      'services',
      'fashion',
      'restaurants',
    ],
    recommendedSlideCount: { min: 4, max: 10, default: 6 },
    narrative: {
      name: 'Aula Visual',
      description:
        'Estrutura didática que ensina como uma aula visual: gancho, contexto, ideias acionáveis e fechamento com CTA.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Capa — Gancho que promete uma aprendizado',
          maxHeadlineChars: 60,
          maxBodyChars: 0,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Contexto — Por que isso importa',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Ideia acionável 1',
          maxHeadlineChars: 40,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Ideia acionável 2',
          maxHeadlineChars: 40,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Ideia acionável 3',
          maxHeadlineChars: 40,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Resumo e próximo passo',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Estruture como aula visual: gancho que promete aprendizado, contexto breve, 3-4 ideias acionáveis (uma por slide) e fechamento com CTA de salvamento.',
    },
    visualStyle:
      'Carrossel editorial premium para Instagram, texto grande dentro da imagem, tipografia serifada forte combinada com sans limpa, margens generosas, composição minimalista e visual sofisticado.',
    textDensity: 'medium',
    defaultDirection: {
      editorial: 'clean',
      hierarchy: 'text-dominant',
      density: 'medium',
      composition: 'centered',
      imagery: 'illustration',
      brandIntensity: 'balanced',
    },
    recommendedCta: 'Salve este post para consultar depois.',
    ctaVariations: [
      'Salve este post para consultar depois.',
      'Siga para mais dicas como esta.',
      'Compartilhe com alguém que precisa ver isso.',
    ],
    editorialChecks: [
      {
        id: 'edu-actionable',
        description: 'Verifica se o conteúdo oferece dicas acionáveis',
        severity: 'warning',
        pattern: '(dica|passo|faça|comece|aplique|use|tente)',
        message: 'O slide deveria conter pelo menos uma dica acionável.',
      },
      {
        id: 'edu-one-idea',
        description: 'Verifica se cada slide tem uma única ideia principal',
        severity: 'warning',
        pattern: '(\\d+\\.\\s.*\\n.*\\d+\\.\\s)',
        message: 'Considere colocar apenas uma ideia por slide para melhorar a clareza.',
      },
      {
        id: 'edu-headline-length',
        description: 'Verifica se os títulos são curtos e diretos',
        severity: 'info',
        pattern: '.{61,}',
        message: 'Títulos muito longos podem prejudicar a legibilidade no celular.',
      },
      {
        id: 'edu-engagement',
        description: 'Verifica se há pelo menos um elemento de engajamento',
        severity: 'warning',
        message: 'Adicione uma pergunta ou chamada para engajar o leitor.',
      },
    ],
    instruction:
      'Estruture como aula visual: gancho, contexto, 3-4 ideias acionáveis e fechamento com CTA de salvamento.',
  },

  // =========================================================================
  // 2. STORYTELLING
  // =========================================================================
  {
    id: 'storytelling',
    label: 'Storytelling',
    description:
      'Carrossel narrativo que constrói uma história emocional passo a passo. Ideal para aquecer a audiência e criar conexão.',
    version: '1.0.0',
    active: true,
    category: 'narrativo',
    goal: 'aquecer audiência',
    tone: 'emocional, acolhedor e inspirador',
    preferredPlatforms: ['instagram'],
    preferredNiches: [
      'education',
      'technology',
      'health',
      'finance',
      'fitness',
      'marketing',
      'consulting',
      'e-commerce',
      'services',
      'fashion',
      'restaurants',
    ],
    recommendedSlideCount: { min: 4, max: 12, default: 7 },
    narrative: {
      name: 'Narrativa Emocional',
      description:
        'Estrutura narrativa clássica com tensão inicial, ponto de virada, aprendizado e conclusão memorável.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Tensão — Situação inicial ou conflito',
          maxHeadlineChars: 60,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Aprofundamento — Contexto emocional',
          maxHeadlineChars: 50,
          maxBodyChars: 140,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Ponto de virada — O momento da mudança',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Aprendizado 1',
          maxHeadlineChars: 45,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Aprendizado 2',
          maxHeadlineChars: 45,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Reflexão — Lição principal',
          maxHeadlineChars: 50,
          maxBodyChars: 140,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Conclusão inspiradora',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Estruture como narrativa: tensão inicial, virada, aprendizado e conclusão memorável. Use linguagem emocional e cenas descritivas.',
    },
    visualStyle:
      'Carrossel narrativo premium, cenas cinematográficas minimalistas, texto grande dentro da imagem, contraste alto e atmosfera humana.',
    textDensity: 'light',
    defaultDirection: {
      editorial: 'revista',
      hierarchy: 'visual-dominant',
      density: 'minimal',
      composition: 'asymmetric',
      imagery: 'people',
      brandIntensity: 'content-dominant',
    },
    recommendedCta: 'Compartilhe se essa história tocou você.',
    ctaVariations: [
      'Compartilhe se essa história tocou você.',
      'Salve para reler quando precisar de inspiração.',
      'Marque alguém que precisa ouvir isso.',
      'Siga para mais histórias como esta.',
    ],
    editorialChecks: [
      {
        id: 'story-arc',
        description: 'Verifica se há progressão emocional no carrossel',
        severity: 'warning',
        message: 'Certifique-se de que a história tem início, meio e fim claros.',
      },
      {
        id: 'story-no-dry-facts',
        description: 'Verifica se não há apenas fatos secos sem emoção',
        severity: 'warning',
        pattern: '(\\d+%|\\d+\\.\\d+|estatística|pesquisa indica)',
        message: 'Evite excesso de dados frios em um carrossel de storytelling.',
      },
      {
        id: 'story-emotional-words',
        description: 'Verifica se há palavras emocionais no texto',
        severity: 'info',
        pattern: '(sentiu|percebeu|descobriu|transformou|superou|lutou)',
        message: 'Use palavras que evoquem emoção para fortalecer a narrativa.',
      },
    ],
    instruction:
      'Estruture como narrativa: tensão inicial, virada, aprendizado e conclusão memorável.',
  },

  // =========================================================================
  // 3. LIST
  // =========================================================================
  {
    id: 'list',
    label: 'Lista',
    description:
      'Carrossel em formato de lista com uma ideia principal por slide. Escaneável, prático e fácil de consumir.',
    version: '1.0.0',
    active: true,
    category: 'educacao',
    goal: 'educar e gerar engajamento',
    tone: 'claro, prático e persuasivo',
    preferredPlatforms: ['instagram', 'linkedin'],
    preferredNiches: [
      'education',
      'technology',
      'health',
      'finance',
      'fitness',
      'marketing',
      'consulting',
      'e-commerce',
      'services',
      'fashion',
      'restaurants',
    ],
    recommendedSlideCount: { min: 4, max: 10, default: 6 },
    narrative: {
      name: 'Lista Escaneável',
      description:
        'Formato de lista numerada com uma ideia por slide, seguido de resumo e CTA.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Capa — Título da lista',
          maxHeadlineChars: 60,
          maxBodyChars: 0,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Item 1 da lista',
          maxHeadlineChars: 40,
          maxBodyChars: 80,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Item 2 da lista',
          maxHeadlineChars: 40,
          maxBodyChars: 80,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Item 3 da lista',
          maxHeadlineChars: 40,
          maxBodyChars: 80,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Resumo — Recapitulação rápida',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Próximo passo',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Estruture como lista escaneável, com uma ideia principal por slide e títulos curtos. Use números grandes e metáforas visuais.',
    },
    visualStyle:
      'Carrossel de lista editorial, números grandes, composição limpa, metáforas visuais fortes e texto legível no celular.',
    textDensity: 'minimal',
    defaultDirection: {
      editorial: 'minimalista',
      hierarchy: 'text-dominant',
      density: 'minimal',
      composition: 'centered',
      imagery: 'icons',
      brandIntensity: 'balanced',
    },
    recommendedCta: 'Salve esta lista para consultar depois.',
    ctaVariations: [
      'Salve esta lista para consultar depois.',
      'Qual item você mais identificou? Comente abaixo.',
      'Compartilhe com um amigo que precisa disso.',
    ],
    editorialChecks: [
      {
        id: 'list-scannable',
        description: 'Verifica se o formato é escaneável',
        severity: 'warning',
        message: 'Use números ou bullets para facilitar a escaneabilidade.',
      },
      {
        id: 'list-one-idea',
        description: 'Verifica se cada slide contém apenas uma ideia',
        severity: 'warning',
        pattern: '(\\d+\\.\\s.*\\d+\\.\\s)',
        message: 'Considere separar: uma ideia por slide melhora a retenção.',
      },
      {
        id: 'list-brevity',
        description: 'Verifica se o texto por slide é conciso',
        severity: 'info',
        pattern: '.{81,}',
        message: 'Textos longos em carrosséis de lista podem perder a atenção.',
      },
    ],
    instruction:
      'Estruture como lista escaneável, com uma ideia principal por slide e títulos curtos.',
  },

  // =========================================================================
  // 4. MYTHS
  // =========================================================================
  {
    id: 'myths',
    label: 'Mitos e verdades',
    description:
      'Carrossel que contrapõe crenças comuns com verdades baseadas em evidências. Gera autoridade e credibilidade.',
    version: '1.0.0',
    active: true,
    category: 'autoridade',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    preferredPlatforms: ['instagram', 'linkedin'],
    preferredNiches: [
      'health',
      'finance',
      'fitness',
      'education',
      'technology',
      'marketing',
    ],
    recommendedSlideCount: { min: 4, max: 10, default: 6 },
    narrative: {
      name: 'Contraste de Crenças',
      description:
        'Alterna entre mitos (crenças populares) e verdades (baseadas em evidências), gerando contraste visual e cognitivo.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Capa — Gancho provocativo sobre mitos',
          maxHeadlineChars: 60,
          maxBodyChars: 0,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Mito 1 — Crença popular desmentida',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Verdade 1 — Evidência ou dados',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Mito 2 — Outra crença popular',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Verdade 2 — Evidência ou dados',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Reflexão e próximo passo',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Contraponha crenças comuns com uma visão mais madura e prática. Use contraste visual entre "MITO" e "VERDADE".',
    },
    visualStyle:
      'Carrossel editorial de contraste, composição elegante, texto grande na imagem, elementos visuais que separem mito e verdade.',
    textDensity: 'medium',
    defaultDirection: {
      editorial: 'bold',
      hierarchy: 'text-dominant',
      density: 'medium',
      composition: 'asymmetric',
      imagery: 'illustration',
      brandIntensity: 'balanced',
    },
    recommendedCta: 'Salve para consultar depois.',
    ctaVariations: [
      'Salve para consultar depois.',
      'Você sabia disso? Comente sua opinião.',
      'Compartilhe para desmistificar com mais gente.',
    ],
    editorialChecks: [
      {
        id: 'myths-no-absolutes',
        description: 'Verifica se não há afirmações absolutas',
        severity: 'error',
        pattern: '(sempre|nunca|todo mundo|ninguém|100%)',
        message: 'Evite afirmações absolutas. Use linguagem qualificada.',
      },
      {
        id: 'myths-evidence',
        description: 'Verifica se as verdades são baseadas em evidências',
        severity: 'warning',
        message: 'Inclua dados, fontes ou referências para sustentar as verdades.',
      },
      {
        id: 'myths-pair-balance',
        description: 'Verifica se há par mito-verdade equilibrado',
        severity: 'warning',
        message: 'Mantenha o equilíbrio: cada mito deve ter uma verdade correspondente.',
      },
    ],
    instruction:
      'Contraponha crenças comuns com uma visão mais madura e prática.',
  },

  // =========================================================================
  // 5. BEFORE-AFTER
  // =========================================================================
  {
    id: 'before-after',
    label: 'Antes/depois',
    description:
      'Carrossel que mostra uma transformação clara do estado atual para o resultado desejado. Ideal para vender ofertas.',
    version: '1.0.0',
    active: true,
    category: 'conversao',
    goal: 'vender uma oferta',
    tone: 'especialista, direto e premium',
    preferredPlatforms: ['instagram', 'linkedin'],
    preferredNiches: [
      'fitness',
      'health',
      'education',
      'consulting',
      'technology',
      'e-commerce',
    ],
    recommendedSlideCount: { min: 3, max: 8, default: 5 },
    narrative: {
      name: 'Transformação Visível',
      description:
        'Mostra a jornada do estado atual (dor) até o resultado desejado, com o mecanismo de transformação no meio.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Estado atual — Dor ou situação atual',
          maxHeadlineChars: 60,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Custo de não mudar — Consequências',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Mecanismo — Como funciona a transformação',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Resultado — O que é possível alcançar',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Próximo passo concreto',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Mostre transformação: dor atual, custo de continuar igual, novo mecanismo, resultado e próximo passo.',
    },
    visualStyle:
      'Carrossel premium com contraste visual entre estado atual e estado desejado, tipografia forte e composição limpa.',
    textDensity: 'medium',
    defaultDirection: {
      editorial: 'bold',
      hierarchy: 'visual-dominant',
      density: 'medium',
      composition: 'asymmetric',
      imagery: 'illustration',
      brandIntensity: 'balanced',
    },
    recommendedCta: 'Pronto para transformar? Clique no link da bio.',
    ctaVariations: [
      'Pronto para transformar? Clique no link da bio.',
      'Quer esse resultado? Fale comigo no direct.',
      'Salve para lembrar do que é possível.',
    ],
    editorialChecks: [
      {
        id: 'ba-realistic',
        description: 'Verifica se a transformação é realista',
        severity: 'warning',
        pattern: '(garantia|100%|sempre funciona|resultado certeiro)',
        message: 'Evite promessas exageradas de resultado.',
      },
      {
        id: 'ba-no-exaggeration',
        description: 'Verifica se não há superlativos exagerados',
        severity: 'warning',
        pattern: '(incrível|absurdo|revolucionário|milagroso)',
        message: 'Use resultados concretos ao invés de superlativos.',
      },
      {
        id: 'ba-before-after-contrast',
        description: 'Verifica se há contraste claro entre antes e depois',
        severity: 'info',
        message: 'O contraste visual entre antes e depois deve ser evidente.',
      },
    ],
    instruction:
      'Mostre transformação: dor atual, custo de continuar igual, novo mecanismo, resultado e próximo passo.',
  },

  // =========================================================================
  // 6. CASE
  // =========================================================================
  {
    id: 'case',
    label: 'Case',
    description:
      'Carrossel que apresenta um caso de sucesso real, com dados e contexto. Gera autoridade e prova social.',
    version: '1.0.0',
    active: true,
    category: 'autoridade',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    preferredPlatforms: ['instagram', 'linkedin'],
    preferredNiches: [
      'consulting',
      'technology',
      'services',
      'marketing',
      'finance',
      'e-commerce',
    ],
    recommendedSlideCount: { min: 4, max: 10, default: 6 },
    narrative: {
      name: 'Caso de Sucesso',
      description:
        'Apresenta um caso real com cenário, problema, decisão, execução, resultado e aprendizado.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Capa — Gancho com resultado impressionante',
          maxHeadlineChars: 60,
          maxBodyChars: 0,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Cenário — Contexto inicial',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Problema — Desafio enfrentado',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Decisão e execução — O que foi feito',
          maxHeadlineChars: 50,
          maxBodyChars: 140,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Resultado — Dados e métricas',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Aprendizado e próximo passo',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Estruture como caso: cenário, problema, decisão, execução, resultado e aprendizado. Use dados reais.',
    },
    visualStyle:
      'Carrossel de case sofisticado, visual analítico, gráficos abstratos, tipografia editorial e leitura fácil.',
    textDensity: 'medium',
    defaultDirection: {
      editorial: 'corporativo-moderno',
      hierarchy: 'balanced',
      density: 'medium',
      composition: 'magazine',
      imagery: 'mockups',
      brandIntensity: 'balanced',
    },
    recommendedCta: 'Quer resultados assim? Fale comigo.',
    ctaVariations: [
      'Quer resultados assim? Fale comigo.',
      'Salve este case para consulta.',
      'Compartilhe com quem precisa de uma referência.',
    ],
    editorialChecks: [
      {
        id: 'case-specific-numbers',
        description: 'Verifica se há números e dados específicos',
        severity: 'warning',
        pattern: '(R\\$|\\d+%|\\d+x|\\d+ meses)',
        message: 'Inclua dados específicos para tornar o caso crível.',
      },
      {
        id: 'case-real-context',
        description: 'Verifica se há contexto realista',
        severity: 'warning',
        message: 'O caso deve ter contexto que o público reconheça como real.',
      },
      {
        id: 'case-no-fabrication',
        description: 'Verifica se o caso parece autêntico',
        severity: 'info',
        pattern: '(case genérico|exemplo fictício|suponha)',
        message: 'Evite termos que indiquem que o caso é fictício.',
      },
    ],
    instruction:
      'Estruture como caso: cenário, problema, decisão, execução, resultado e aprendizado.',
  },

  // =========================================================================
  // 7. OFFER
  // =========================================================================
  {
    id: 'offer',
    label: 'Oferta',
    description:
      'Carrossel focado em apresentar uma oferta de forma clara e persuasiva, sem exageros. Ideal para vender.',
    version: '1.0.0',
    active: true,
    category: 'conversao',
    goal: 'vender uma oferta',
    tone: 'claro, prático e persuasivo',
    preferredPlatforms: ['instagram', 'linkedin'],
    preferredNiches: [
      'e-commerce',
      'services',
      'fitness',
      'consulting',
      'technology',
      'fashion',
    ],
    recommendedSlideCount: { min: 3, max: 8, default: 5 },
    narrative: {
      name: 'Oferta Clarificada',
      description:
        'Constrói desejo de forma ética: problema, promessa realista, mecanismo, prova e CTA.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Capa — Problema ou desejo do público',
          maxHeadlineChars: 60,
          maxBodyChars: 0,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Promessa — O que é oferecido',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Mecanismo — Como funciona na prática',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Prova — Depoimentos, dados ou resultados',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Oferta e próximo passo',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Construa desejo sem exagero: problema, promessa realista, mecanismo, prova e CTA.',
    },
    visualStyle:
      'Carrossel de oferta premium, foco em clareza, contraste forte, texto grande dentro da imagem e CTA visual evidente.',
    textDensity: 'medium',
    defaultDirection: {
      editorial: 'bold',
      hierarchy: 'text-dominant',
      density: 'medium',
      composition: 'centered',
      imagery: 'product',
      brandIntensity: 'brand-dominant',
    },
    recommendedCta: 'Garanta sua vaga agora.',
    ctaVariations: [
      'Garanta sua vaga agora.',
      'Acesse o link na bio e comece hoje.',
      'Fale comigo no direct para saber mais.',
      'Últimas vagas — não perca.',
    ],
    editorialChecks: [
      {
        id: 'offer-no-false-urgency',
        description: 'Verifica se não há urgência artificial',
        severity: 'warning',
        pattern: '(últimas vagas|apenas hoje|só até|última chance)',
        message: 'Evite urgência artificial. Se for real, contextualize.',
      },
      {
        id: 'offer-realistic-promises',
        description: 'Verifica se as promessas são realistas',
        severity: 'error',
        pattern: '(garantia de resultado|100%|milagre|revolucionário)',
        message: 'Promessas exageradas prejudicam a credibilidade.',
      },
      {
        id: 'offer-clear-value',
        description: 'Verifica se o valor da oferta é claro',
        severity: 'info',
        message: 'Certifique-se de que o público entende exatamente o que está sendo oferecido.',
      },
    ],
    instruction:
      'Construa desejo sem exagero: problema, promessa realista, mecanismo, prova e CTA.',
  },

  // =========================================================================
  // 8. AUTHORITY
  // =========================================================================
  {
    id: 'authority',
    label: 'Autoridade',
    description:
      'Carrossel que defende uma tese estratégica e demonstra maturidade intelectual. Posiciona como referência.',
    version: '1.0.0',
    active: true,
    category: 'autoridade',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    preferredPlatforms: ['instagram', 'linkedin'],
    preferredNiches: [
      'consulting',
      'technology',
      'finance',
      'marketing',
      'education',
      'services',
    ],
    recommendedSlideCount: { min: 4, max: 10, default: 6 },
    narrative: {
      name: 'Tese Estratégica',
      description:
        'Apresenta uma tese forte com argumentos estruturados, síntese e CTA.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Capa — Tese provocativa',
          maxHeadlineChars: 60,
          maxBodyChars: 0,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Argumento 1 — Primeira evidência',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Argumento 2 — Segunda evidência',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Argumento 3 — Terceira evidência',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Síntese — Conclusão estratégica',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Convite à ação',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Defenda uma tese forte e demonstre maturidade estratégica em cada slide.',
    },
    visualStyle:
      'Carrossel editorial premium, visual sofisticado, metáforas de negócio, tipografia forte e pouco texto por slide.',
    textDensity: 'light',
    defaultDirection: {
      editorial: 'editorial-premium',
      hierarchy: 'balanced',
      density: 'medium',
      composition: 'magazine',
      imagery: 'icons',
      brandIntensity: 'balanced',
    },
    recommendedCta: 'Siga para mais análises estratégicas.',
    ctaVariations: [
      'Siga para mais análises estratégicas.',
      'Concorda ou discorda? Comente sua visão.',
      'Salve para consultar depois.',
      'Compartilhe com quem precisa dessa perspectiva.',
    ],
    editorialChecks: [
      {
        id: 'auth-backed-claims',
        description: 'Verifica se as afirmações são sustentadas',
        severity: 'warning',
        message: 'Cada argumento deve ser respaldado por dados, experiência ou lógica.',
      },
      {
        id: 'auth-no-fluff',
        description: 'Verifica se não há conteúdo genérico',
        severity: 'warning',
        pattern: '(todos sabem|é óbvio|claramente|como todo mundo)',
        message: 'Evite frases genéricas. Seja específico.',
      },
      {
        id: 'auth-thesis-clarity',
        description: 'Verifica se a tese é clara na capa',
        severity: 'info',
        message: 'A tese principal deve ser evidente já no primeiro slide.',
      },
    ],
    instruction:
      'Defenda uma tese forte e demonstre maturidade estratégica em cada slide.',
  },

  // =========================================================================
  // 9. FAQ
  // =========================================================================
  {
    id: 'faq',
    label: 'FAQ',
    description:
      'Carrossel em formato de perguntas e respostas progressivas. Ideal para educar e eliminar objeções da audiência.',
    version: '1.0.0',
    active: true,
    category: 'educacao',
    goal: 'educar e gerar engajamento',
    tone: 'claro, prático e persuasivo',
    preferredPlatforms: ['instagram', 'linkedin'],
    preferredNiches: [
      'education',
      'services',
      'health',
      'consulting',
      'technology',
      'finance',
    ],
    recommendedSlideCount: { min: 4, max: 12, default: 7 },
    narrative: {
      name: 'Pergunta-Resposta Progressiva',
      description:
        'Sequência de perguntas frequentes respondidas de forma clara e progressiva, com bônus e CTA.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Capa — Título do FAQ',
          maxHeadlineChars: 60,
          maxBodyChars: 0,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Pergunta 1 — Pergunta mais comum',
          maxHeadlineChars: 50,
          maxBodyChars: 140,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Pergunta 2 — Segunda pergunta frequente',
          maxHeadlineChars: 50,
          maxBodyChars: 140,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Pergunta 3 — Terceira pergunta',
          maxHeadlineChars: 50,
          maxBodyChars: 140,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Pergunta 4 — Quarta pergunta',
          maxHeadlineChars: 50,
          maxBodyChars: 140,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Bônus — Dica extra que agrega valor',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Próximo passo',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Crie um FAQ visual com pelo menos 3-4 perguntas reais do público. Respostas curtas e diretas.',
    },
    visualStyle:
      'Carrossel de FAQ clean, tipografia serifada para perguntas, sans-serif para respostas, ícone de interrogação sutil, composição equilibrada.',
    textDensity: 'rich',
    defaultDirection: {
      editorial: 'clean',
      hierarchy: 'text-dominant',
      density: 'rich',
      composition: 'centered',
      imagery: 'icons',
      brandIntensity: 'balanced',
    },
    recommendedCta: 'Tem mais perguntas? Comente abaixo.',
    ctaVariations: [
      'Tem mais perguntas? Comente abaixo.',
      'Salve este FAQ para consultar depois.',
      'Compartilhe com alguém com as mesmas dúvidas.',
      'Fale comigo no direct para uma consultoria.',
    ],
    editorialChecks: [
      {
        id: 'faq-min-questions',
        description: 'Verifica se há pelo menos 3 perguntas distintas',
        severity: 'warning',
        message: 'O FAQ deve ter pelo menos 3 perguntas diferentes para ser útil.',
      },
      {
        id: 'faq-jargon',
        description: 'Detecta jargão técnico excessivo',
        severity: 'warning',
        pattern: '(KPI|ROI| churn|pipeline|funil|B2B|SaaS)',
        message: 'Evite jargão. Traduza termos técnicos para linguagem acessível.',
      },
      {
        id: 'faq-answer-concise',
        description: 'Verifica se as respostas são concisas',
        severity: 'info',
        pattern: '.{141,}',
        message: 'Respostas muito longas perdem a atenção em carrosséis.',
      },
      {
        id: 'faq-question-clarity',
        description: 'Verifica se as perguntas são claras',
        severity: 'info',
        message: 'As perguntas devem refletir dúvidas reais do público.',
      },
    ],
    instruction:
      'Crie um FAQ visual com pelo menos 3-4 perguntas reais do público. Respostas curtas e diretas.',
  },

  // =========================================================================
  // 10. COMPARISON
  // =========================================================================
  {
    id: 'comparison',
    label: 'Comparação',
    description:
      'Carrossel que compara abordagens, soluções ou conceitos de forma visual lado a lado. Gera autoridade.',
    version: '1.0.0',
    active: true,
    category: 'autoridade',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    preferredPlatforms: ['instagram', 'linkedin'],
    preferredNiches: [
      'technology',
      'software',
      'services',
      'consulting',
      'marketing',
      'finance',
    ],
    recommendedSlideCount: { min: 4, max: 10, default: 6 },
    narrative: {
      name: 'Comparação Visual Lado a Lado',
      description:
        'Apresenta comparações equilibradas entre duas ou mais abordagens, com prova e CTA.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Capa — Tema da comparação',
          maxHeadlineChars: 60,
          maxBodyChars: 0,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Comparação 1 — Critério principal',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Comparação 2 — Segundo critério',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Comparação 3 — Terceiro critério',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Prova — Evidência da abordagem superior',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Recomendação',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Compare duas abordagens ou soluções de forma equilibrada. Use layout lado a lado.',
    },
    visualStyle:
      'Carrossel de comparação split-screen, dois tons de cores para cada lado, tipografia limpa e hierárquica, ícones de check e X.',
    textDensity: 'medium',
    defaultDirection: {
      editorial: 'corporativo-moderno',
      hierarchy: 'balanced',
      density: 'medium',
      composition: 'grid',
      imagery: 'icons',
      brandIntensity: 'balanced',
    },
    recommendedCta: 'Qual opção faz mais sentido para você?',
    ctaVariations: [
      'Qual opção faz mais sentido para você?',
      'Salve para consultar quando precisar decidir.',
      'Compartilhe com quem está nessa dúvida.',
    ],
    editorialChecks: [
      {
        id: 'comp-fair',
        description: 'Verifica se a comparação é justa',
        severity: 'warning',
        pattern: '(ridículo|absurdo|péssimo|horrível)',
        message: 'Evite adjetivos negativos extremos. Seja justo na comparação.',
      },
      {
        id: 'comp-no-bashing',
        description: 'Verifica se não há ataque direto a concorrentes',
        severity: 'error',
        pattern: '(concorrente|marca X|empresa Y|eles fazem)',
        message: 'Foque na metodologia, não em atacar concorrentes.',
      },
      {
        id: 'comp-criteria',
        description: 'Verifica se os critérios de comparação são claros',
        severity: 'info',
        message: 'Cada slide de comparação deve ter um critério claro e mensurável.',
      },
    ],
    instruction:
      'Compare duas abordagens ou soluções de forma equilibrada. Use layout lado a lado.',
  },

  // =========================================================================
  // 11. TESTIMONIAL
  // =========================================================================
  {
    id: 'testimonial',
    label: 'Depoimento/prova',
    description:
      'Carrossel que apresenta depoimentos e provas sociais progressivas para construir confiança e converter.',
    version: '1.0.0',
    active: true,
    category: 'conversao',
    goal: 'vender uma oferta',
    tone: 'especialista, direto e premium',
    preferredPlatforms: ['instagram', 'linkedin'],
    preferredNiches: [
      'health',
      'fitness',
      'education',
      'consulting',
      'e-commerce',
      'services',
    ],
    recommendedSlideCount: { min: 4, max: 10, default: 6 },
    narrative: {
      name: 'Prova Social Progressiva',
      description:
        'Acumula provas sociais de forma progressiva: contexto, depoimentos, resultados e CTA.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Capa — Gancho com resultado de cliente',
          maxHeadlineChars: 60,
          maxBodyChars: 0,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Contexto — Situação do cliente antes',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Depoimento 1 — Testemunho principal',
          maxHeadlineChars: 50,
          maxBodyChars: 140,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Depoimento 2 — Segunda prova',
          maxHeadlineChars: 50,
          maxBodyChars: 140,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Resultado consolidado — Dados e números',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Convite à ação',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Apresente depoimentos reais ou realistas com contexto, resultado e dados específicos.',
    },
    visualStyle:
      'Carrossel de depoimento premium, aspas estilizadas, foto de perfil sutil, dados em destaque e composição editorial.',
    textDensity: 'medium',
    defaultDirection: {
      editorial: 'revista',
      hierarchy: 'visual-dominant',
      density: 'medium',
      composition: 'asymmetric',
      imagery: 'people',
      brandIntensity: 'balanced',
    },
    recommendedCta: 'Quer o mesmo resultado? Fale comigo.',
    ctaVariations: [
      'Quer o mesmo resultado? Fale comigo.',
      'Salve para ver o que é possível.',
      'Marque alguém que precisa disso.',
      'Acesse o link na bio e comece hoje.',
    ],
    editorialChecks: [
      {
        id: 'test-authentic',
        description: 'Verifica se o tom do depoimento é autêntico',
        severity: 'warning',
        pattern: '(melhor|perfeito|incrível|fantástico|sensacional)',
        message: 'Depoimentos muito entusiásticos podem parecer fabricados.',
      },
      {
        id: 'test-specific-results',
        description: 'Verifica se há resultados específicos',
        severity: 'warning',
        pattern: '(R\\$|\\d+%|\\d+x|em \\d+ meses|desde que)',
        message: 'Inclua dados específicos para tornar o depoimento crível.',
      },
      {
        id: 'test-context',
        description: 'Verifica se há contexto do cliente',
        severity: 'info',
        message: 'Contextualize quem é a pessoa e qual era sua situação.',
      },
    ],
    instruction:
      'Apresente depoimentos reais ou realistas com contexto, resultado e dados específicos.',
  },

  // =========================================================================
  // 12. STATISTICS
  // =========================================================================
  {
    id: 'statistics',
    label: 'Estatísticas',
    description:
      'Carrossel focado em dados e estatísticas impactantes. Gera autoridade com números.',
    version: '1.0.0',
    active: true,
    category: 'autoridade',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    preferredPlatforms: ['instagram', 'linkedin'],
    preferredNiches: [
      'finance',
      'technology',
      'health',
      'marketing',
      'education',
      'consulting',
    ],
    recommendedSlideCount: { min: 4, max: 10, default: 6 },
    narrative: {
      name: 'Dados que Convertem',
      description:
        'Apresenta dados e estatísticas de forma visual com insights e CTA.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Capa — Dado chocante ou curiosity gap',
          maxHeadlineChars: 60,
          maxBodyChars: 0,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Estatística 1 — Dado de impacto',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Estatística 2 — Segundo dado relevante',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Estatística 3 — Terceiro dado',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Insight — O que isso significa na prática',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Aplicação prática',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Use dados e estatísticas impactantes com fontes. Cada slide deve ter um número grande e uma explicação curta.',
    },
    visualStyle:
      'Carrossel de dados sofisticado, números gigantes em destaque, gráficos abstratos minimalistas, paleta monocromática com cor de destaque.',
    textDensity: 'minimal',
    defaultDirection: {
      editorial: 'tech-futurista',
      hierarchy: 'visual-dominant',
      density: 'minimal',
      composition: 'bento',
      imagery: 'icons',
      brandIntensity: 'content-dominant',
    },
    recommendedCta: 'Salve para consultar depois.',
    ctaVariations: [
      'Salve para consultar depois.',
      'Compartilhe com quem precisa desses dados.',
      'Siga para mais insights baseados em dados.',
    ],
    editorialChecks: [
      {
        id: 'stat-cite-source',
        description: 'Verifica se as fontes são citadas',
        severity: 'warning',
        message: 'Cite as fontes das estatísticas para aumentar a credibilidade.',
      },
      {
        id: 'stat-no-cherry-pick',
        description: 'Verifica se os dados não são cherry-picked',
        severity: 'warning',
        pattern: '(segundo estudo genérico|pesquisas mostram|dizem que)',
        message: 'Seja específico sobre a fonte dos dados.',
      },
      {
        id: 'stat-minimal-text',
        description: 'Verifica se o texto por slide é mínimo',
        severity: 'info',
        pattern: '.{101,}',
        message: 'Em carrosséis de dados, menos texto é mais impactante.',
      },
    ],
    instruction:
      'Use dados e estatísticas impactantes com fontes. Cada slide deve ter um número grande e uma explicação curta.',
  },

  // =========================================================================
  // 13. PROBLEM-SOLUTION
  // =========================================================================
  {
    id: 'problem-solution',
    label: 'Problema-solução',
    description:
      'Carrossel que identifica uma dor, amplifica o impacto e apresenta a solução com prova. Ideal para vender.',
    version: '1.0.0',
    active: true,
    category: 'conversao',
    goal: 'vender uma oferta',
    tone: 'claro, prático e persuasivo',
    preferredPlatforms: ['instagram', 'linkedin'],
    preferredNiches: [
      'education',
      'technology',
      'health',
      'finance',
      'fitness',
      'marketing',
      'consulting',
      'e-commerce',
      'services',
      'fashion',
      'restaurants',
    ],
    recommendedSlideCount: { min: 3, max: 8, default: 5 },
    narrative: {
      name: 'Dor → Alívio → Transformação',
      description:
        'Identifica a dor do público, amplifica suas consequências e apresenta a solução com prova.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Gancho — Dor principal do público',
          maxHeadlineChars: 60,
          maxBodyChars: 80,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Amplificação — Consequências de não resolver',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Mecanismo — Como a solução funciona',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Prova — Resultados obtidos',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Próximo passo',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Identifique a dor, amplifique as consequências e apresente a solução com prova concreta.',
    },
    visualStyle:
      'Carrossel de problema-solução premium, transição visual clara entre dor e solução, cores contrastantes, tipografia empática.',
    textDensity: 'medium',
    defaultDirection: {
      editorial: 'clean',
      hierarchy: 'text-dominant',
      density: 'medium',
      composition: 'centered',
      imagery: 'illustration',
      brandIntensity: 'balanced',
    },
    recommendedCta: 'Pronto para resolver isso? Clique no link.',
    ctaVariations: [
      'Pronto para resolver isso? Clique no link.',
      'Salve para lembrar da solução.',
      'Compartilhe com alguém que está passando por isso.',
    ],
    editorialChecks: [
      {
        id: 'ps-empathy',
        description: 'Verifica se o tom é empático com a dor',
        severity: 'warning',
        pattern: '(bobeira| besteira| não faz sentido| simplesmente)',
        message: 'Use tom empático ao falar da dor. Evite minimizar.',
      },
      {
        id: 'ps-realistic-solution',
        description: 'Verifica se a solução é realista',
        severity: 'warning',
        pattern: '(mágico|milagre|resolver tudo|solução definitiva)',
        message: 'Prometa resultados realistas, não soluções mágicas.',
      },
      {
        id: 'ps-proof-needed',
        description: 'Verifica se há prova ou evidência',
        severity: 'info',
        message: 'Inclua pelo menos uma prova ou dado que sustente a solução.',
      },
    ],
    instruction:
      'Identifique a dor, amplifique as consequências e apresente a solução com prova concreta.',
  },

  // =========================================================================
  // 14. US-VS-THEM
  // =========================================================================
  {
    id: 'us-vs-them',
    label: 'Us vs Them',
    description:
      'Carrossel que contrasta a abordagem convencional com uma abordagem superior. Gera autoridade.',
    version: '1.0.0',
    active: true,
    category: 'autoridade',
    goal: 'gerar autoridade',
    tone: 'especialista, direto e premium',
    preferredPlatforms: ['instagram', 'linkedin'],
    preferredNiches: [
      'technology',
      'marketing',
      'consulting',
      'education',
      'services',
      'finance',
    ],
    recommendedSlideCount: { min: 3, max: 8, default: 5 },
    narrative: {
      name: 'O Convencional vs. O que Funciona',
      description:
        'Contrasta o modo convencional com uma abordagem comprovadamente melhor, sem atacar pessoas.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Capa — Provocação sobre o convencional',
          maxHeadlineChars: 60,
          maxBodyChars: 0,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Contraste 1 — Primeira diferença',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Contraste 2 — Segunda diferença',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Ponte — Conexão e síntese',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Convite à nova abordagem',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Contraste o convencional com o que funciona, focando em metodologia e não em pessoas.',
    },
    visualStyle:
      'Carrossel de contraste split, dois mundos visuais opostos, tipografia bold, seta de transição entre os lados.',
    textDensity: 'medium',
    defaultDirection: {
      editorial: 'bold',
      hierarchy: 'balanced',
      density: 'medium',
      composition: 'asymmetric',
      imagery: 'illustration',
      brandIntensity: 'balanced',
    },
    recommendedCta: 'Adote a abordagem que funciona.',
    ctaVariations: [
      'Adote a abordagem que funciona.',
      'Salve para consultar quando precisar.',
      'Compartilhe com quem ainda faz do jeito antigo.',
    ],
    editorialChecks: [
      {
        id: 'us-no-attacks',
        description: 'Verifica se não há ataques pessoais',
        severity: 'error',
        pattern: '(burro|idiota|perdedor|fracassado)',
        message: 'Nunca ataque pessoas. Foque na metodologia.',
      },
      {
        id: 'us-methodology-focus',
        description: 'Verifica se o foco é em metodologia',
        severity: 'warning',
        message: 'O contraste deve ser entre abordagens, não entre pessoas.',
      },
      {
        id: 'us-respectful',
        description: 'Verifica se o tom é respeitoso',
        severity: 'info',
        pattern: '(toda gente|todo mundo faz|ninguém sabe)',
        message: 'Evite generalizações que possam ofender o público.',
      },
    ],
    instruction:
      'Contraste o convencional com o que funciona, focando em metodologia e não em pessoas.',
  },

  // =========================================================================
  // 15. BEST-SELLERS
  // =========================================================================
  {
    id: 'best-sellers',
    label: 'Best-sellers',
    description:
      'Carrossel que apresenta os produtos mais vendidos com contexto e prova social. Ideal para e-commerce.',
    version: '1.0.0',
    active: true,
    category: 'conversao',
    goal: 'vender uma oferta',
    tone: 'claro, prático e persuasivo',
    preferredPlatforms: ['instagram'],
    preferredNiches: [
      'e-commerce',
      'fashion',
      'restaurants',
      'fitness',
      'health',
      'services',
    ],
    recommendedSlideCount: { min: 3, max: 8, default: 5 },
    narrative: {
      name: 'Os Mais Vendidos Explicados',
      description:
        'Apresenta os produtos mais populares com contexto de popularidade e prova social.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Capa — Gancho com o mais vendido',
          maxHeadlineChars: 60,
          maxBodyChars: 0,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Produto 1 — O mais popular',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Produto 2 — O segundo mais popular',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'proof',
          role: 'Prova social — Dados de popularidade',
          maxHeadlineChars: 50,
          maxBodyChars: 100,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Onde comprar',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Apresente os produtos mais vendidos com dados reais de popularidade. Não crie escassez artificial.',
    },
    visualStyle:
      'Carrossel de best-sellers premium, produtos em destaque, badges de "mais vendido", números grandes e composição editorial.',
    textDensity: 'light',
    defaultDirection: {
      editorial: 'revista',
      hierarchy: 'visual-dominant',
      density: 'light',
      composition: 'grid',
      imagery: 'product',
      brandIntensity: 'brand-dominant',
    },
    recommendedCta: 'Garanta o mais vendido no link da bio.',
    ctaVariations: [
      'Garanta o mais vendido no link da bio.',
      'Veja todos no link da bio.',
      'Salve para consultar depois.',
    ],
    editorialChecks: [
      {
        id: 'bs-real-data',
        description: 'Verifica se os dados de popularidade são reais',
        severity: 'warning',
        pattern: '(mais vendido do mundo|número 1|sem estoque)',
        message: 'Use dados reais de popularidade. Evite escassez artificial.',
      },
      {
        id: 'bs-no-fake-scarcity',
        description: 'Verifica se não há escassez falsa',
        severity: 'error',
        pattern: '(últimas unidades|acabando|só restam|esgotando)',
        message: 'Escassez artificial prejudica a confiança.',
      },
      {
        id: 'bs-context',
        description: 'Verifica se há contexto de por que é popular',
        severity: 'info',
        message: 'Explique por que o produto é popular para agregar valor.',
      },
    ],
    instruction:
      'Apresente os produtos mais vendidos com dados reais de popularidade. Não crie escassez artificial.',
  },

  // =========================================================================
  // 16. NEGATIVE-HOOK
  // =========================================================================
  {
    id: 'negative-hook',
    label: 'Negative hook',
    description:
      'Carrossel que começa com um anti-pattern e mostra o caminho correto. Captura atenção com provocação.',
    version: '1.0.0',
    active: true,
    category: 'engajamento',
    goal: 'capturar leads',
    tone: 'leve, divertido e provocativo',
    preferredPlatforms: ['instagram', 'tiktok'],
    preferredNiches: [
      'education',
      'technology',
      'health',
      'finance',
      'fitness',
      'marketing',
      'consulting',
      'e-commerce',
      'services',
      'fashion',
      'restaurants',
    ],
    recommendedSlideCount: { min: 4, max: 10, default: 6 },
    narrative: {
      name: 'O que NÃO Fazer',
      description:
        'Apresenta anti-patterns comuns e depois mostra o caminho certo, terminando com CTA positivo.',
      slideSequence: [
        {
          type: 'hook',
          role: 'Capa — Anti-hook provocativo',
          maxHeadlineChars: 60,
          maxBodyChars: 0,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Erro 1 — Anti-pattern comum',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Erro 2 — Segundo anti-pattern',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'Erro 3 — Terceiro anti-pattern',
          maxHeadlineChars: 50,
          maxBodyChars: 120,
          requiresCta: false,
        },
        {
          type: 'content',
          role: 'O caminho certo — Solução positiva',
          maxHeadlineChars: 50,
          maxBodyChars: 140,
          requiresCta: false,
        },
        {
          type: 'cta',
          role: 'CTA — Próximo passo positivo',
          maxHeadlineChars: 50,
          maxBodyChars: 80,
          requiresCta: true,
        },
      ],
      promptInstruction:
        'Comece com anti-patterns que o público comete e termine com a solução positiva.',
    },
    visualStyle:
      'Carrossel de negative hook, tons escuros nos erros e tons claros na solução, ícone de X nos erros e check na solução, transição visual marcante.',
    textDensity: 'medium',
    defaultDirection: {
      editorial: 'bold',
      hierarchy: 'text-dominant',
      density: 'medium',
      composition: 'centered',
      imagery: 'icons',
      brandIntensity: 'content-dominant',
    },
    recommendedCta: 'Aplique o que funciona. Link na bio.',
    ctaVariations: [
      'Aplique o que funciona. Link na bio.',
      'Salve para não cometer esses erros.',
      'Compartilhe com quem ainda faz assim.',
      'Siga para mais dicas do que funciona.',
    ],
    editorialChecks: [
      {
        id: 'nh-constructive',
        description: 'Verifica se a crítica é construtiva',
        severity: 'error',
        pattern: '(burro|idiota|perdedo|não sabe nada)',
        message: 'A crítica deve ser construtiva e respeitosa.',
      },
      {
        id: 'nh-positive-end',
        description: 'Verifica se termina com solução positiva',
        severity: 'warning',
        message: 'O carrossel DEVE terminar com a solução positiva, não apenas com erros.',
      },
      {
        id: 'nh-balance',
        description: 'Verifica se há equilíbrio entre erros e solução',
        severity: 'info',
        pattern: '(erro.*erro.*erro)',
        message: 'Equilibre: mais erros do que soluções cria um tom negativo.',
      },
    ],
    instruction:
      'Comece com anti-patterns que o público comete e termine com a solução positiva.',
  },
];
