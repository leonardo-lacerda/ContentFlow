/** Landing page data constants */

export const FAQ_ITEMS = [
  {
    question: "Que tipos de conteúdo posso gerar?",
    answer:
      "Carrosséis, posts de imagem única, legendas e variações da mesma ideia para diferentes formatos e redes.",
  },
  {
    question: "Como vocês mantêm a identidade da minha marca?",
    answer:
      "Você cadastra sua empresa com cores, fontes e tom de voz. A IA usa esse contexto em todos os carrosséis, mantendo tudo consistente — e você pode cadastrar várias empresas.",
  },
  {
    question: "Posso editar o resultado?",
    answer:
      "Sim. Toda copy e cada elemento podem ser ajustados antes de exportar — a IA dá o ponto de partida, você tem o controle final.",
  },
  {
    question: "As imagens geradas são minhas?",
    answer:
      "Sim. Os carrosséis que você cria são seus para usar como quiser nas suas redes e campanhas.",
  },
  {
    question: "Preciso saber design?",
    answer:
      "Não. O briefing é por seleção e o estúdio cuida da composição. Você foca na mensagem, não nas ferramentas.",
  },
  {
    question: "O que é Brand DNA?",
    answer:
      "É o perfil persistente da sua marca: cores, tom de voz, público, diferenciais. O ContentFlow extrai automaticamente do seu site e usa em todo conteúdo gerado.",
  },
  {
    question: "Funciona para agências?",
    answer:
      "Sim. Você pode cadastrar múltiplas marcas, cada uma com seu próprio Brand DNA, e gerar conteúdo independente para cada cliente.",
  },
] as const;

export const PRICING_PLANS = [
  {
    name: "Início",
    price: "R$ 0",
    period: "/mês",
    description: "Para experimentar o fluxo completo: URL → DNA → carrossel",
    features: [
      "1 empresa cadastrada",
      "10 carrosséis por mês (até 10 imagens cada)",
      "Edição de copy e visual",
    ],
    cta: { label: "Criar grátis", href: "/auth", variant: "ghost" as const },
    featured: false,
    tag: undefined,
  },
  {
    name: "Profissional",
    price: "R$ 79",
    period: "/mês",
    description:
      "Para quem usa Brand DNA e calendário editorial todos os dias",
    features: [
      "Carrosséis ilimitados (até 10 imagens)",
      "5 empresas cadastradas",
      "Todos os formatos e variações por rede",
      "Export em alta qualidade",
    ],
    cta: {
      label: "Assinar Profissional",
      href: "/auth",
      variant: "primary" as const,
    },
    featured: true,
    tag: "Mais popular",
  },
  {
    name: "Estúdio",
    price: "R$ 199",
    period: "/mês",
    description: "Para agências que gerenciam múltiplas marcas com DNA próprio",
    features: [
      "Tudo do Profissional",
      "Empresas cadastradas ilimitadas",
      "Membros da equipe",
      "Biblioteca de mídia compartilhada",
    ],
    cta: {
      label: "Falar com vendas",
      href: "/auth",
      variant: "ghost" as const,
    },
    featured: false,
    tag: undefined,
  },
] as const;

export const COMPARISON_ROWS = [
  { feature: "Brand DNA persistente", contentflow: true, canva: false, chatgpt: false, scheduling: false },
  { feature: "Geração com IA", contentflow: true, canva: "partial", chatgpt: true, scheduling: false },
  { feature: "Calendário integrado", contentflow: true, canva: false, chatgpt: false, scheduling: true },
  { feature: "Publicação direta", contentflow: true, canva: false, chatgpt: false, scheduling: true },
  { feature: "Multi-marca", contentflow: true, canva: false, chatgpt: false, scheduling: true },
] as const;

export const FEATURES = [
  {
    title: "Carrosséis",
    description:
      "Slides com copy dentro da imagem, sequência editorial e identidade aplicada.",
    iconPath:
      '<rect x="3" y="4" width="13" height="16" rx="2" /><rect x="18" y="6" width="3" height="12" rx="1.5" />',
  },
  {
    title: "Posts únicos",
    description:
      "Imagens de impacto para o feed, prontas para qualquer campanha.",
    iconPath:
      '<rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15l5-5 4 4 3-3 6 6" /><circle cx="8.5" cy="8.5" r="1.5" />',
  },
  {
    title: "Legendas",
    description:
      "Texto que combina com o carrossel e com o tom da sua marca, em segundos.",
    iconPath: '<path d="M4 6h16M4 11h16M4 16h10" />',
  },
  {
    title: "Variações por rede",
    description:
      "A mesma ideia adaptada ao formato ideal de cada plataforma.",
    iconPath:
      '<rect x="3" y="5" width="8" height="14" rx="1.5" /><rect x="14" y="5" width="7" height="9" rx="1.5" />',
  },
] as const;

export const STEPS = [
  {
    number: 1,
    title: "Cole a URL da sua marca",
    description:
      "O ContentFlow analisa o site e extrai o Brand DNA: cores, tom de voz, público-alvo e proposta de valor.",
  },
  {
    number: 2,
    title: "A IA gera ideias e carrosséis",
    description:
      "Com o DNA em mãos, a inteligência cria ideias, roteiros e slides alinhados à sua marca.",
  },
  {
    number: 3,
    title: "Revise, agende e publique",
    description:
      "Aprove ideias no Content Swipe, edite slides e agende direto no calendário editorial.",
  },
] as const;

