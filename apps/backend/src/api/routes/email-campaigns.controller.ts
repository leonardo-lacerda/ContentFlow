import { UseGuards, Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { V1SurfaceGuard } from '@gitroom/backend/services/auth/v1-surface.guard';
import { ApiTags } from '@nestjs/swagger';
import { Organization, EmailCampaignType } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { EmailCampaignGenerateService } from '@gitroom/nestjs-libraries/ai-generate/email-campaign-generate.service';
import { EmailCampaignService } from '@gitroom/nestjs-libraries/database/prisma/email-campaigns/email-campaign.service';

@ApiTags('Email Campaigns')
@UseGuards(V1SurfaceGuard)
@Controller('/email-campaigns')
export class EmailCampaignsController {
  constructor(
    private emailGenerateService: EmailCampaignGenerateService,
    private emailCampaignService: EmailCampaignService,
  ) {}

  // ── Templates ─────────────────────────────────────────────

  @Get('/templates')
  getTemplates(@Query('category') category?: string) {
    return this.emailGenerateService.getTemplates(category);
  }

  // ── List / Read ──────────────────────────────────────────

  @Get('/')
  async getCampaigns(
    @GetOrgFromRequest() org: Organization,
    @Query('type') type?: string,
  ) {
    return this.emailCampaignService.getCampaigns(org.id, type as EmailCampaignType | undefined);
  }

  @Get('/:id')
  async getCampaign(
    @Param('id') id: string,
    @GetOrgFromRequest() org: Organization,
  ) {
    return this.emailCampaignService.getCampaignByOrg(id, org.id);
  }

  @Get('/brand/:brandId')
  async getCampaignsByBrand(
    @Param('brandId') brandId: string,
    @Query('type') type?: string,
  ) {
    return this.emailCampaignService.getCampaignsByBrand(brandId, type as EmailCampaignType | undefined);
  }

  @Get('/welcome-sequence/:brandId')
  async getWelcomeSequence(
    @GetOrgFromRequest() org: Organization,
    @Param('brandId') brandId: string,
  ) {
    return this.emailCampaignService.getWelcomeSequence(org.id, brandId);
  }

  // ── AI Generation ────────────────────────────────────────

  @Post('/generate')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async generateCampaign(
    @GetOrgFromRequest() org: Organization,
    @Body() body: {
      brandProfileId: string;
      contentIdeaId?: string;
      carouselProjectId?: string;
      campaignType: string;
      name: string;
      templateId?: string;
      additionalContext?: string;
    },
  ) {
    return this.emailGenerateService.generateEmailCampaign(org.id, body);
  }

  @Post('/generate-welcome-sequence')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async generateWelcomeSequence(
    @GetOrgFromRequest() org: Organization,
    @Body() body: {
      brandProfileId: string;
      sequenceLength?: number;
      additionalContext?: string;
    },
  ) {
    return this.emailGenerateService.generateWelcomeSequence(org.id, body);
  }

  // ── Render HTML (stateless, no DB) ───────────────────────

  @Post('/render-html')
  async renderHtml(
    @Body() body: {
      blocks: any[];
      subject: string;
      ctaText?: string;
      ctaUrl?: string;
      ctaColor?: string;
      primaryColor?: string;
      secondaryColor?: string;
      headerImageUrl?: string;
      logoUrl?: string;
      preheader?: string;
    },
  ) {
    return { html: this.emailGenerateService.renderHtml(body) };
  }

  // ── Edit ─────────────────────────────────────────────────

  @Put('/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateCampaign(
    @Param('id') id: string,
    @GetOrgFromRequest() org: Organization,
    @Body() body: {
      name?: string;
      subject?: string;
      preheader?: string;
      bodyJson?: any;
      ctaText?: string;
      ctaUrl?: string;
      ctaColor?: string;
      primaryColor?: string;
      secondaryColor?: string;
      headerImageUrl?: string;
      logoUrl?: string;
    },
  ) {
    // Verify ownership
    await this.emailCampaignService.getCampaignByOrg(id, org.id);
    return this.emailCampaignService.updateCampaign(id, body);
  }

  @Post('/:id/re-render')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async reRenderHtml(
    @Param('id') id: string,
    @GetOrgFromRequest() org: Organization,
    @Body() body: { bodyJson: { blocks: Array<Record<string, any>> } },
  ) {
    // Verify ownership
    await this.emailCampaignService.getCampaignByOrg(id, org.id);
    return this.emailGenerateService.reRenderHtml(id, body.bodyJson);
  }

  // ── Export ────────────────────────────────────────────────

  @Post('/:id/export')
  async exportHtml(
    @Param('id') id: string,
    @GetOrgFromRequest() org: Organization,
  ) {
    // Verify ownership
    await this.emailCampaignService.getCampaignByOrg(id, org.id);
    return this.emailGenerateService.exportHtml(id);
  }

  @Get('/:id/preview')
  async previewHtml(
    @Param('id') id: string,
    @GetOrgFromRequest() org: Organization,
  ) {
    const campaign = await this.emailCampaignService.getCampaignByOrg(id, org.id);
    return { html: campaign.bodyHtml };
  }

  // ── Delete ───────────────────────────────────────────────

  @Delete('/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async deleteCampaign(
    @Param('id') id: string,
    @GetOrgFromRequest() org: Organization,
  ) {
    // Verify ownership
    await this.emailCampaignService.getCampaignByOrg(id, org.id);
    return this.emailCampaignService.deleteCampaign(id);
  }
}
