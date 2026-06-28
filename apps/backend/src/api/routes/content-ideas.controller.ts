import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { ContentIdeaService } from '@gitroom/nestjs-libraries/database/prisma/content-ideas/content-idea.service';

@ApiTags('Content Ideas')
@Controller('/content-ideas')
export class ContentIdeaController {
  constructor(private contentIdeaService: ContentIdeaService) {}

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
  async getIdea(@Param('id') id: string) {
    return this.contentIdeaService.getIdea(id);
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createIdea(
    @GetOrgFromRequest() org: Organization,
    @Body() body: {
      brandProfileId: string;
      title: string;
      hook: string;
      goal: string;
      angle: string;
      templateSuggestion?: string;
      platformSuggestion?: string;
      score?: number;
    }
  ) {
    return this.contentIdeaService.createIdea({
      organizationId: org.id,
      ...body,
    });
  }

  @Patch('/:id/approve')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async approveIdea(@Param('id') id: string) {
    return this.contentIdeaService.approveIdea(id);
  }

  @Patch('/:id/reject')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async rejectIdea(
    @Param('id') id: string,
    @Body() body?: { reason?: string }
  ) {
    return this.contentIdeaService.rejectIdea(id, body?.reason);
  }

  @Patch('/:id/save')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async saveIdea(@Param('id') id: string) {
    return this.contentIdeaService.saveIdea(id);
  }

  @Patch('/:id/archive')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async archiveIdea(@Param('id') id: string) {
    return this.contentIdeaService.archiveIdea(id);
  }
}