export const FLOW_STEPS = [
  { emoji: "🔗", title: "URL", description: "Cole o endereço do site. A IA analisa e extrai o DNA da marca." },
  { emoji: "🧬", title: "DNA", description: "Cores, tom de voz, público-alvo e diferenciais — salvos e reutilizáveis." },
  { emoji: "💡", title: "Ideias", description: "A IA sugere temas, ângulos e roteiros alinhados ao DNA da marca." },
  { emoji: "🎨", title: "Carrossel", description: "Slides com copy dentro da imagem, identidade aplicada automaticamente." },
  { emoji: "📅", title: "Calendário", description: "Agende no calendário editorial e acompanhe toda a sua produção." },
] as const;

export const SOCIAL_PROOF_METRICS = [
  { count: 10, suffix: "h+", label: "economizadas por semana" },
  { count: 3, suffix: "x", label: "mais rápido para criar" },
  { count: 100, suffix: "%", label: "na identidade da marca" },
  { count: 12, suffix: "+", label: "formatos de conteúdo" },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "\"Em vez de uma tarde no Canva, faço um carrossel em minutos — e na nossa identidade.\"",
    name: "Marina A.",
    role: "Social Media",
    avatar: "https://i.pravatar.cc/80?img=47",
  },
  {
    quote:
      "\"A consistência da marca foi o que mais mudou. Tudo sai com a mesma cara.\"",
    name: "Rafael T.",
    role: "Criador de conteúdo",
    avatar: "https://i.pravatar.cc/80?img=12",
  },
  {
    quote:
      "\"Atendo mais clientes na agência porque a produção de conteúdo deixou de ser gargalo.\"",
    name: "Camila S.",
    role: "Agência",
    avatar: "https://i.pravatar.cc/80?img=32",
  },
] as const;

export const GALLERY_ITEMS = [
  {
    brand: "MARCA A",
    title: "3 ideias para esta semana",
    cta: "Salve →",
    variant: "photo" as const,
    image: "https://picsum.photos/seed/contentflow-a/640/800",
  },
  {
    brand: "MARCA B",
    title: "Como dobrar seu alcance",
    cta: "Veja como →",
    variant: "ink" as const,
    image: null,
  },
  {
    brand: "MARCA C",
    title: "Mitos &amp; verdades",
    cta: "Descubra →",
    variant: "photo" as const,
    image: "https://picsum.photos/seed/contentflow-c/640/800",
  },
  {
    brand: "MARCA D",
    title: "O método em 4 passos",
    cta: "Comece →",
    variant: "sand" as const,
    image: null,
  },
  {
    brand: "MARCA E",
    title: "Antes &amp; depois",
    cta: "Compare →",
    variant: "photo" as const,
    image: "https://picsum.photos/seed/contentflow-e/640/800",
  },
  {
    brand: "MARCA F",
    title: "Guia rápido para iniciantes",
    cta: "Aprenda →",
    variant: "cream" as const,
    image: null,
  },
] as const;

export const SOCIAL_PLATFORMS = [
  { name: "Instagram", icon: "instagram" },
  { name: "LinkedIn", icon: "linkedin" },
  { name: "TikTok", icon: "tiktok" },
  { name: "YouTube", icon: "youtube" },
  { name: "X", icon: "x" },
  { name: "Facebook", icon: "facebook" },
] as const;

export const CHANNELS = [
  "Carrosséis",
  "Posts únicos",
  "Legendas",
  "Stories",
  "Threads",
  "Capas",
  "Variações por rede",
] as const;

export const NAV_LINKS = [
  { label: "Recursos", href: "#recursos" },
  { label: "Formatos", href: "#formatos" },
  { label: "Exemplos", href: "#exemplos" },
  { label: "Preços", href: "#precos" },
  { label: "FAQ", href: "#faq" },
] as const;

export const PROBLEM_ITEMS = [
  "Horas no Canva e na copy, toda semana",
  "Conteúdo que foge da identidade da marca",
  "Bloqueio criativo e falta de ideias",
  "Cada rede pedindo um formato diferente",
] as const;

export const SOLUTION_ITEMS = [
  "Carrosséis prontos em minutos, não em horas",
  "Identidade da marca aplicada automaticamente",
  "Ideias e copy geradas a partir do seu tema",
  "Uma ideia, adaptada para cada formato e rede",
] as const;

export const DEEP_DIVES = [
  {
    eyebrow: "Estúdio de Carrosséis",
    title: "Carrosséis editoriais, sem esforço de design.",
    description:
      "Descreva o tema e o estúdio monta a sequência: gancho, desenvolvimento e fechamento — com a copy dentro da imagem e a cara da sua marca.",
    features: [
      "Briefing guiado, quase tudo por seleção",
      "Copy de cada slide gerada com IA",
      "Edite qualquer texto antes de exportar",
    ],
    frameTitle: "Estúdio",
    reverse: false,
  },
  {
    eyebrow: "Posts e legendas",
    title: "Não é só carrossel — é todo o seu feed.",
    description:
      "Gere posts de imagem única e a legenda combinando, no mesmo tom. Tudo coerente, do visual ao texto.",
    features: [
      "Imagem e legenda no mesmo tom",
      "Sugestões de hook e CTA",
      "Pronto para copiar e publicar",
    ],
    frameTitle: "Post + legenda",
    reverse: true,
  },
  {
    eyebrow: "Empresas cadastradas",
    title: "Cadastre sua marca uma vez. Use em tudo.",
    description:
      "Cadastre a empresa com cores, fontes e tom de voz. A inteligência aplica esse contexto em cada carrossel — e você pode cadastrar quantas marcas quiser.",
    features: [
      "Cores e tipografia da marca em todo carrossel",
      "Tom de voz aprendido a partir da sua marca",
      "Cadastre várias empresas e alterne entre elas",
    ],
    frameTitle: "Empresa",
    reverse: false,
  },
] as const;
