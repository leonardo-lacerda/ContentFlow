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
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async createProject(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateShortVideoProjectDto
  ) {
    return this.shortVideoService.createProject(org.id, body);
  }

  @Post('/generate')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async generate(
    @GetOrgFromRequest() org: Organization,
    @Body() body: {
      brandProfileId: string;
      carouselProjectId: string;
      format: string;
      maxDuration?: number;
      additionalContext?: string;
    }
  ) {
    // Legacy endpoint — creates a project and generates script in one step
    const project = await this.shortVideoService.createProject(org.id, {
      brandProfileId: body.brandProfileId,
      carouselProjectId: body.carouselProjectId,
      name: `Video from carousel`,
      format: body.format,
      maxDurationSec: body.maxDuration,
    });

    return this.shortVideoService.generateScript(project.id, org.id, {
      targetDurationSec: body.maxDuration,
      style: body.additionalContext,
    });
  }

  @Post('/:id/generate-script')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
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
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async estimateRenderCost(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { provider: string; voiceId?: string }
  ) {
    return this.shortVideoService.estimateRenderCost(id, org.id, body.provider, body.voiceId);
  }

  @Post('/:id/render')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
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
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateStatus(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    return this.shortVideoService.updateStatus(id, org.id, body.status);
  }

  @Delete('/:id')
  @CheckPolicies([AuthorizationActions.Delete, Sections.ADMIN])
  async deleteProject(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this.shortVideoService.deleteProject(id, org.id);
  }
}
