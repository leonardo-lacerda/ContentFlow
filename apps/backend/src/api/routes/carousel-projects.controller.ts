import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { CarouselProjectService } from '@gitroom/nestjs-libraries/database/prisma/carousel-projects/carousel-project.service';
import { ContentIdeaService } from '@gitroom/nestjs-libraries/database/prisma/content-ideas/content-idea.service';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { CreateCarouselProjectDto } from '@gitroom/nestjs-libraries/dtos/content-ideas/create-carousel-project.dto';

@ApiTags('Carousel Projects')
@Controller('/carousel-projects')
export class CarouselProjectController {
  constructor(
    private carouselProjectService: CarouselProjectService,
    private contentIdeaService: ContentIdeaService,
    private brandProfileService: BrandProfileService
  ) {}

  @Get('/')
  async getProjects(@GetOrgFromRequest() org: Organization) {
    return this.carouselProjectService.getProjects(org.id);
  }

  @Get('/brand/:brandId')
  async getProjectsByBrand(
    @Param('brandId') brandId: string,
    @Body() body?: { status?: string }
  ) {
    return this.carouselProjectService.getProjectsByBrand(brandId, body?.status as any);
  }

  @Get('/:id')
  async getProject(@Param('id') id: string) {
    return this.carouselProjectService.getProject(id);
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createProject(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateCarouselProjectDto
  ) {
    await this.brandProfileService.validateBrandOwnership(org.id, body.brandProfileId);
    return this.carouselProjectService.createProject({
      organizationId: org.id,
      ...body,
    });
  }

  @Post('/from-idea/:ideaId')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createFromIdea(
    @GetOrgFromRequest() org: Organization,
    @Param('ideaId') ideaId: string
  ) {
    // 1. Fetch the idea
    const idea = await this.contentIdeaService.getIdea(ideaId);
    if (!idea || idea.organizationId !== org.id) {
      throw new Error('Idea not found');
    }

    // 2. Mark idea as used
    await this.contentIdeaService.markAsUsed(ideaId);

    // 3. Create a CarouselProject with initial draft slides
    const project = await this.carouselProjectService.createProject({
      organizationId: org.id,
      brandProfileId: idea.brandProfileId,
      contentIdeaId: ideaId,
      title: idea.title,
      slides: [
        { headline: idea.hook, body: idea.angle, cta: idea.goal },
      ],
      metadata: {
        ideaHook: idea.hook,
        ideaGoal: idea.goal,
        ideaAngle: idea.angle,
        templateSuggestion: idea.templateSuggestion,
        platformSuggestion: idea.platformSuggestion,
      },
    });

    return project;
  }

  @Patch('/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateProject(
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      slides?: any;
      caption?: string;
      hashtags?: string[];
      status?: string;
      metadata?: any;
    }
  ) {
    return this.carouselProjectService.updateProject(id, body as any);
  }

  @Patch('/:id/status')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    return this.carouselProjectService.updateStatus(id, body.status as any);
  }
}
