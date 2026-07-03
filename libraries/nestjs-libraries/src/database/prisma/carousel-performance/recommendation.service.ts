import { Injectable, Logger } from '@nestjs/common';
import { CarouselPerformanceRepository } from './carousel-performance.repository';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecommendationType =
  | 'MORE_LIKE_THIS'
  | 'VARY_HOOK'
  | 'BEST_TEMPLATES'
  | 'SATURATED_THEMES'
  | 'BEST_CHANNELS';

export interface Recommendation {
  type: RecommendationType;
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  suggestedAction: string;
  relatedData: any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roundConfidence(value: number): number {
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly carouselPerformanceRepository: CarouselPerformanceRepository,
  ) {}

  /**
   * Generate all recommendations for a brand, optionally scoped to a platform.
   */
  async getRecommendations(
    organizationId: string,
    brandProfileId: string,
    options?: { platform?: string; limit?: number },
  ): Promise<Recommendation[]> {
    const limit = options?.limit ?? 5;

    // Fetch all data in parallel
    const [
      topPerformers,
      templateAgg,
      themeAgg,
      platformAgg,
      totalCount,
    ] = await Promise.all([
      this.carouselPerformanceRepository.getTopPerformersByBrand(brandProfileId, 10),
      this.carouselPerformanceRepository.getAggregatedByTemplateForBrand(brandProfileId),
      this.carouselPerformanceRepository.getAggregatedByThemeForBrand(brandProfileId),
      this.carouselPerformanceRepository.getAggregatedByPlatformForBrand(brandProfileId),
      this.carouselPerformanceRepository.getCountByBrand(brandProfileId),
    ]);

    const recommendations: Recommendation[] = [];

    // If we don't have enough data, return a minimal suggestion
    if (totalCount < 3) {
      return [
        {
          type: 'MORE_LIKE_THIS',
          title: 'Dados insuficientes',
          description:
            'Ainda não há dados de performance suficientes para gerar recomendações detalhadas. Registre métricas de mais carrosséis para obter análises personalizadas.',
          confidence: 0.3,
          actionable: true,
          suggestedAction: 'Registar métricas de pelo menos 3 carrosséis publicados.',
          relatedData: { currentCount: totalCount },
        },
      ];
    }

    // 1. MORE_LIKE_THIS – highlight top performers
    const moreLikeThis = this.buildMoreLikeThis(topPerformers, limit);
    if (moreLikeThis) recommendations.push(moreLikeThis);

    // 2. VARY_HOOK – suggest variations based on best metadata
    const varyHook = this.buildVaryHook(topPerformers, limit);
    if (varyHook) recommendations.push(varyHook);

    // 3. BEST_TEMPLATES – template performance ranking
    const bestTemplates = this.buildBestTemplates(templateAgg, limit);
    if (bestTemplates) recommendations.push(bestTemplates);

    // 4. SATURATED_THEMES – detect overused themes
    const saturatedThemes = this.buildSaturatedThemes(themeAgg, totalCount);
    if (saturatedThemes) recommendations.push(saturatedThemes);

    // 5. BEST_CHANNELS – platform/channel analysis
    const bestChannels = this.buildBestChannels(platformAgg, options?.platform);
    if (bestChannels) recommendations.push(bestChannels);

    this.logger.debug(
      `Generated ${recommendations.length} recommendations for brand ${brandProfileId}`,
    );

    return recommendations;
  }

  // ---------------------------------------------------------------------------
  // Builders – each returns null when there's nothing useful to say
  // ---------------------------------------------------------------------------

