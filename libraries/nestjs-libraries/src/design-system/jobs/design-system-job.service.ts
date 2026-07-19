import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { GenerationJobService } from '@gitroom/nestjs-libraries/database/prisma/generation-jobs/generation-job.service';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { BrandTokenMapper } from '../brand/brand-token-mapper';
import { TemplateFillService } from '../build/template-fill.service';
import { DesignSystemCatalogService } from '../catalog/catalog.service';
import { IdeateService } from '../ideate/ideate.service';
import { PlaywrightRenderService } from '../render/playwright-render.service';
import type {
  DesignJobProgress,
  DesignRecipe,
  DesignSlideInput,
  DesignSlideResult,
} from '../types/design-system.types';
import type { BrandVisualInput } from '../brand/brand-token-mapper';

export type CreateDesignJobBody = {
  slides: Array<{
    slideIndex?: number;
    headline?: string;
    body?: string;
    cta?: string;
    role?: string;
    templateId?: string;
  }>;
  recipe?: Partial<DesignRecipe> & {
    directionId?: string;
    paletteId?: string;
    fontId?: string;
    sizeId?: string;
  };
  /** If true and no recipe, auto-ideate one recipe from query */
  autoIdeate?: boolean;
  query?: string;
  seed?: number;
  brand?: BrandVisualInput;
  handle?: string;
  sizeId?: string;
  scale?: number;
};

@Injectable()
export class DesignSystemJobService {
  private readonly logger = new Logger(DesignSystemJobService.name);
  private readonly storage = UploadFactory.createStorage();

  constructor(
    private readonly catalog: DesignSystemCatalogService,
    private readonly ideate: IdeateService,
    private readonly fill: TemplateFillService,
    private readonly render: PlaywrightRenderService,
    private readonly brandMapper: BrandTokenMapper,
    private readonly jobs: GenerationJobService,
    private readonly media: MediaService
  ) {}

