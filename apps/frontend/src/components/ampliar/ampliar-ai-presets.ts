import type { AmpliarPrefill } from './ampliar.types';
import { buildContextFromPrefill } from './use-ampliar-prefill';

export type AmpliarAiDomain = 'ads' | 'email' | 'video';

export type AmpliarAiPath = {
  id: string;
  domain: AmpliarAiDomain;
  title: string;
  subtitle: string;
  why: string;
  recommended?: boolean;
  badge?: string;
  /** payload pronto para a API de cada domínio */
  payload: Record<string, unknown>;
};

function goalBucket(goal?: string, objective?: string) {
  const g = `${goal || ''} ${objective || ''}`.toLowerCase();
  if (/lead|captur|lista|form/.test(g)) return 'leads';
  if (/venda|convers|compr|checkout|oferta/.test(g)) return 'conversion';
  if (/educ|ensin|autorid|thought/.test(g)) return 'educate';
  if (/engaj|comunid|salvar|compartilh/.test(g)) return 'engagement';
  if (/tr[aá]fego|visita|clique|site/.test(g)) return 'traffic';
  return 'traffic';
}

function platformFromPrefill(prefill: AmpliarPrefill): string {
  const p = (prefill as any).platform || '';
  const s = String(p).toLowerCase();
  if (s.includes('linkedin')) return 'LINKEDIN';
  if (s.includes('facebook') || s === 'fb') return 'META_FACEBOOK';
  if (s.includes('tiktok')) return 'META_INSTAGRAM'; // ads kit foca meta/ig
  return 'META_INSTAGRAM';
}

/**
 * Monta caminhos de IA para Ads — a pessoa escolhe um card, não um formulário.
 */
export function buildAdsAiPaths(
  prefill: AmpliarPrefill,
  brand?: { website?: string | null; name?: string | null } | null
): AmpliarAiPath[] {
  const context = buildContextFromPrefill(prefill);
  const objectiveText =
    prefill.topic ||
    prefill.hook ||
    'Promover a oferta principal da marca com clareza e CTA único';
  const bucket = goalBucket(prefill.goal, prefill.objective);
  const primaryPlatform = platformFromPrefill(prefill);
  const dest = brand?.website || undefined;

  const objectiveMap: Record<string, string> = {
    leads: 'LEAD_GENERATION',
    conversion: 'CONVERSION',
    educate: 'CONSIDERATION',
    engagement: 'ENGAGEMENT',
    traffic: 'TRAFFIC',
  };

  const primaryObjective = objectiveMap[bucket] || 'TRAFFIC';

  const base = {
    contentObjective: objectiveText,
    additionalContext: context || undefined,
    contentIdeaId: prefill.ideaId,
    carouselProjectId: prefill.projectId,
    destinationUrl: dest,
    variants: 3,
  };

  return [
    {
      id: 'ads-ig-traffic',
      domain: 'ads',
      title: 'Instagram — tráfego',
      subtitle: '3 variações de copy + CTA para o site',
      why: 'Melhor ponto de partida se você quer cliques rápidos com a ideia atual.',
      recommended: bucket === 'traffic' || bucket === 'educate',
      badge: bucket === 'traffic' || bucket === 'educate' ? 'Recomendado' : undefined,
      payload: {
        ...base,
        platforms: ['META_INSTAGRAM'],
        objective: 'TRAFFIC',
        adType: 'AUTO',
      },
    },
    {
      id: 'ads-meta-convert',
      domain: 'ads',
      title: 'Meta — conversão',
      subtitle: 'Facebook + Instagram focados em ação',
      why: 'Use quando a ideia tem oferta clara ou prova social forte.',
      recommended: bucket === 'conversion',
      badge: bucket === 'conversion' ? 'Recomendado' : undefined,
      payload: {
        ...base,
        platforms: ['META_INSTAGRAM', 'META_FACEBOOK'],
        objective: 'CONVERSION',
        adType: 'AUTO',
      },
    },
    {
      id: 'ads-linkedin',
      domain: 'ads',
      title: 'LinkedIn — B2B',
      subtitle: 'Tom profissional, 3 hooks',
      why: 'Ideal se o público é decisor / empresa.',
      recommended: primaryPlatform === 'LINKEDIN',
      badge: primaryPlatform === 'LINKEDIN' ? 'Recomendado' : undefined,
      payload: {
        ...base,
        platforms: ['LINKEDIN'],
        objective: primaryObjective === 'TRAFFIC' ? 'CONSIDERATION' : primaryObjective,
        adType: 'STATIC',
      },
    },
    {
      id: 'ads-leads',
      domain: 'ads',
      title: 'Geração de leads',
      subtitle: 'Copy para captura (formulário / lead magnet)',
      why: 'Quando o próximo passo é e-mail ou demo, não compra direta.',
      recommended: bucket === 'leads',
      badge: bucket === 'leads' ? 'Recomendado' : undefined,
      payload: {
        ...base,
        platforms: ['META_INSTAGRAM', 'META_FACEBOOK'],
        objective: 'LEAD_GENERATION',
        adType: 'AUTO',
      },
    },
  ];
}

