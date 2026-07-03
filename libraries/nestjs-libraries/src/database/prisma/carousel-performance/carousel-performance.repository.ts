import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class CarouselPerformanceRepository {
  constructor(private prisma: PrismaService) {}

  async findByOrganization(
    orgId: string,
    filters?: {
      brandProfileId?: string;
      platform?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    return this.prisma.carouselPerformance.findMany({
      where: {
        organizationId: orgId,
        ...(filters?.brandProfileId ? { brandProfileId: filters.brandProfileId } : {}),
        ...(filters?.platform ? { platform: filters.platform } : {}),
        ...(filters?.startDate || filters?.endDate
          ? {
              collectedAt: {
                ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
              },
            }
          : {}),
      },
      orderBy: { collectedAt: 'desc' },
    });
  }

  async findByBrand(brandProfileId: string) {
    return this.prisma.carouselPerformance.findMany({
      where: { brandProfileId },
      orderBy: { collectedAt: 'desc' },
    });
  }

  async findByCarouselProject(carouselProjectId: string) {
    return this.prisma.carouselPerformance.findMany({
      where: { carouselProjectId },
      orderBy: { collectedAt: 'desc' },
    });
  }

  async create(data: {
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
    engagementRate?: number;
    reachRate?: number;
    normalizedScore?: number;
    rawMetrics?: any;
    periodStart?: Date;
    periodEnd?: Date;
  }) {
    return this.prisma.carouselPerformance.create({ data });
  }

  async upsertByProjectAndPlatform(
    carouselProjectId: string,
    platform: string,
    data: {
      postId?: string;
      organizationId: string;
      brandProfileId: string;
      impressions?: number;
      reach?: number;
      saves?: number;
      shares?: number;
      comments?: number;
      clicks?: number;
      likes?: number;
      engagementRate?: number;
      reachRate?: number;
      normalizedScore?: number;
      rawMetrics?: any;
      periodStart?: Date;
      periodEnd?: Date;
    }
  ) {
    return this.prisma.carouselPerformance.upsert({
      where: {
        // Use a unique find to avoid composite unique issues;
        // fall back to first match for upsert semantics
        id: (
          await this.prisma.carouselPerformance.findFirst({
            where: { carouselProjectId, platform },
          })
        )?.id ?? '',
      },
      create: {
        carouselProjectId,
        platform,
        ...data,
      },
      update: {
        impressions: data.impressions,
        reach: data.reach,
        saves: data.saves,
        shares: data.shares,
        comments: data.comments,
        clicks: data.clicks,
        likes: data.likes,
        engagementRate: data.engagementRate,
        reachRate: data.reachRate,
        normalizedScore: data.normalizedScore,
        rawMetrics: data.rawMetrics,
        postId: data.postId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      },
    });
  }

  async getAggregatedByBrand(brandProfileId: string) {
    const results = await this.prisma.carouselPerformance.groupBy({
      by: ['brandProfileId'],
      where: { brandProfileId },
      _avg: {
        engagementRate: true,
        reachRate: true,
        normalizedScore: true,
      },
      _sum: {
        impressions: true,
        reach: true,
        saves: true,
        shares: true,
        comments: true,
        clicks: true,
        likes: true,
      },
      _count: true,
    });
    return results[0] ?? null;
  }

  async getAggregatedByTemplate(organizationId: string) {
    // Group by carouselProject.metadata.template via a raw query
    return this.prisma.$queryRaw`
      SELECT
        cp.metadata->>'template' as template,
        AVG(cp_perf."engagementRate") as "avgEngagementRate",
        AVG(cp_perf."normalizedScore") as "avgNormalizedScore",
        SUM(cp_perf."impressions") as "totalImpressions",
        SUM(cp_perf."reach") as "totalReach",
        SUM(cp_perf."saves") as "totalSaves",
        SUM(cp_perf."shares") as "totalShares",
        SUM(cp_perf."comments") as "totalComments",
        SUM(cp_perf."clicks") as "totalClicks",
        SUM(cp_perf."likes") as "totalLikes",
        COUNT(*)::int as "recordCount"
      FROM "CarouselPerformance" cp_perf
      JOIN "CarouselProject" cp ON cp.id = cp_perf."carouselProjectId"
      WHERE cp_perf."organizationId" = ${organizationId}
      GROUP BY cp.metadata->>'template'
      ORDER BY "avgNormalizedScore" DESC
    `;
  }

  async getAggregatedByPlatform(organizationId: string) {
    return this.prisma.carouselPerformance.groupBy({
      by: ['platform'],
      where: { organizationId },
      _avg: {
        engagementRate: true,
        reachRate: true,
        normalizedScore: true,
      },
      _sum: {
        impressions: true,
        reach: true,
        saves: true,
        shares: true,
        comments: true,
        clicks: true,
        likes: true,
      },
      _count: true,
    });
  }

  async getTopPerformers(organizationId: string, limit: number) {
    return this.prisma.carouselPerformance.findMany({
      where: { organizationId },
      orderBy: { normalizedScore: 'desc' },
      take: limit,
      include: {
        carouselProject: {
          select: {
            id: true,
            title: true,
            metadata: true,
          },
        },
      },
    });
  }

  async getPerformanceTrend(brandProfileId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.$queryRaw`
      SELECT
        DATE(cp_perf."collectedAt") as date,
        AVG(cp_perf."engagementRate") as "avgEngagementRate",
        AVG(cp_perf."normalizedScore") as "avgNormalizedScore",
        SUM(cp_perf."impressions") as "totalImpressions",
        SUM(cp_perf."reach") as "totalReach",
        COUNT(*)::int as "recordCount"
      FROM "CarouselPerformance" cp_perf
      WHERE cp_perf."brandProfileId" = ${brandProfileId}
        AND cp_perf."collectedAt" >= ${startDate}
      GROUP BY DATE(cp_perf."collectedAt")
      ORDER BY date ASC
    `;
  }

  async getTopPerformersByBrand(brandProfileId: string, limit: number) {
    return this.prisma.carouselPerformance.findMany({
      where: { brandProfileId },
      orderBy: { normalizedScore: 'desc' },
      take: limit,
      include: {
        carouselProject: {
          select: {
            id: true,
            title: true,
            metadata: true,
          },
        },
      },
    });
  }

  async getAggregatedByTheme(organizationId: string) {
    return this.prisma.$queryRaw`
      SELECT
        cp.metadata->>'theme' as theme,
        AVG(cp_perf."engagementRate") as "avgEngagementRate",
        AVG(cp_perf."normalizedScore") as "avgNormalizedScore",
        SUM(cp_perf."impressions") as "totalImpressions",
        SUM(cp_perf."reach") as "totalReach",
        COUNT(*)::int as "recordCount"
      FROM "CarouselPerformance" cp_perf
      JOIN "CarouselProject" cp ON cp.id = cp_perf."carouselProjectId"
      WHERE cp_perf."organizationId" = ${organizationId}
        AND cp.metadata->>'theme' IS NOT NULL
        AND cp.metadata->>'theme' != ''
      GROUP BY cp.metadata->>'theme'
      ORDER BY "recordCount" DESC
    `;
  }

  async getAggregatedByThemeForBrand(brandProfileId: string) {
    return this.prisma.$queryRaw`
      SELECT
        cp.metadata->>'theme' as theme,
        AVG(cp_perf."engagementRate") as "avgEngagementRate",
        AVG(cp_perf."normalizedScore") as "avgNormalizedScore",
        SUM(cp_perf."impressions") as "totalImpressions",
        SUM(cp_perf."reach") as "totalReach",
        COUNT(*)::int as "recordCount"
      FROM "CarouselPerformance" cp_perf
      JOIN "CarouselProject" cp ON cp.id = cp_perf."carouselProjectId"
      WHERE cp_perf."brandProfileId" = ${brandProfileId}
        AND cp.metadata->>'theme' IS NOT NULL
        AND cp.metadata->>'theme' != ''
      GROUP BY cp.metadata->>'theme'
      ORDER BY "recordCount" DESC
    `;
  }

  async getAggregatedByTemplateForBrand(brandProfileId: string) {
    return this.prisma.$queryRaw`
      SELECT
        cp.metadata->>'template' as template,
        AVG(cp_perf."engagementRate") as "avgEngagementRate",
        AVG(cp_perf."normalizedScore") as "avgNormalizedScore",
        SUM(cp_perf."impressions") as "totalImpressions",
        SUM(cp_perf."reach") as "totalReach",
        COUNT(*)::int as "recordCount"
      FROM "CarouselPerformance" cp_perf
      JOIN "CarouselProject" cp ON cp.id = cp_perf."carouselProjectId"
      WHERE cp_perf."brandProfileId" = ${brandProfileId}
        AND cp.metadata->>'template' IS NOT NULL
        AND cp.metadata->>'template' != ''
      GROUP BY cp.metadata->>'template'
      ORDER BY "avgNormalizedScore" DESC
    `;
  }

  async getAggregatedByPlatformForBrand(brandProfileId: string) {
    return this.prisma.carouselPerformance.groupBy({
      by: ['platform'],
      where: { brandProfileId },
      _avg: {
        engagementRate: true,
        normalizedScore: true,
      },
      _sum: {
        impressions: true,
        reach: true,
        saves: true,
        shares: true,
        comments: true,
        clicks: true,
        likes: true,
      },
      _count: true,
    });
  }

  async getTopPerformersWithProjectByOrganization(organizationId: string, limit: number) {
    return this.prisma.carouselPerformance.findMany({
      where: { organizationId },
      orderBy: { normalizedScore: 'desc' },
      take: limit,
      include: {
        carouselProject: {
          select: {
            id: true,
            title: true,
            metadata: true,
          },
        },
      },
    });
  }

  async getCountByBrand(brandProfileId: string): Promise<number> {
    return this.prisma.carouselPerformance.count({
      where: { brandProfileId },
    });
  }
}