  async startJob(orgId: string, body: CreateDesignJobBody) {
    if (!this.catalog.isEnabled()) {
      throw new HttpException(
        'Design system is disabled (DESIGN_SYSTEM_ENABLED)',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    const slidesIn = Array.isArray(body.slides) ? body.slides : [];
    if (!slidesIn.length) {
      throw new HttpException(
        'At least one slide is required',
        HttpStatus.BAD_REQUEST
      );
    }

    const activeCount = await this.jobs.countActiveJobs(orgId);
    if (activeCount >= 2) {
      throw new HttpException(
        'Too many active jobs. Wait for existing jobs to complete.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const recipe = this.resolveRecipe(body);
    const planned = this.ideate.planSlides(
      recipe,
      slidesIn.map((s, i) => ({
        slideIndex: Number(s.slideIndex || i + 1),
        headline: s.headline,
        body: s.body,
        cta: s.cta,
      }))
    );

    // Honor explicit templateId/role from client
    const slides: DesignSlideInput[] = planned.map((p, i) => ({
      ...p,
      templateId: slidesIn[i]?.templateId || p.templateId,
      role: (slidesIn[i]?.role as DesignSlideInput['role']) || p.role,
    }));

    const progress: DesignJobProgress = {
      total: slides.length,
      completed: 0,
      failed: 0,
      recipe,
      slides: slides.map((s) => ({
        slideIndex: s.slideIndex,
        status: 'queued',
        templateId: s.templateId,
        role: s.role,
      })),
    };

    const job = await this.jobs.createJob({
      organizationId: orgId,
      type: 'DESIGN_SYSTEM_RENDER',
      provider: 'design_system',
      model: 'playwright-chromium',
    });

    await this.jobs.updateProgress(job.id, progress);
    await this.jobs.startJob(job.id);

    void this.runJob(job.id, orgId, recipe, slides, body);

    return {
      id: job.id,
      status: 'running',
      total: slides.length,
      completed: 0,
      failed: 0,
      recipe,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  async getJob(orgId: string, id: string) {
    const job = await this.jobs.getJob(id, orgId);
    if (!job) {
      throw new HttpException(
        'Design system job not found',
        HttpStatus.NOT_FOUND
      );
    }
    const progress = (job.progress as DesignJobProgress) || {
      total: 0,
      completed: 0,
      failed: 0,
      slides: [],
    };
    return {
      id: job.id,
      status: String(job.status || '').toLowerCase(),
      total: progress.total || 0,
      completed: progress.completed || 0,
      failed: progress.failed || 0,
      recipe: progress.recipe,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      slides: (progress.slides || []).map((s) => ({
        slideIndex: s.slideIndex,
        status: s.status,
        templateId: s.templateId,
        role: s.role,
        result: s.result,
        error: s.error,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      })),
      error: job.error || undefined,
    };
  }

  private resolveRecipe(body: CreateDesignJobBody): DesignRecipe {
    const sizeId = body.recipe?.sizeId || body.sizeId || 'ig-portrait';
    const size = this.catalog.requireSize(sizeId);
    const handle = body.handle || body.recipe?.handle || body.brand?.handle || '@yourbrand';

    if (body.recipe?.directionId && body.recipe?.paletteId && body.recipe?.fontId) {
      return {
        directionId: body.recipe.directionId,
        directionName:
          this.catalog.getDirection(body.recipe.directionId)?.name ||
          body.recipe.directionId,
        paletteId: body.recipe.paletteId,
        fontId: body.recipe.fontId,
        motifs: body.recipe.motifs || [],
        sizeId: size.id,
        width: size.width,
        height: size.height,
        handle,
        seed: body.seed,
      };
    }

    // Auto-ideate one recipe
    const [option] = this.ideate.ideate({
      query: body.query,
      count: 1,
      seed: body.seed,
      directionId: body.recipe?.directionId,
      sizeId: size.id,
      handle,
    });
    if (!option) {
      throw new HttpException(
        'Design catalog is empty — cannot ideate',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
    return option;
  }

  private async runJob(
    jobId: string,
    orgId: string,
    recipeIn: DesignRecipe,
    slides: DesignSlideInput[],
    body: CreateDesignJobBody
  ) {
    const { recipe, palette, font, logoUrl } = this.brandMapper.applyBrand(
      recipeIn,
      body.brand
    );
    const scale = Math.max(1, Number(body.scale || 2));
    const results: DesignSlideResult[] = slides.map((s) => ({
      slideIndex: s.slideIndex,
      status: 'queued',
      templateId: s.templateId,
      role: s.role,
    }));

    try {
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        results[i] = {
          ...results[i],
          status: 'running',
          startedAt: new Date().toISOString(),
        };
        await this.jobs.updateProgress(jobId, {
          total: slides.length,
          completed: results.filter((r) => r.status === 'completed').length,
          failed: results.filter((r) => r.status === 'failed').length,
          currentSlide: slide.slideIndex,
          recipe,
          slides: results,
        });

        try {
          const templateId = slide.templateId || 'quote-bold';
          const { html } = this.fill.fillSlide({
            templateId,
            width: recipe.width,
            height: recipe.height,
            palette,
            font,
            slide,
            handle: recipe.handle,
            logoUrl,
          });

          const png = await this.render.renderHtmlToPng({
            html,
            width: recipe.width,
            height: recipe.height,
            scale,
          });

          const uploaded = await this.storage.uploadFile({
            fieldname: 'file',
            originalname: `ds-slide-${String(slide.slideIndex).padStart(2, '0')}.png`,
            encoding: '7bit',
            mimetype: 'image/png',
            buffer: png,
            size: png.length,
          } as Express.Multer.File);

          const uploadedUrl =
            typeof uploaded === 'string' ? uploaded : uploaded.path;
          const saved = await this.media.saveFile(
            orgId,
            uploadedUrl.split('/').pop() ||
              `ds-slide-${slide.slideIndex}.png`,
            uploadedUrl
          );

          results[i] = {
            slideIndex: slide.slideIndex,
            status: 'completed',
            templateId,
            role: slide.role,
            startedAt: results[i].startedAt,
            completedAt: new Date().toISOString(),
            result: {
              images: [
                {
                  url: saved.path || uploadedUrl,
                  mediaId: saved.id,
                  revised_prompt: `design_system:${templateId}:${recipe.directionId}`,
                },
              ],
            },
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Design slide ${slide.slideIndex} failed: ${message}`
          );
          results[i] = {
            slideIndex: slide.slideIndex,
            status: 'failed',
            templateId: slide.templateId,
            role: slide.role,
            startedAt: results[i].startedAt,
            completedAt: new Date().toISOString(),
            error: message,
          };
        }

        await this.jobs.updateProgress(jobId, {
          total: slides.length,
          completed: results.filter((r) => r.status === 'completed').length,
          failed: results.filter((r) => r.status === 'failed').length,
          currentSlide: slide.slideIndex,
          recipe,
          slides: results,
        });
      }

      const allFailed = results.every((r) => r.status === 'failed');
      const someFailed = results.some((r) => r.status === 'failed');
      if (allFailed) {
        await this.jobs.failJob(jobId, 'All design slides failed to render');
      } else {
        await this.jobs.completeJob(jobId, {
          results,
          recipe,
          partial: someFailed,
        });
        // Keep progress with final slides for polling
        await this.jobs.updateProgress(jobId, {
          total: slides.length,
          completed: results.filter((r) => r.status === 'completed').length,
          failed: results.filter((r) => r.status === 'failed').length,
          recipe,
          slides: results,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Design job ${jobId} crashed: ${message}`);
      await this.jobs.failJob(jobId, message);
    }
  }
}