export function buildEmailAiPaths(prefill: AmpliarPrefill): AmpliarAiPath[] {
  const context = buildContextFromPrefill(prefill);
  const nameBase = prefill.topic || 'Campanha da marca';
  const hasIdea = Boolean(prefill.ideaId || prefill.topic || prefill.hook);

  return [
    {
      id: 'email-welcome',
      domain: 'email',
      title: 'Sequência de boas-vindas',
      subtitle: '4 e-mails (D0 → D9) com DNA da marca',
      why: 'Maior retorno para founder solo: nutre quem entrou na lista.',
      recommended: !hasIdea,
      badge: !hasIdea ? 'Recomendado' : 'Sempre útil',
      payload: {
        mode: 'welcome_sequence',
        sequenceLength: 4,
        additionalContext: context || undefined,
        contentIdeaId: prefill.ideaId,
        carouselProjectId: prefill.projectId,
      },
    },
    {
      id: 'email-promo',
      domain: 'email',
      title: 'E-mail promocional da ideia',
      subtitle: '1 e-mail com oferta/CTA a partir do hook',
      why: 'Transforma a ideia aprovada em mensagem pronta pra cola no ESP.',
      recommended: hasIdea,
      badge: hasIdea ? 'Recomendado' : undefined,
      payload: {
        mode: 'promotional',
        name: `Promo: ${nameBase}`.slice(0, 80),
        campaignType: 'promotional',
        additionalContext: context || undefined,
        contentIdeaId: prefill.ideaId,
        carouselProjectId: prefill.projectId,
      },
    },
    {
      id: 'email-newsletter',
      domain: 'email',
      title: 'Newsletter',
      subtitle: 'Atualização da marca em tom editorial',
      why: 'Bom para autoridade e rotina semanal.',
      payload: {
        mode: 'newsletter',
        name: `Newsletter: ${nameBase}`.slice(0, 80),
        campaignType: 'newsletter',
        additionalContext: context || undefined,
        contentIdeaId: prefill.ideaId,
        carouselProjectId: prefill.projectId,
      },
    },
  ];
}

export function buildVideoAiPaths(prefill: AmpliarPrefill): AmpliarAiPath[] {
  const context = buildContextFromPrefill(prefill);
  const base = {
    contentIdeaId: prefill.ideaId,
    carouselProjectId: prefill.projectId,
    additionalContext: context || undefined,
    name: (prefill.topic || 'Roteiro Ampliar').slice(0, 80),
  };

  const hasSource = Boolean(prefill.ideaId || prefill.projectId || prefill.topic);

  return [
    {
      id: 'video-reels-30',
      domain: 'video',
      title: 'Reels 30s',
      subtitle: 'Hook forte + CTA final · 9:16',
      why: 'Formato mais usado no dia a dia do founder.',
      recommended: true,
      badge: 'Recomendado',
      payload: { ...base, format: 'REELS', maxDuration: 30 },
    },
    {
      id: 'video-tiktok-15',
      domain: 'video',
      title: 'TikTok 15s',
      subtitle: 'Ritmo rápido, uma ideia só',
      why: 'Ideal para testar o hook da ideia em menos tempo.',
      payload: { ...base, format: 'TIKTOK', maxDuration: 15 },
    },
    {
      id: 'video-shorts-60',
      domain: 'video',
      title: 'Shorts 60s',
      subtitle: 'Mais profundidade / storytelling',
      why: 'Quando o ângulo precisa de contexto antes do CTA.',
      recommended: /educ|ensin|hist[oó]ria/.test(
        `${prefill.goal || ''} ${prefill.angle || ''}`.toLowerCase()
      ),
      payload: { ...base, format: 'SHORTS', maxDuration: 60 },
    },
    {
      id: 'video-stories-15',
      domain: 'video',
      title: 'Stories 15s',
      subtitle: 'Bastidor ou CTA rápido',
      why: 'Bom para urgência ou enquete — menos “peça pronta”.',
      payload: { ...base, format: 'STORIES', maxDuration: 15 },
    },
  ].map((p) => ({
    ...p,
    // desabilita visualmente no consumer se não houver source — payload ainda ok se user colar id
    subtitle: hasSource ? p.subtitle : `${p.subtitle} · use ideia ou carrossel`,
  }));
}
