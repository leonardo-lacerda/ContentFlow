import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
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
import {
  CreateCarouselDesignJobDto,
  DesignSystemIdeateDto,
} from '@gitroom/nestjs-libraries/dtos/ai-generate/create-carousel-design-job.dto';
import { DesignSystemCatalogService } from '@gitroom/nestjs-libraries/design-system/catalog/catalog.service';
import { DesignSystemJobService } from '@gitroom/nestjs-libraries/design-system/jobs/design-system-job.service';
import { IdeateService } from '@gitroom/nestjs-libraries/design-system/ideate/ideate.service';

@ApiTags('AI Generate')
@Controller('/ai-generate')
export class AiGenerateController {
  constructor(
    private readonly _aiGenerateService: AiGenerateService,
    private readonly _templateRecommender: TemplateRecommenderService,
    private readonly _brandProfileService: BrandProfileService,
    private readonly _designCatalog: DesignSystemCatalogService,
    private readonly _designJobs: DesignSystemJobService,
    private readonly _designIdeate: IdeateService
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

  // Fase 3 — recompõe só a camada de texto sobre um fundo já gerado
  // (modo híbrido). Sem chamada ao modelo de imagem: custo ~zero.
  @Post('/hybrid/recompose')
  recomposeHybridSlide(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { compose?: Record<string, unknown> }
  ) {
    return this._aiGenerateService.recomposeHybridSlide(org.id, body);
  }

  @Post('/art-direction')
  artDirectCarousel(
    @GetOrgFromRequest() org: Organization,
    @Body()
    body: {
      title?: string;
      imageStyleGuide?: string;
      directionSummary?: string;
      brandName?: string;
      brandColors?: string;
      textModel?: string;
      slides?: Array<{
        index?: number;
        headline?: string;
        body?: string;
        cta?: string;
        imagePrompt?: string;
      }>;
    }
  ) {
    return this._aiGenerateService.artDirectCarousel(org.id, body);
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

  // Polling de progresso (a cada ~2.5s pelo frontend): isento do rate limit
  // global de 30/h por rota, senão a leitura do progresso estoura o limite
  // antes de as imagens terminarem e a fila trava em 0% (HTTP 429).
  @SkipThrottle()
  @Get('/carousel-image-jobs/:id')
  getCarouselImageJob(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._aiGenerateService.getCarouselImageJob(org.id, id);
  }

  // ─── Design System (HTML templates → Playwright PNG) ───

  @Get('/design-system/catalog')
  getDesignSystemCatalog() {
    return this._designCatalog.getCatalog();
  }

  @Get('/design-system/summary')
  getDesignSystemSummary() {
    return this._designCatalog.getSummary();
  }

  @Post('/design-system/ideate')
  ideateDesignSystem(
    @GetOrgFromRequest() _org: Organization,
    @Body() body: DesignSystemIdeateDto
  ) {
    return {
      options: this._designIdeate.ideate({
        query: body.query,
        count: body.count,
        seed: body.seed,
        directionId: body.directionId,
        sizeId: body.sizeId,
        handle: body.handle,
      }),
    };
  }

  @Post('/carousel-design-jobs')
  startCarouselDesignJob(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateCarouselDesignJobDto
  ) {
    return this._designJobs.startJob(org.id, body);
  }

  // Fase 1 — preview verdadeiro: o mesmo HTML que o Playwright renderiza,
  // devolvido para o navegador exibir em iframe (preview = resultado).
  @SkipThrottle()
  @Post('/carousel-design-jobs/preview')
  previewCarouselDesignJob(
    @GetOrgFromRequest() _org: Organization,
    @Body() body: CreateCarouselDesignJobDto
  ) {
    return this._designJobs.previewHtml(body);
  }

  // Mesmo caso do polling de imagens: isento do rate limit global.
  @SkipThrottle()
  @Get('/carousel-design-jobs/:id')
  getCarouselDesignJob(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._designJobs.getJob(org.id, id);
  }
}
