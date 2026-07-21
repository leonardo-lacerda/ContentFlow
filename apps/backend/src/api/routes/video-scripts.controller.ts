import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { ShortVideoService } from '@gitroom/nestjs-libraries/database/prisma/short-video/short-video.service';
import { CreateShortVideoProjectDto } from '@gitroom/nestjs-libraries/dtos/short-video/create-short-video-project.dto';
import { GenerateVideoScriptDto } from '@gitroom/nestjs-libraries/dtos/short-video/generate-video-script.dto';
import { RenderVideoDto } from '@gitroom/nestjs-libraries/dtos/short-video/render-video.dto';

@ApiTags('Video Scripts')
@Controller('/video-scripts')
export class VideoScriptsController {
  constructor(private shortVideoService: ShortVideoService) {}

  @Get('/')
  async getProjects(@GetOrgFromRequest() org: Organization) {
    return this.shortVideoService.getProjects(org.id);
  }

  @Get('/brand/:brandId')
  async getProjectsByBrand(
    @Param('brandId') brandId: string,
    @Body() body?: { status?: string }
  ) {
    return this.shortVideoService.getProjectsByBrand(brandId, body?.status as any);
  }

  @Get('/:id')
  async getProject(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.shortVideoService.getProject(id, org.id);
  }

  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async createProject(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateShortVideoProjectDto
  ) {
    return this.shortVideoService.createProject(org.id, body);
  }

  @Post('/generate')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async generate(
    @GetOrgFromRequest() org: Organization,
    @Body() body: {
      brandProfileId: string;
      carouselProjectId?: string;
      contentIdeaId?: string;
      name?: string;
      format?: string;
      maxDuration?: number;
      additionalContext?: string;
    }
  ) {
    // Creates a project and generates script (carousel and/or idea)
    const project = await this.shortVideoService.createProject(org.id, {
      brandProfileId: body.brandProfileId,
      carouselProjectId: body.carouselProjectId,
      contentIdeaId: body.contentIdeaId,
      name: body.name || body.additionalContext?.slice(0, 80) || 'Roteiro de vídeo',
      format: body.format || 'REELS',
      maxDurationSec: body.maxDuration,
    });

    return this.shortVideoService.generateScript(project.id, org.id, {
      targetDurationSec: body.maxDuration,
      style: body.additionalContext,
    });
  }

  @Post('/:id/generate-script')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async generateScript(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: GenerateVideoScriptDto
  ) {
    return this.shortVideoService.generateScript(id, org.id, {
      language: body.language,
      targetDurationSec: body.targetDurationSec,
      style: body.style,
    });
  }

  @Post('/:id/estimate-render')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async estimateRenderCost(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { provider: string; voiceId?: string }
  ) {
    return this.shortVideoService.estimateRenderCost(id, org.id, body.provider, body.voiceId);
  }

  @Post('/:id/render')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async renderVideo(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: RenderVideoDto
  ) {
    return this.shortVideoService.renderVideo(id, org.id, {
      provider: body.provider,
      voiceId: body.voiceId,
      musicStyle: body.musicStyle,
      includeSubtitles: body.includeSubtitles,
      maxCostUsd: body.maxCostUsd,
    });
  }

  @Patch('/:id/status')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async updateStatus(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    return this.shortVideoService.updateStatus(id, org.id, body.status);
  }

  @Patch('/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  async updateProject(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      format?: string;
      script?: any;
      totalDurationSec?: number;
      status?: string;
      aspectRatio?: string;
      maxDurationSec?: number;
      metadata?: any;
    }
  ) {
    return this.shortVideoService.updateProject(id, org.id, body);
  }

  @Delete('/:id')
  @CheckPolicies([AuthorizationActions.Delete, Sections.AI])
  async deleteProject(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.shortVideoService.deleteProject(id, org.id);
  }
}
