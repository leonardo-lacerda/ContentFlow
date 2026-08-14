import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { CarouselPerformanceService } from '@gitroom/nestjs-libraries/database/prisma/carousel-performance/carousel-performance.service';
import { QueryCarouselPerformanceDto } from '@gitroom/nestjs-libraries/dtos/carousel-performance/query-carousel-performance.dto';
import { RecordCarouselPerformanceDto } from '@gitroom/nestjs-libraries/dtos/carousel-performance/record-carousel-performance.dto';
import { RecommendationService } from '@gitroom/nestjs-libraries/database/prisma/carousel-performance/recommendation.service';
import { RecommendationQueryDto } from '@gitroom/nestjs-libraries/dtos/carousel-performance/recommendation.dto';

@ApiTags('Carousel Performance')
@Controller('/carousel-performance')
export class CarouselPerformanceController {
  constructor(
    private carouselPerformanceService: CarouselPerformanceService,
    private recommendationService: RecommendationService,
  ) {}

  @Get('/')
  async getPerformance(
    @GetOrgFromRequest() org: Organization,
    @Query() query: QueryCarouselPerformanceDto
  ) {
    return this.carouselPerformanceService.getPerformance(org.id, {
      brandProfileId: query.brandProfileId,
      platform: query.platform,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  @Get('/brand/:brandId')
  async getBrandPerformance(
    @GetOrgFromRequest() org: Organization,
    @Param('brandId') brandId: string
  ) {
    return this.carouselPerformanceService.getBrandPerformance(org.id, brandId);
  }

  @Get('/dashboard')
  async getDashboard(
    @GetOrgFromRequest() org: Organization,
    @Query('brandProfileId') brandProfileId?: string
  ) {
    return this.carouselPerformanceService.getDashboard(org.id, brandProfileId);
  }

  @Get('/project/:projectId')
  async getProjectPerformance(
    @GetOrgFromRequest() org: Organization,
    @Param('projectId') projectId: string
  ) {
    return this.carouselPerformanceService.getProjectPerformance(org.id, projectId);
  }

  @Get('/top-performers')
  async getTopPerformers(
    @GetOrgFromRequest() org: Organization,
    @Query('limit') limit?: string
  ) {
    const topLimit = limit ? parseInt(limit, 10) : 10;
    return this.carouselPerformanceService.getTopPerformers(org.id, topLimit);
  }

  @Get('/trend/:brandId')
  async getPerformanceTrend(
    @GetOrgFromRequest() org: Organization,
    @Param('brandId') brandId: string,
    @Query('days') days?: string
  ) {
    const trendDays = days ? parseInt(days, 10) : 30;
    return this.carouselPerformanceService.getPerformanceTrend(
      org.id,
      brandId,
      trendDays
    );
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async recordMetrics(
    @GetOrgFromRequest() org: Organization,
    @Body() body: RecordCarouselPerformanceDto
  ) {
    return this.carouselPerformanceService.recordMetrics({
      organizationId: org.id,
      ...body,
    });
  }

  /**
   * Batch record metrics for multiple carousels in a single request.
   * Useful for automated metric collection from social APIs.
   */
  @Post('/batch')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async recordMetricsBatch(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { items: RecordCarouselPerformanceDto[] }
  ) {
    const results = [];
    for (const item of body.items) {
      const result = await this.carouselPerformanceService.recordMetrics({
        organizationId: org.id,
        ...item,
      });
      results.push(result);
    }
    return { recorded: results.length, results };
  }

  /**
   * Returns the platform-specific weights used in the normalized score
   * calculation. Useful for displaying weight explanations in the UI.
   */
  @Get('/weights')
  async getPlatformWeights(@Query('platform') platform?: string) {
    if (platform) {
      return {
        platform,
        weights: this.carouselPerformanceService.getPlatformWeights(platform),
      };
    }
    // Return all platform weights
    const platforms = [
      'instagram', 'facebook', 'linkedin', 'linkedin-page',
      'tiktok', 'x', 'twitter', 'youtube', 'pinterest', 'threads',
    ];
    const result: Record<string, any> = {};
    for (const p of platforms) {
      result[p] = this.carouselPerformanceService.getPlatformWeights(p);
    }
    return result;
  }

  @Get('/recommendations/:brandId')
  async getRecommendations(
    @GetOrgFromRequest() org: Organization,
    @Param('brandId') brandId: string,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationService.getRecommendations(org.id, brandId, {
      platform: query.platform,
      limit: query.limit,
    });
  }
}