  private buildMoreLikeThis(
    topPerformers: any[],
    limit: number,
  ): Recommendation | null {
    if (!topPerformers.length) return null;

    const top = topPerformers.slice(0, limit);
    const avgScore =
      top.reduce((sum, p) => sum + (p.normalizedScore ?? 0), 0) / top.length;

    const projects = top.map((p) => ({
      id: p.carouselProject?.id,
      title: p.carouselProject?.title,
      template: (p.carouselProject?.metadata as any)?.template,
      theme: (p.carouselProject?.metadata as any)?.theme,
      normalizedScore: p.normalizedScore,
      engagementRate: p.engagementRate,
      impressions: p.impressions,
      reach: p.reach,
    }));

    return {
      type: 'MORE_LIKE_THIS',
      title: 'Mais carrosseis como estes',
      description: `Os ${top.length} carrosseis com melhor desempenho têm uma pontuação média de ${avgScore.toFixed(1)}. Crie conteúdos seguindo os padrões destes.top performers.`,
      confidence: roundConfidence(Math.min(avgScore / 80, 1)),
      actionable: true,
      suggestedAction: 'Criar novos carrosséis replicando o estilo, tema e template dos top performers.',
      relatedData: { topPerformers: projects, averageScore: avgScore },
    };
  }

  private buildVaryHook(
    topPerformers: any[],
    limit: number,
  ): Recommendation | null {
    if (!topPerformers.length) return null;

    // Extract hooks from metadata – hooks might live in metadata.hook or title
    const hooks: string[] = topPerformers
      .slice(0, limit)
      .map((p) => {
        const meta = (p.carouselProject?.metadata as any) ?? {};
        return meta.hook || p.carouselProject?.title || null;
      })
      .filter(Boolean);

    if (!hooks.length) return null;

    const uniqueHooks = [...new Set(hooks)];

    return {
      type: 'VARY_HOOK',
      title: 'Gerar variações do melhor hook',
      description:
        `Identificámos ${uniqueHooks.length} hook(s) de alto desempenho. Gere variações destes hooks para testar novos ângulos sem perder o que funciona.`,
      confidence: roundConfidence(0.7),
      actionable: true,
      suggestedAction: 'Gerar 3-5 variações de cada hook top performer e testar em novos carrosséis.',
      relatedData: { hooks: uniqueHooks },
    };
  }

  private buildBestTemplates(
    templateAgg: any[],
    limit: number,
  ): Recommendation | null {
    if (!templateAgg || !templateAgg.length) return null;

    const templates = templateAgg
      .slice(0, limit)
      .map((t) => ({
        template: t.template,
        avgEngagementRate: Number(t.avgEngagementRate ?? 0),
        avgNormalizedScore: Number(t.avgNormalizedScore ?? 0),
        totalImpressions: Number(t.totalImpressions ?? 0),
        totalReach: Number(t.totalReach ?? 0),
        recordCount: t.recordCount ?? 0,
      }));

    const best = templates[0];
    const avgScore = templates.length
      ? templates.reduce((s, t) => s + t.avgNormalizedScore, 0) / templates.length
      : 0;

    const confidence =
      templates.length > 1
        ? (best.avgNormalizedScore - avgScore) / Math.max(avgScore, 1)
        : 0.4;

    return {
      type: 'BEST_TEMPLATES',
      title: 'Templates que mais funcionam para esta marca',
      description:
        templates.length === 1
          ? `O template "${best.template}" é o único utilizado e tem pontuação média de ${best.avgNormalizedScore.toFixed(1)}.`
          : `O template "${best.template}" é o mais eficaz (pontuação ${best.avgNormalizedScore.toFixed(1)}), à frente da média de ${avgScore.toFixed(1)}.`,
      confidence: roundConfidence(Math.max(0.4, Math.min(confidence + 0.6, 1))),
      actionable: true,
      suggestedAction: `Priorizar o template "${best.template}" nos próximos carrosséis e experimentar variações dele.`,
      relatedData: { templates, bestTemplate: best.template },
    };
  }

