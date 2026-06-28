import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { CarouselProjectService } from '@gitroom/nestjs-libraries/database/prisma/carousel-projects/carousel-project.service';

@ApiTags('Carousel Projects')
@Controller('/carousel-projects')
export class CarouselProjectController {
  constructor(private carouselProjectService: CarouselProjectService) {}

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
    @Body() body: {
      brandProfileId: string;
      contentIdeaId?: string;
      title: string;
      slides: any;
      caption?: string;
      hashtags?: string[];
      metadata?: any;
    }
  ) {
    return this.carouselProjectService.createProject({
      organizationId: org.id,
      ...body,
    });
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
