import { Metadata } from 'next';
import Link from 'next/link';
import { ConversionTracker } from '@gitroom/frontend/components/analytics/conversion-tracker.component';

// SEO content clusters
const CLUSTERS = {
  'carrossel-instagram': {
    title: 'Gerador de Carrossel para Instagram com IA',
    description: 'Crie carrosséis profissionais para Instagram com IA. Brand DNA automático, templates editoriais e agendamento direto.',
    h1: 'Crie carrosséis incríveis para Instagram em minutos',
    content: 'O ContentFlow usa inteligência artificial para gerar carrosséis alinhados à identidade da sua marca. Cole a URL do seu site, o sistema extrai cores, tom de voz e público-alvo — e gera slides profissionais automaticamente.',
    keywords: ['carrossel instagram', 'gerador de carrossel', 'carrossel com ia', 'criar carrossel instagram'],
    cta: 'Criar meu primeiro carrossel',
  },
  'carrossel-linkedin': {
    title: 'Gerador de Carrossel para LinkedIn com IA',
    description: 'Gere carrosséis para LinkedIn com tom profissional. Brand DNA automático e templates para B2B.',
    h1: 'Carrosséis LinkedIn que geram engajamento B2B',
    content: 'Carrosséis no LinkedIn são o formato que mais gera engajamento. O ContentFlow cria slides com tom profissional, alinhados à marca, prontos para publicar — sem precisar de designer.',
    keywords: ['carrossel linkedin', 'carrossel b2b', 'gerador linkedin', 'conteúdo linkedin ia'],
    cta: 'Gerar carrossel LinkedIn',
  },
  'calendario-editorial': {
    title: 'Calendário Editorial com IA para Redes Sociais',
    description: 'Crie calendários editoriais automáticos. A IA gera ideias, carrosséis e agendamento — tudo integrado.',
    h1: 'Calendário editorial automático com IA',
    content: 'Configure a frequência, canais e pilares de conteúdo. O ContentFlow gera ideias para 30/60/90 dias, cria carrosséis e agenda direto no calendário — tudo alinhado ao Brand DNA da sua marca.',
    keywords: ['calendário editorial', 'calendário editorial ia', 'planejamento conteúdo', 'agendamento redes sociais'],
    cta: 'Criar meu calendário',
  },
  'brand-dna': {
    title: 'Brand DNA: Identidade da Marca Automatizada com IA',
    description: 'Extraia o DNA da sua marca automaticamente. Cores, tom de voz, público — a IA usa em todo conteúdo gerado.',
    h1: 'Brand DNA: sua marca, automatizada',
    content: 'Cole a URL do seu site e o ContentFlow extrai automaticamente: cores, tipografia, tom de voz, público-alvo, diferenciais e proposta de valor. Esse DNA é usado em cada carrossel, post e legenda gerado.',
    keywords: ['brand dna', 'identidade marca', 'branding automático', 'perfil marca ia'],
    cta: 'Extrair meu Brand DNA',
  },
  'comparacao-canva': {
    title: 'ContentFlow vs Canva: Melhor Gerador de Carrosséis?',
    description: 'Compare ContentFlow e Canva para criar carrosseis. Brand DNA, IA integrada e calendário editorial vs editor manual.',
    h1: 'ContentFlow vs Canva: qual é melhor para carrosséis?',
    content: 'Canva é um editor visual genérico. ContentFlow é um estúdio de conteúdo com IA que conhece sua marca. Com Brand DNA persistente, geração automática e calendário integrado, você cria conteúdo on-brand em minutos — não em horas.',
    keywords: ['contentflow vs canva', 'alternativa canva', 'melhor gerador carrossel', 'canva concorrente'],
    cta: 'Experimentar ContentFlow grátis',
  },
  'comparacao-chatgpt': {
    title: 'ContentFlow vs ChatGPT: Gerar Carrosséis com IA',
    description: 'Compare ContentFlow e ChatGPT para criar conteúdo. Brand DNA, visual integrado e publicação direta vs prompts manuais.',
    h1: 'ContentFlow vs ChatGPT: IA para conteúdo de marca',
    content: 'ChatGPT gera texto genérico. ContentFlow gera carrosséis completos com identidade visual, Brand DNA persistente e agendamento no calendário. Sem copiar e colar — tudo em um fluxo só.',
    keywords: ['contentflow vs chatgpt', 'chatgpt carrossel', 'ia conteúdo marca', 'alternativa chatgpt marketing'],
    cta: 'Ver a diferença',
  },
};

type PageProps = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return Object.keys(CLUSTERS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const cluster = CLUSTERS[params.slug as keyof typeof CLUSTERS];
  if (!cluster) return { title: 'Não encontrado' };

  return {
    title: cluster.title,
    description: cluster.description,
    keywords: cluster.keywords,
    openGraph: {
      title: cluster.title,
      description: cluster.description,
      type: 'website',
    },
  };
}

export default function SeoPage({ params }: PageProps) {
  const cluster = CLUSTERS[params.slug as keyof typeof CLUSTERS];

  if (!cluster) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <h1>Página não encontrada</h1>
        <p>Este conteúdo não existe.</p>
        <Link href="/">Voltar ao início</Link>
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-8">
      <ConversionTracker source={`seo-${params.slug}`} campaign={cluster.title} />
      <nav className="text-sm" style={{ color: 'var(--muted, #888)' }}>
        <Link href="/">Início</Link> / <span>{cluster.title}</span>
      </nav>

      <h1 className="text-3xl font-bold">{cluster.h1}</h1>

      <p className="text-lg leading-relaxed">{cluster.content}</p>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Como funciona</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Cole a URL da sua marca</li>
          <li>A IA extrai o Brand DNA automaticamente</li>
          <li>Gere carrosséis, posts e legendas on-brand</li>
          <li>Edite, agende e publique</li>
        </ol>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Por que escolher o ContentFlow?</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Brand DNA persistente — configure uma vez, use em tudo</li>
          <li>Geração com IA alinhada à identidade da marca</li>
          <li>Calendário editorial integrado</li>
          <li>Publicação direta nas redes sociais</li>
          <li>Multi-marca para agências</li>
        </ul>
      </div>

      <div className="text-center p-8 rounded-lg" style={{ background: 'var(--card, white)', border: '1px solid var(--border, #e5e7eb)' }}>
        <h2 className="text-xl font-bold mb-4">{cluster.cta}</h2>
        <p className="mb-4" style={{ color: 'var(--muted, #888)' }}>
          Sem cartão de crédito · Primeiros carrosséis grátis
        </p>
        <Link
          href="/auth"
          className="inline-block px-6 py-3 text-white rounded-lg font-medium"
          style={{ background: 'var(--primary, #3b82f6)' }}
        >
          Começar agora
        </Link>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Artigos relacionados</h2>
        <ul className="space-y-1">
          {Object.entries(CLUSTERS)
            .filter(([key]) => key !== params.slug)
            .slice(0, 3)
            .map(([key, c]) => (
              <li key={key}>
                <Link href={`/seo/${key}`} className="hover:underline" style={{ color: 'var(--primary, #3b82f6)' }}>
                  {c.title}
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </main>
  );
}
