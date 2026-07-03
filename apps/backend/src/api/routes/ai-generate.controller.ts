import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { AiGenerateService } from '@gitroom/nestjs-libraries/ai-generate/ai-generate.service';
import { AiGenerateCarouselDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-carousel.dto';
import { AiGenerateCarouselIdeasDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-carousel-ideas.dto';
import { AiGenerateCaptionDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-caption.dto';
import { AiGenerateImageDto } from '@gitroom/nestjs-libraries/dtos/ai-generate/ai-generate-image.dto';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { recordTemplateUsage } from '@gitroom/nestjs-libraries/ai-generate/templates/template-usage-tracker';
import { TEMPLATE_SCHEMA_VERSION } from '@gitroom/nestjs-libraries/ai-generate/templates/template-definitions';
import { TemplateRecommenderService } from '@gitroom/nestjs-libraries/ai-generate/templates/template-recommender.service';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';

@ApiTags('AI Generate')
@Controller('/ai-generate')
export class AiGenerateController {
  constructor(
    private readonly _aiGenerateService: AiGenerateService,
    private readonly _templateRecommender: TemplateRecommenderService,
    private readonly _brandProfileService: BrandProfileService
  ) {}

  // -----------------------------------------------------------------------
  // Template endpoints
  // -----------------------------------------------------------------------

  @Get('/templates')
  getTemplates(
    @Query('category') category?: string,
    @Query('goal') goal?: string
  ) {
    let templates;
    if (category) {
      templates = this._templateRecommender.getByCategory(category);
    } else if (goal) {
      templates = this._templateRecommender.getByGoal(goal);
    } else {
      templates = this._templateRecommender.getActive();
    }
    return { templates, schemaVersion: TEMPLATE_SCHEMA_VERSION };
  }

  @Get('/templates/summary')
  getTemplatesSummary() {
    return this._templateRecommender.getSummary();
  }

  @Get('/templates/recommend')
  recommendTemplates(
    @Query('platform') platform?: string,
    @Query('goal') goal?: string,
    @Query('niche') niche?: string,
    @Query('tone') tone?: string
  ) {
    const templates = this._templateRecommender.recommend({ platform, goal, niche, tone });
    const recommendations = templates.map((t, i) => ({
      templateId: t.id,
      name: t.label,
      reason: this._buildRecommendationReason(t, { platform, goal, niche, tone }),
      confidence: Math.max(0.3, 1 - i * 0.12),
      narrativePreview: t.narrative.description,
    }));
    return {
      recommendations,
      defaultTemplateId: templates[0]?.id || 'educational',
    };
  }

  @Post('/templates/recommend')
  recommendTemplatesPost(
    @Body() body: { platform?: string; goal?: string; niche?: string; tone?: string }
  ) {
    const templates = this._templateRecommender.recommend(body);
    const recommendations = templates.map((t, i) => ({
      templateId: t.id,
      name: t.label,
      reason: this._buildRecommendationReason(t, body),
      confidence: Math.max(0.3, 1 - i * 0.12),
      narrativePreview: t.narrative.description,
    }));
    return {
      recommendations,
      defaultTemplateId: templates[0]?.id || 'educational',
    };
  }

  @Post('/templates/track')
  trackTemplateUsage(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { templateId: string; event: 'select' | 'generate' | 'complete' }
  ) {
    recordTemplateUsage({
      orgId: org.id,
      templateId: body.templateId,
    });
    return { ok: true };
  }

  @Get('/templates/:id')
  getTemplateById(@Param('id') id: string) {
    const template = this._templateRecommender.getById(id);
    if (!template) {
      return { error: 'Template not found', id };
    }
    return template;
  }

  private _buildRecommendationReason(
    template: any,
    input: { platform?: string; goal?: string; niche?: string; tone?: string }
  ): string {
    const parts: string[] = [];
    if (input.niche && template.preferredNiches?.includes(input.niche)) {
      parts.push(`ideal para o nicho de ${input.niche}`);
    }
    if (input.platform && template.preferredPlatforms?.includes(input.platform)) {
      parts.push(`otimizado para ${input.platform}`);
    }
    if (input.goal && template.goal.toLowerCase().includes(input.goal.toLowerCase())) {
      parts.push(`alinhado com o objetivo "${input.goal}"`);
    }
    if (input.tone && template.tone.toLowerCase().includes(input.tone.toLowerCase())) {
      parts.push(`tom compatível`);
    }
    return parts.length > 0 ? parts.join(', ') : 'bom ajuste geral para seu contexto';
  }

  // -----------------------------------------------------------------------
  // Existing endpoints
  // -----------------------------------------------------------------------

  @Post('/images')
  async generateImage(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AiGenerateImageDto
  ) {
    if (body.brandProfileId) {
      await this._brandProfileService.validateBrandOwnership(org.id, body.brandProfileId);
    }
    return this._aiGenerateService.generateImage(org.id, body);
  }

  @Post('/carousel-plan')
  async generateCarouselPlan(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AiGenerateCarouselDto
  ) {
    if (body.brandProfileId) {
      await this._brandProfileService.validateBrandOwnership(org.id, body.brandProfileId);
    }
    return this._aiGenerateService.generateCarouselPlan(org.id, body);
  }

  @Post('/carousel-ideas')
  async generateCarouselIdeas(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AiGenerateCarouselIdeasDto
  ) {
    if (body.brandProfileId) {
      await this._brandProfileService.validateBrandOwnership(org.id, body.brandProfileId);
    }
    return this._aiGenerateService.generateCarouselIdeas(org.id, body);
  }

  @Post('/carousel-caption')
  async generateCarouselCaption(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AiGenerateCaptionDto
  ) {
    if (body.brandProfileId) {
      await this._brandProfileService.validateBrandOwnership(org.id, body.brandProfileId);
    }
    return this._aiGenerateService.generateCarouselCaption(org.id, body);
  }

  @Post('/carousel-review')
  reviewCarousel(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AiGenerateCarouselDto
  ) {
    return this._aiGenerateService.reviewCarousel(org.id, body);
  }

  @Post('/carousel-fix')
  fixCarousel(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AiGenerateCarouselDto
  ) {
    return this._aiGenerateService.fixCarouselWithEditorialReview(org.id, body);
  }

  @Post('/cost-estimate')
  estimateCosts(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      slideCount?: number;
      referenceCount?: number;
      promptChars?: number;
    }
  ) {
    return this._aiGenerateService.estimateCarouselCosts(org.id, body);
  }

  @Get('/cost-history')
  getCostHistory(@GetOrgFromRequest() org: Organization) {
    return this._aiGenerateService.getCostHistory(org.id);
  }

  @Post('/carousel-image-jobs')
  startCarouselImageJob(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      slides?: Array<{
        slideIndex?: number;
        request?: AiGenerateImageDto;
      }>;
    }
  ) {
    return this._aiGenerateService.startCarouselImageJob(org.id, body);
  }

  @Get('/carousel-image-jobs/:id')
  getCarouselImageJob(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._aiGenerateService.getCarouselImageJob(org.id, id);
  }
}
