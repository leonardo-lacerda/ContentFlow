/** Landing page data constants — ContentFlow v1 */

export const FAQ_ITEMS = [
  {
    question: 'Que tipos de conteúdo posso gerar?',
    answer:
      'Carrosséis, posts de imagem única, legendas e variações da mesma ideia para Instagram, LinkedIn, X, Facebook e TikTok.',
  },
  {
    question: 'Como vocês mantêm a identidade da minha marca?',
    answer:
      'Você cola a URL do site. A IA monta o Brand DNA (cores, tom de voz, público, oferta) e usa esse perfil em todo conteúdo.',
  },
  {
    question: 'Posso editar o resultado?',
    answer:
      'Sim. Toda copy e cada slide podem ser ajustados antes de exportar ou publicar — a IA dá o ponto de partida, você tem o controle final.',
  },
  {
    question: 'As imagens geradas são minhas?',
    answer:
      'Sim. Os carrosséis que você cria são seus para usar como quiser nas suas redes.',
  },
  {
    question: 'Preciso saber design?',
    answer:
      'Não. O estúdio cuida da composição. Você foca na mensagem, não nas ferramentas.',
  },
  {
    question: 'O que é Brand DNA?',
    answer:
      'É o perfil persistente da sua marca: cores, tom de voz, público, diferenciais. O ContentFlow extrai do seu site e usa em todo conteúdo gerado.',
  },
  {
    question: 'Serve para agências com vários clientes?',
    answer:
      'O v1 é feito para o founder solo / uma marca. Multi-marca e times entram depois, se o core provar valor.',
  },
] as const;

export const PRICING_PLANS = [
  {
    name: 'Início',
    price: 'R$ 0',
    period: '/mês',
    description: 'Para experimentar o fluxo completo: URL → DNA → carrossel',
    features: [
      '1 marca (Brand DNA)',
      '5 carrosséis por mês',
      '10 ideias por mês',
      '1 canal social',
      'Edição de copy e visual',
    ],
    cta: { label: 'Criar grátis', href: '/auth', variant: 'ghost' as const },
    featured: false,
    tag: undefined as string | undefined,
  },
  {
    name: 'Profissional',
    price: 'R$ 79',
    period: '/mês',
    description:
      'Para o founder que posta todo dia com a cara da marca — sem freelancer',
    features: [
      '1 marca (Brand DNA)',
      '40 carrosséis por mês',
      '100 ideias / Content Swipe',
      '5 canais (IG, FB, LinkedIn, X, TikTok)',
      '200 imagens IA / mês',
      'Agendar e publicar',
    ],
    cta: {
      label: 'Assinar Profissional',
      href: '/auth',
      variant: 'primary' as const,
    },
    featured: true,
    tag: 'Mais popular',
  },
] as const;

export const COMPARISON_ROWS = [
  {
    feature: 'Brand DNA persistente',
    contentflow: true,
    canva: false,
    chatgpt: false,
    scheduling: false,
  },
  {
    feature: 'Geração com IA',
    contentflow: true,
    canva: 'partial',
    chatgpt: true,
    scheduling: false,
  },
  {
    feature: 'Content Swipe (ideias)',
    contentflow: true,
    canva: false,
    chatgpt: false,
    scheduling: false,
  },
  {
    feature: 'Calendário integrado',
    contentflow: true,
    canva: false,
    chatgpt: false,
    scheduling: true,
  },
  {
    feature: 'Publicar nas redes',
    contentflow: true,
    canva: false,
    chatgpt: false,
    scheduling: true,
  },
] as const;

export const HERO = {
  eyebrow: 'ContentFlow',
  title: 'Cole a URL da sua marca. Em minutos, publique conteúdo com a sua cara.',
  subtitle:
    'A IA aprende seu DNA e gera carrosséis e posts prontos pra postar — sem contratar freelancer ou agência.',
  primaryCta: { label: 'Começar grátis', href: '/auth' },
  secondaryCta: { label: 'Ver como funciona', href: '#como-funciona' },
} as const;

export const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Cole a URL',
    description: 'A IA analisa o site e monta o Brand DNA.',
  },
  {
    step: '2',
    title: 'Revise o DNA',
    description: 'Voz, público, oferta e visual — você ajusta em um minuto.',
  },
  {
    step: '3',
    title: 'Gere conteúdo',
    description: 'Swipe de ideias, carrosséis e posts com a cara da marca.',
  },
  {
    step: '4',
    title: 'Publique',
    description: 'Agende no Instagram, LinkedIn, X, Facebook ou TikTok.',
  },
] as const;

/** Alias usado por how-it-works-section.tsx */
export const STEPS = [
  {
    number: '01',
    title: 'Cole a URL',
    description: 'A IA analisa o site e monta o Brand DNA da marca.',
  },
  {
    number: '02',
    title: 'Revise o DNA',
    description: 'Ajuste voz, público, oferta e visual em um minuto.',
  },
  {
    number: '03',
    title: 'Gere e publique',
    description:
      'Swipe de ideias, carrosséis e posts — agende no IG, LinkedIn, X, FB ou TikTok.',
  },
] as const;

export const DEEP_DIVES = [
  {
    eyebrow: 'Marca',
    title: 'Brand DNA',
    description:
      'Um perfil vivo da marca. Cores, tipografia e tom de voz aplicados em cada peça.',
    features: [
      'Extração automática a partir da URL',
      'Edição manual de voz e visual',
      'Snapshots versionados do DNA',
    ],
    reverse: false,
  },
  {
    eyebrow: 'Ideias',
    title: 'Content Swipe',
    description:
      'Ideias no ritmo do Tinder: aprove o que serve, descarte o resto, gere o carrossel.',
    features: [
      'Ideias alinhadas ao DNA',
      'Aprovar / rejeitar em segundos',
      'Um toque para virar carrossel',
    ],
    reverse: true,
  },
  {
    eyebrow: 'Publicar',
    title: 'Do estúdio ao feed',
    description:
      'Agende e publique nas redes que importam — sem exportar ZIP.',
    features: [
      'Instagram, Facebook, LinkedIn, X, TikTok',
      'Calendário integrado',
      'Biblioteca de mídia',
    ],
    reverse: false,
  },
] as const;

export const NAV_LINKS = [
  { label: "Recursos", href: "#recursos" },
  { label: "Formatos", href: "#formatos" },
  { label: "Exemplos", href: "#exemplos" },
  { label: "Preços", href: "#precos" },
  { label: "FAQ", href: "#faq" },
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
    image: null as string | null,
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
    image: null as string | null,
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
    image: null as string | null,
  },
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

export const FLOW_STEPS = [
  { emoji: "🔗", title: "URL", description: "Cole o endereço do site. A IA analisa e extrai o DNA da marca." },
  { emoji: "🧬", title: "DNA", description: "Cores, tom de voz, público-alvo e diferenciais — salvos e reutilizáveis." },
  { emoji: "💡", title: "Ideias", description: "A IA sugere temas, ângulos e roteiros alinhados ao DNA da marca." },
  { emoji: "🎨", title: "Carrossel", description: "Slides com copy dentro da imagem, identidade aplicada automaticamente." },
  { emoji: "📅", title: "Calendário", description: "Agende no Instagram, LinkedIn, X, Facebook ou TikTok." },
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
    role: "Founder",
    avatar: "https://i.pravatar.cc/80?img=32",
  },
] as const;
