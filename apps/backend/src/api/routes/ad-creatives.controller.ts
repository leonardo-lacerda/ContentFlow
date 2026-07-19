import { UseGuards, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { V1SurfaceGuard } from '@gitroom/backend/services/auth/v1-surface.guard';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { AdCreativeGenerateService } from '@gitroom/nestjs-libraries/ai-generate/ad-creative-generate.service';
import {
  GenerateAdCreativesDto,
  UpdateAdCreativeDto,
  ExportAdCreativeDto,
} from '@gitroom/nestjs-libraries/dtos/ai-generate/generate-ad-creatives.dto';
import { adTemplateRegistry } from '@gitroom/nestjs-libraries/ai-generate/ad-templates/ad-template-registry';

@ApiTags('Ad Creatives')
@UseGuards(V1SurfaceGuard)
@Controller('/ad-creatives')
export class AdCreativesController {
  constructor(private readonly adCreativeService: AdCreativeGenerateService) {}

  // ---- Ad Templates ----

  @Get('/templates')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  getAdTemplates(
    @Query('category') category?: string,
    @Query('objective') objective?: string,
    @Query('platform') platform?: string,
  ) {
    if (category) return adTemplateRegistry.getByCategory(category);
    if (objective) return adTemplateRegistry.getByObjective(objective);
    if (platform) return adTemplateRegistry.getByPlatform(platform);
    return adTemplateRegistry.getActive();
  }

  @Get('/templates/summary')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  getAdTemplatesSummary() {
    return adTemplateRegistry.getSummary();
  }

  @Get('/templates/:id')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  getAdTemplateById(@Param('id') id: string) {
    const template = adTemplateRegistry.get(id);
    if (!template) return { error: 'Template not found', id };
    return template;
  }

  // ---- Generate Ad Creatives ----

  @Post('/generate')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async generateAds(
    @GetOrgFromRequest() org: Organization,
    @Body() body: GenerateAdCreativesDto,
  ) {
    return this.adCreativeService.generateAdCreatives(org.id, body);
  }

  // ---- Save Generated Ads ----

  @Post('/save')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async saveAds(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      ads: any;
      brandProfileId: string;
      contentIdeaId?: string;
      carouselProjectId?: string;
      generationJobId?: string;
    },
  ) {
    return this.adCreativeService.saveAdCreatives(
      org.id,
      body.ads,
      {
        brandProfileId: body.brandProfileId,
        contentIdeaId: body.contentIdeaId,
        carouselProjectId: body.carouselProjectId,
      },
      body.generationJobId,
    );
  }

  // ---- CRUD ----

  @Get('/')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async listAds(
    @GetOrgFromRequest() org: Organization,
    @Query('platform') platform?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('brandProfileId') brandProfileId?: string,
  ) {
    return this.adCreativeService.getAdCreatives(org.id, {
      platform,
      type,
      status,
      brandProfileId,
    });
  }

  @Get('/:id')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async getAd(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    return this.adCreativeService.getAdCreativeById(org.id, id);
  }

  @Patch('/:id')
  @CheckPolicies([AuthorizationActions.Update, Sections.ADMIN])
  async updateAd(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: UpdateAdCreativeDto,
  ) {
    return this.adCreativeService.updateAdCreative(org.id, id, body);
  }

  @Delete('/:id')
  @CheckPolicies([AuthorizationActions.Delete, Sections.ADMIN])
  async deleteAd(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    return this.adCreativeService.deleteAdCreative(org.id, id);
  }

  // ---- Export ----

  @Post('/export')
  @CheckPolicies([AuthorizationActions.Read, Sections.ADMIN])
  async exportAd(
    @GetOrgFromRequest() org: Organization,
    @Body() body: ExportAdCreativeDto,
  ) {
    return this.adCreativeService.exportAdCreative(
      org.id,
      body.adCreativeId,
      body.format as any,
    );
  }
}
