import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { ContentIdeaService } from '@gitroom/nestjs-libraries/database/prisma/content-ideas/content-idea.service';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { CreateContentIdeaDto } from '@gitroom/nestjs-libraries/dtos/content-ideas/create-content-idea.dto';

@ApiTags('Content Ideas')
@Controller('/content-ideas')
export class ContentIdeaController {
  constructor(
    private contentIdeaService: ContentIdeaService,
    private brandProfileService: BrandProfileService
  ) {}

  @Get('/')
  async getIdeas(@GetOrgFromRequest() org: Organization) {
    return this.contentIdeaService.getIdeas(org.id);
  }

  @Get('/brand/:brandId')
  async getIdeasByBrand(
    @Param('brandId') brandId: string,
    @Body() body?: { status?: string }
  ) {
    return this.contentIdeaService.getIdeasByBrand(brandId, body?.status as any);
  }

  @Get('/:id')
  async getIdea(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.contentIdeaService.getIdea(id, org.id);
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createIdea(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateContentIdeaDto
  ) {
    await this.brandProfileService.validateBrandOwnership(org.id, body.brandProfileId);
    return this.contentIdeaService.createIdea({
      organizationId: org.id,
      ...body,
    });
  }

  @Patch('/:id/approve')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async approveIdea(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.contentIdeaService.approveIdea(id, org.id);
  }

  @Patch('/:id/reject')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async rejectIdea(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body?: { reason?: string }
  ) {
    return this.contentIdeaService.rejectIdea(id, org.id, body?.reason);
  }

  @Patch('/:id/save')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async saveIdea(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.contentIdeaService.saveIdea(id, org.id);
  }

  @Patch('/:id/archive')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async archiveIdea(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.contentIdeaService.archiveIdea(id, org.id);
  }
}