  private buildSaturatedThemes(
    themeAgg: any[],
    totalCount: number,
  ): Recommendation | null {
    if (!themeAgg || themeAgg.length === 0) return null;

    // A theme is "saturated" if it represents >30% of total posts
    const themes = themeAgg.map((t) => ({
      theme: t.theme,
      recordCount: t.recordCount ?? 0,
      percentage: totalCount > 0 ? ((t.recordCount ?? 0) / totalCount) * 100 : 0,
      avgNormalizedScore: Number(t.avgNormalizedScore ?? 0),
    }));

    const saturated = themes.filter((t) => t.percentage > 30);
    const underused = themes
      .filter((t) => t.percentage < 10 && t.recordCount >= 1)
      .sort((a, b) => b.avgNormalizedScore - a.avgNormalizedScore);

    if (saturated.length === 0 && underused.length === 0) return null;

    const parts: string[] = [];
    if (saturated.length) {
      parts.push(
        `Temas saturados: ${saturated.map((t) => `"${t.theme}" (${t.percentage.toFixed(0)}%)`).join(', ')}. Diversifique o conteúdo.`,
      );
    }
    if (underused.length) {
      parts.push(
        `Temas com potencial subutilizado: ${underused.slice(0, 3).map((t) => `"${t.theme}" (pontuação ${t.avgNormalizedScore.toFixed(1)})`).join(', ')}.`,
      );
    }

    const confidence = saturated.length
      ? Math.max(...saturated.map((t) => t.percentage / 100))
      : 0.5;

    return {
      type: 'SATURATED_THEMES',
      title: 'Temas saturados/repetidos',
      description: parts.join(' '),
      confidence: roundConfidence(confidence),
      actionable: true,
      suggestedAction: saturated.length
        ? `Reduzir a frequência do tema "${saturated[0].theme}" e explorar novos temas.`
        : `Explorar mais o tema "${underused[0]?.theme}" que tem boa performance mas pouco uso.`,
      relatedData: { themes, saturated: saturated.map((t) => t.theme), underused: underused.map((t) => t.theme) },
    };
  }

  private buildBestChannels(
    platformAgg: any[],
    filterPlatform?: string,
  ): Recommendation | null {
    if (!platformAgg || platformAgg.length === 0) return null;

    const channels = platformAgg.map((p) => ({
      platform: p.platform,
      avgEngagementRate: Number(p.avgEngagementRate ?? 0),
      avgNormalizedScore: Number(p.avgNormalizedScore ?? 0),
      totalImpressions: Number(p._sum?.impressions ?? 0),
      totalReach: Number(p._sum?.reach ?? 0),
      totalSaves: Number(p._sum?.saves ?? 0),
      totalShares: Number(p._sum?.shares ?? 0),
      recordCount: p._count ?? 0,
    }));

    channels.sort((a, b) => b.avgNormalizedScore - a.avgNormalizedScore);

    const best = channels[0];
    const worst = channels[channels.length - 1];

    let description: string;
    let suggestedAction: string;

    if (channels.length === 1) {
      description = `A marca publica apenas no ${best.platform} (pontuação média: ${best.avgNormalizedScore.toFixed(1)}). Considere expandir para outros canais.`;
      suggestedAction = 'Avaliar a expansão para outro canal/social media.';
    } else if (best.platform === filterPlatform) {
      description = `O ${best.platform} é o canal com melhor desempenho para esta marca (pontuação: ${best.avgNormalizedScore.toFixed(1)}).`;
      suggestedAction = `Focar recursos no ${best.platform} para maximizar resultados.`;
    } else {
      description =
        `O canal mais eficaz é o ${best.platform} (pontuação ${best.avgNormalizedScore.toFixed(1)}) e o menos eficaz é o ${worst.platform} (pontuação ${worst.avgNormalizedScore.toFixed(1)}).`;
      suggestedAction =
        best.avgNormalizedScore > worst.avgNormalizedScore * 1.5
          ? `Redirecionar mais conteúdo para o ${best.platform}.`
          : `Manter presença em ambos os canais; os resultados são comparáveis.`;
    }

    const spread = channels.length > 1
      ? best.avgNormalizedScore - worst.avgNormalizedScore
      : 0;

    return {
      type: 'BEST_CHANNELS',
      title: 'Melhores canais para esta marca',
      description,
      confidence: roundConfidence(Math.min(0.6 + spread / 50, 1)),
      actionable: true,
      suggestedAction,
      relatedData: { channels },
    };
  }
}
