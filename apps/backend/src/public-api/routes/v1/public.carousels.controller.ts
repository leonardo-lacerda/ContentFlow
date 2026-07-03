import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { ContentIdeaService } from '@gitroom/nestjs-libraries/database/prisma/content-ideas/content-idea.service';
import { CarouselProjectService } from '@gitroom/nestjs-libraries/database/prisma/carousel-projects/carousel-project.service';
import { GenerationJobService } from '@gitroom/nestjs-libraries/database/prisma/generation-jobs/generation-job.service';
import { AiGenerateService } from '@gitroom/nestjs-libraries/ai-generate/ai-generate.service';
import * as Sentry from '@sentry/nestjs';

@ApiTags('Public API - Carousels')
@Controller('/public/v1')
export class PublicCarouselsController {
  constructor(
    private _brandProfileService: BrandProfileService,
    private _contentIdeaService: ContentIdeaService,
    private _carouselProjectService: CarouselProjectService,
    private _generationJobService: GenerationJobService,
    private _aiGenerateService: AiGenerateService,
  ) {}

  // ===== BRANDS =====

  @Get('/brands')
  async listBrands(@GetOrgFromRequest() org: Organization) {
    Sentry.metrics.count('public_api-request', 1);
    const brands = await this._brandProfileService.getBrands(org.id);
    return { brands };
  }

  @Post('/brands')
  async createBrand(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { name: string; website?: string; industry?: string },
  ) {
    Sentry.metrics.count('public_api-request', 1);
    if (!body.name) {
      throw new HttpException({ msg: 'Name is required' }, 400);
    }
    return this._brandProfileService.createBrand(org.id, body);
  }

  @Get('/brands/:id')
  async getBrand(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const brand = await this._brandProfileService.getBrand(id);
    if (!brand || brand.organizationId !== org.id) {
      throw new HttpException({ msg: 'Brand not found' }, 404);
    }
    return brand;
  }

  // ===== BRAND DNA =====

  @Post('/brands/:id/analyze')
  async analyzeBrand(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body?: { url?: string },
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const brand = await this._brandProfileService.getBrand(id);
    if (!brand || brand.organizationId !== org.id) {
      throw new HttpException({ msg: 'Brand not found' }, 404);
    }
    return this._brandProfileService.analyzeBrand(id, body?.url || brand.website);
  }

  @Get('/brands/:id/dna')
  async getBrandDna(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const brand = await this._brandProfileService.getBrand(id);
    if (!brand || brand.organizationId !== org.id) {
      throw new HttpException({ msg: 'Brand not found' }, 404);
    }
    const dna = await this._brandProfileService.getLatestDnaSnapshot(id);
    return { brand: { id: brand.id, name: brand.name }, dna };
  }

  // ===== CONTENT IDEAS =====

  @Get('/content-ideas')
  async listIdeas(
    @GetOrgFromRequest() org: Organization,
    @Query('brandProfileId') brandProfileId?: string,
    @Query('status') status?: string,
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const ideas = await this._contentIdeaService.getIdeas(org.id, {
      brandProfileId,
      status: status as any,
    });
    return { ideas };
  }

  @Post('/content-ideas/generate')
  async generateIdeas(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { brandProfileId: string; topic?: string; count?: number },
  ) {
    Sentry.metrics.count('public_api-request', 1);
    if (!body.brandProfileId) {
      throw new HttpException({ msg: 'brandProfileId is required' }, 400);
    }
    const brand = await this._brandProfileService.getBrand(body.brandProfileId);
    if (!brand || brand.organizationId !== org.id) {
      throw new HttpException({ msg: 'Brand not found' }, 404);
    }
    return this._aiGenerateService.generateCarouselIdeas(org.id, {
      brandProfileId: body.brandProfileId,
      topic: body.topic,
    });
  }

  // ===== CAROUSEL PROJECTS =====

  @Get('/carousel-projects')
  async listProjects(
    @GetOrgFromRequest() org: Organization,
    @Query('brandProfileId') brandProfileId?: string,
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const projects = await this._carouselProjectService.getProjects(org.id, {
      brandProfileId,
    });
    return { projects };
  }

  @Get('/carousel-projects/:id')
  async getProject(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const project = await this._carouselProjectService.getProject(id);
    if (!project || project.organizationId !== org.id) {
      throw new HttpException({ msg: 'Project not found' }, 404);
    }
    return project;
  }

  @Post('/carousel-projects/generate')
  async generateCarousel(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      brandProfileId: string;
      topic: string;
      slideCount?: number;
      platform?: string;
      goal?: string;
      templateId?: string;
    },
  ) {
    Sentry.metrics.count('public_api-request', 1);
    if (!body.brandProfileId || !body.topic) {
      throw new HttpException(
        { msg: 'brandProfileId and topic are required' },
        400,
      );
    }
    const brand = await this._brandProfileService.getBrand(body.brandProfileId);
    if (!brand || brand.organizationId !== org.id) {
      throw new HttpException({ msg: 'Brand not found' }, 404);
    }
    return this._aiGenerateService.generateCarouselPlan(org.id, {
      brandProfileId: body.brandProfileId,
      topic: body.topic,
      slideCount: body.slideCount,
      platform: body.platform,
      goal: body.goal,
      templateId: body.templateId,
    });
  }

  // ===== GENERATION JOBS =====

  @Get('/generation-jobs')
  async listJobs(
    @GetOrgFromRequest() org: Organization,
    @Query('status') status?: string,
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const jobs = await this._generationJobService.getJobs(org.id, {
      status: status as any,
    });
    return { jobs };
  }

  @Get('/generation-jobs/:id')
  async getJob(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    Sentry.metrics.count('public_api-request', 1);
    const job = await this._generationJobService.getJob(id);
    if (!job || job.organizationId !== org.id) {
      throw new HttpException({ msg: 'Job not found' }, 404);
    }
    return job;
  }

  // ===== WEBHOOKS =====

  @Post('/webhooks')
  async registerWebhook(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { url: string; events: string[] },
  ) {
    Sentry.metrics.count('public_api-request', 1);
    if (!body.url || !body.events?.length) {
      throw new HttpException(
        { msg: 'url and events are required' },
        400,
      );
    }
    // Store webhook configuration
    return {
      id: `wh_${Date.now()}`,
      url: body.url,
      events: body.events,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
  }
}
