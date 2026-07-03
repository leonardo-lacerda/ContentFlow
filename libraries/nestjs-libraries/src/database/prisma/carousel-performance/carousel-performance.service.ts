import { Injectable } from '@nestjs/common';
import { CarouselPerformanceRepository } from './carousel-performance.repository';

/**
 * Platform-specific engagement weights.
 * Different social networks have different engagement norms —
 * a 3% engagement rate on LinkedIn is stellar, but mediocre on Instagram.
 * These weights are used to normalize scores to a 0–100 scale that's
 * comparable across platforms.
 */
const PLATFORM_WEIGHTS: Record<
  string,
  {
    /** Divisor applied to the raw engagement contribution */
    engagementDivisor: number;
    /** Multiplier for saves (they mean more on some platforms) */
    saveWeight: number;
    /** Multiplier for shares / reposts */
    shareWeight: number;
    /** Multiplier for comments */
    commentWeight: number;
    /** Multiplier for clicks (link clicks, profile taps, etc.) */
    clickWeight: number;
    /** Multiplier for likes / reactions */
    likeWeight: number;
  }
> = {
  instagram: {
    engagementDivisor: 6,
    saveWeight: 3.5,
    shareWeight: 3,
    commentWeight: 2.5,
    clickWeight: 1.5,
    likeWeight: 1,
  },
  facebook: {
    engagementDivisor: 4,
    saveWeight: 2,
    shareWeight: 3.5,
    commentWeight: 2.5,
    clickWeight: 2,
    likeWeight: 1,
  },
  linkedin: {
    engagementDivisor: 5,
    saveWeight: 2,
    shareWeight: 4,
    commentWeight: 3,
    clickWeight: 2,
    likeWeight: 1,
  },
  'linkedin-page': {
    engagementDivisor: 5,
    saveWeight: 2,
    shareWeight: 4,
    commentWeight: 3,
    clickWeight: 2,
    likeWeight: 1,
  },
  tiktok: {
    engagementDivisor: 8,
    saveWeight: 3,
    shareWeight: 3.5,
    commentWeight: 2.5,
    clickWeight: 1,
    likeWeight: 1,
  },
  x: {
    engagementDivisor: 4,
    saveWeight: 2,
    shareWeight: 4,
    commentWeight: 3,
    clickWeight: 2,
    likeWeight: 1,
  },
  twitter: {
    engagementDivisor: 4,
    saveWeight: 2,
    shareWeight: 4,
    commentWeight: 3,
    clickWeight: 2,
    likeWeight: 1,
  },
  youtube: {
    engagementDivisor: 5,
    saveWeight: 2,
    shareWeight: 2,
    commentWeight: 3,
    clickWeight: 4,
    likeWeight: 1,
  },
  pinterest: {
    engagementDivisor: 4,
    saveWeight: 4,
    shareWeight: 2,
    commentWeight: 2,
    clickWeight: 3,
    likeWeight: 1,
  },
  threads: {
    engagementDivisor: 5,
    saveWeight: 3,
    shareWeight: 3,
    commentWeight: 3,
    clickWeight: 1,
    likeWeight: 1,
  },
};

/** Default weights for unknown platforms */
const DEFAULT_WEIGHTS = {
  engagementDivisor: 5,
  saveWeight: 3,
  shareWeight: 3,
  commentWeight: 2,
  clickWeight: 2,
  likeWeight: 1,
};

@Injectable()
export class CarouselPerformanceService {
  constructor(
    private carouselPerformanceRepository: CarouselPerformanceRepository
  ) {}

  async getPerformance(
    organizationId: string,
    filters?: {
      brandProfileId?: string;
      platform?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    return this.carouselPerformanceRepository.findByOrganization(
      organizationId,
      filters
    );
  }

  async getBrandPerformance(brandProfileId: string) {
    return this.carouselPerformanceRepository.findByBrand(brandProfileId);
  }

  async getProjectPerformance(carouselProjectId: string) {
    return this.carouselPerformanceRepository.findByCarouselProject(
      carouselProjectId
    );
  }

  async recordMetrics(data: {
    carouselProjectId: string;
    postId?: string;
    organizationId: string;
    brandProfileId: string;
    platform: string;
    impressions?: number;
    reach?: number;
    saves?: number;
    shares?: number;
    comments?: number;
    clicks?: number;
    likes?: number;
    rawMetrics?: any;
    periodStart?: string;
    periodEnd?: string;
  }) {
    const impressions = data.impressions ?? 0;
    const reach = data.reach ?? 0;
    const saves = data.saves ?? 0;
    const shares = data.shares ?? 0;
    const comments = data.comments ?? 0;
    const clicks = data.clicks ?? 0;
    const likes = data.likes ?? 0;

    const engagementRate =
      reach > 0
        ? ((saves + shares + comments + clicks + likes) / reach) * 100
        : 0;
    const reachRate = impressions > 0 ? (reach / impressions) * 100 : 0;
    const normalizedScore = this.calculateNormalizedScore({
      impressions,
      reach,
      saves,
      shares,
      comments,
      clicks,
      likes,
      platform: data.platform,
    });

    return this.carouselPerformanceRepository.create({
      carouselProjectId: data.carouselProjectId,
      postId: data.postId,
      organizationId: data.organizationId,
      brandProfileId: data.brandProfileId,
      platform: data.platform,
      impressions,
      reach,
      saves,
      shares,
      comments,
      clicks,
      likes,
      engagementRate,
      reachRate,
      normalizedScore,
      rawMetrics: data.rawMetrics,
      periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
    });
  }

  async getTopPerformers(organizationId: string, limit: number) {
    return this.carouselPerformanceRepository.getTopPerformers(
      organizationId,
      limit
    );
  }

  async getPerformanceTrend(brandProfileId: string, days: number) {
    return this.carouselPerformanceRepository.getPerformanceTrend(
      brandProfileId,
      days
    );
  }

  async getDashboard(organizationId: string, brandProfileId?: string) {
    const aggregatedByPlatform =
      await this.carouselPerformanceRepository.getAggregatedByPlatform(
        organizationId
      );

    const aggregatedByTemplate =
      await this.carouselPerformanceRepository.getAggregatedByTemplate(
        organizationId
      );

    const aggregatedByTheme =
      await this.carouselPerformanceRepository.getAggregatedByTheme(
        organizationId
      );

    const topPerformers =
      await this.carouselPerformanceRepository.getTopPerformers(
        organizationId,
        10
      );

    const allTopPerformers =
      await this.carouselPerformanceRepository.getTopPerformersWithProjectByOrganization(
        organizationId,
        10
      );

    let brandAggregated = null;
    let trend = null;
    if (brandProfileId) {
      brandAggregated =
        await this.carouselPerformanceRepository.getAggregatedByBrand(
          brandProfileId
        );
      trend =
        await this.carouselPerformanceRepository.getPerformanceTrend(
          brandProfileId,
          30
        );
    }

    return {
      byPlatform: aggregatedByPlatform,
      byTemplate: aggregatedByTemplate,
      byTheme: aggregatedByTheme,
      topPerformers: allTopPerformers,
      brandAggregated,
      trend,
    };
  }

  /**
   * Calculate a normalized score (0–100) that is comparable across platforms.
   *
   * The formula accounts for:
   * 1. **Platform-specific engagement weights** — each platform has different
   *    norms for what constitutes meaningful engagement (e.g. saves are
   *    extremely valuable on Instagram/Pinterest, shares on LinkedIn/X).
   * 2. **Engagement rate contribution** — the weighted sum of interactions
   *    divided by reach, scaled by the platform's divisor.
   * 3. **Reach efficiency bonus** — carousels that achieve high reach
   *    relative to impressions get a small bonus (up to 10 points).
   * 4. **Volume bonus** — carousels with high absolute impressions get a
   *    small logarithmic bonus (up to 10 points) to reward consistent
   *    high-volume performers.
   */
  calculateNormalizedScore(data: {
    impressions: number;
    reach: number;
    saves: number;
    shares: number;
    comments: number;
    clicks: number;
    likes: number;
    platform: string;
  }): number {
    const { impressions, reach, saves, shares, comments, clicks, likes } =
      data;
    const platformKey = data.platform.toLowerCase();
    const w = PLATFORM_WEIGHTS[platformKey] ?? DEFAULT_WEIGHTS;

    // Guard against zero reach
    const denominator = Math.max(reach, 1);

    // 1. Weighted engagement score (0–70 range)
    const weightedInteractions =
      saves * w.saveWeight +
      shares * w.shareWeight +
      comments * w.commentWeight +
      clicks * w.clickWeight +
      likes * w.likeWeight;

    const engagementScore = Math.min(
      (weightedInteractions / denominator / w.engagementDivisor) * 100,
      70
    );

    // 2. Reach efficiency (0–15 range): how well the carousel converts
    //    impressions into reach. Useful for platforms that throttle reach.
    const reachEfficiency =
      impressions > 0 ? Math.min((reach / impressions) * 15, 15) : 0;

    // 3. Volume bonus (0–15 range): logarithmic scale to reward
    //    high-impression carousels without dominating the score.
    const volumeBonus =
      impressions > 0
        ? Math.min(Math.log10(Math.max(impressions, 1)) * 3, 15)
        : 0;

    const totalScore = engagementScore + reachEfficiency + volumeBonus;
    return Math.round(Math.min(Math.max(totalScore, 0), 100) * 10) / 10;
  }

  /**
   * Get the platform weights for a given platform (exposed for testing / UI display).
   */
  getPlatformWeights(platform: string) {
    return PLATFORM_WEIGHTS[platform.toLowerCase()] ?? DEFAULT_WEIGHTS;
  }
}
