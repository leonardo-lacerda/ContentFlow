import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  CreativeAssetStatus,
  CreativeAssetType,
  CreativeJobStatus,
  CreativeProjectStatus,
  CreativeRightsStatus,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CreativeCreditService } from './creative-credit.service';
import { CreativeProviderService } from './creative-provider.service';
import { CreativeWebhookService } from './creative-webhook.service';
import { CreativeModerationService } from './creative-moderation.service';
import {
  CreativeCapability,
  CreativeProviderInput,
  normalizeAspectRatio,
  scopeCreativeIdempotencyKey,
} from './creative-engine.types';
import { CREATIVE_PRESETS } from './creative-presets';
import {
  CreativeMediaTool,
  CreativeMediaToolService,
} from './creative-media-tool.service';
import { CreativeOutputValidationService } from './creative-output-validation.service';
import { CreativeMetricsService } from './creative-metrics.service';
import { TemporalService } from 'nestjs-temporal-core';
import { deleteCreativeLocalUpload } from './creative-local-media';
import { resolveCreativeLocalUploadPath } from './creative-local-media';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { CreativeOutputStorageService } from './creative-output-storage.service';
import { compileDesignPrompt } from './creative-design-prompt.util';
import { buildDefaultCarouselDesignSpec } from './carousel-default-design-spec';
import { PlanLimitsService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/plan-limits.service';
import { PricingCatalogService } from '@gitroom/nestjs-libraries/services/pricing-catalog.service';
import { BillingEntitlementsService } from '@gitroom/nestjs-libraries/services/billing-entitlements.service';
import { BrandProfileService } from '@gitroom/nestjs-libraries/database/prisma/brands/brand-profile.service';
import { BillingModelAccessCode } from '@gitroom/nestjs-libraries/services/billing-catalog';

type JsonRecord = Record<string, any>;

const CREATIVE_TOOL_CREDITS: Record<CreativeMediaTool, number> = {
  captions: 8,
  transcribe: 20,
  resize: 18,
  trim: 18,
  merge: 35,
  compose: 55,
  'scene-render': 80,
};

@Injectable()
export class CreativeEngineService {
  private readonly logger = new Logger(CreativeEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreativeCreditService,
    private readonly providers: CreativeProviderService,
    private readonly openai: OpenaiService,
    private readonly webhooks: CreativeWebhookService,
    private readonly moderation: CreativeModerationService,
    private readonly mediaTools: CreativeMediaToolService,
    private readonly outputValidation: CreativeOutputValidationService,
    private readonly metrics: CreativeMetricsService,
    private readonly temporal: TemporalService,
    private readonly outputStorage: CreativeOutputStorageService,
    @Optional() private readonly planLimits?: PlanLimitsService,
    @Optional() private readonly pricingCatalog?: PricingCatalogService,
    @Optional() private readonly entitlements?: BillingEntitlementsService,
    @Optional() private readonly brandProfiles?: BrandProfileService,
  ) {}

  listCapabilities() {
    return this.providers.listCapabilities();
  }

  getHealth() {
    return this.providers.health();
  }

  listPresets() {
    return CREATIVE_PRESETS;
  }

  async runPreset(organizationId: string, projectId: string, presetId: string, input: {
    actorId?: string;
    voiceId?: string;
    variantId?: string;
    targetLanguage?: string;
    productAssetIds?: string[];
    prompt?: string;
    provider?: string;
    capability?: CreativeCapability;
    language?: string;
    aspectRatio?: string;
    durationSec?: number;
    audioUrl?: string;
    videoUrl?: string;
    idempotencyKey?: string;
  }) {
    const preset = CREATIVE_PRESETS.find((item) => item.id === presetId);
    if (!preset) throw new NotFoundException('Creative preset not found');
    await this.getProject(projectId, organizationId);
    if (presetId === 'localized-variant') {
      if (!input.variantId || !input.targetLanguage) throw new BadRequestException('variantId and targetLanguage are required for localized-variant');
      return this.localizeVariant(organizationId, projectId, input.variantId, {
        targetLanguage: input.targetLanguage,
        provider: input.provider,
        capability: input.capability,
        idempotencyKey: input.idempotencyKey,
      });
    }
    if (['product-b-roll', 'unboxing-pov', 'show-your-app', 'camera-movement', 'fashion-try-on'].includes(presetId) && !input.productAssetIds?.length) {
      throw new BadRequestException(`Preset ${presetId} requires at least one approved product asset`);
    }
    if (presetId === 'ugc-performance-vertical' && (!input.actorId || !input.voiceId)) {
      throw new BadRequestException('Preset ugc-performance-vertical requires an approved actorId and voiceId');
    }
    if (presetId === 'audio-driven' && (!input.actorId || !input.audioUrl)) {
      throw new BadRequestException('Preset audio-driven requires an approved actorId and audioUrl');
    }
    if (presetId === 'fashion-try-on') {
      return this.generateImage(organizationId, projectId, {
        prompt: input.prompt || 'Fashion try-on lifestyle scene with the approved product, natural pose and clean performance-ad composition.',
        aspectRatio: input.aspectRatio || String(preset.defaults.aspectRatio || '4:5'),
        productAssetIds: input.productAssetIds,
        name: 'Fashion try-on preset output',
      });
    }
    const capability = input.capability || preset.capability;
    const prompt = input.prompt || `${preset.description}. ${JSON.stringify(preset.defaults)}`;
    return this.generateVariant(organizationId, projectId, {
      capability,
      provider: input.provider,
      actorId: input.actorId,
      voiceId: input.voiceId,
      productAssetIds: input.productAssetIds,
      language: input.language,
      aspectRatio: input.aspectRatio || String(preset.defaults.aspectRatio || '9:16'),
      durationSec: input.durationSec || Number(preset.defaults.durationSec || 8),
      prompt,
      audioUrl: input.audioUrl,
      videoUrl: input.videoUrl,
      idempotencyKey: input.idempotencyKey,
    });
  }

  async quoteTool(
    organizationId: string,
    projectId: string,
    input: { tool: CreativeMediaTool },
  ) {
    await this.getProject(projectId, organizationId);
    const estimatedCredits = CREATIVE_TOOL_CREDITS[input.tool];
    if (!estimatedCredits) throw new BadRequestException(`Unsupported creative media tool: ${input.tool}`);
    const balance = await this.credits.getBalance(organizationId);
    return {
      tool: input.tool,
      provider: 'contentflow',
      model: `creative-${input.tool}`,
      estimatedCredits,
      balance,
      canGenerate: balance.balance >= estimatedCredits,
    };
  }

  async runTool(
    organizationId: string,
    projectId: string,
    input: {
      tool: CreativeMediaTool;
      script?: string;
      prompt?: string;
      language?: string;
      audioUrl?: string;
      sourceUrl?: string;
      sourceUrls?: string[];
      scenes?: Array<Record<string, unknown>>;
      maxDurationSec?: number;
      aspectRatio?: string;
      startSec?: number;
      durationSec?: number;
      idempotencyKey?: string;
    },
  ) {
    await this.getProject(projectId, organizationId);
    const estimatedCredits = CREATIVE_TOOL_CREDITS[input.tool];
    if (!estimatedCredits) throw new BadRequestException(`Unsupported creative media tool: ${input.tool}`);
    this.moderation.assertAllowed(`${input.script || ''}\n${input.prompt || ''}`);
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ organizationId, projectId, input }))
      .digest('hex');
    const idempotencyKey = input.idempotencyKey
      ? scopeCreativeIdempotencyKey(organizationId, input.idempotencyKey)
      : `creative-tool:${fingerprint}`;
    const existing = await this.prisma.creativeJob.findUnique({ where: { idempotencyKey } });
    if (existing) return this.getJob(existing.id, organizationId);
    await this.credits.assertConcurrencyQuota(organizationId);
    const job = await this.prisma.creativeJob.create({
      data: {
        organizationId,
        projectId,
        type: `tool.${input.tool}`,
        status: CreativeJobStatus.QUEUED,
        provider: 'contentflow',
        model: `creative-${input.tool}`,
        input: { ...input, tool: input.tool } as Prisma.InputJsonValue,
        costEstimate: estimatedCredits,
        idempotencyKey,
      },
    });
    try {
      const reservation = await this.credits.reserve(organizationId, estimatedCredits, {
        projectId,
        jobId: job.id,
        idempotencyKey: `reservation:${job.id}`,
        metadata: { tool: input.tool },
      });
      const jobInput = { ...input, tool: input.tool, reservationId: reservation.id };
      await this.prisma.creativeJob.update({
        where: { id: job.id },
        data: { status: CreativeJobStatus.RESERVED, input: jobInput as Prisma.InputJsonValue },
      });
      await this.prisma.creativeJob.update({
        where: { id: job.id },
        data: { status: CreativeJobStatus.RUNNING, startedAt: new Date(), progress: 10, attempts: { increment: 1 } },
      });
      const attempt = await this.prisma.creativeJobAttempt.create({
        data: {
          jobId: job.id,
          attempt: 1,
          provider: 'contentflow',
          model: `creative-${input.tool}`,
        },
        select: { id: true },
      });
      const output = await this.mediaTools.execute(input.tool, jobInput);
      this.outputValidation.validateTool(input.tool, output);
      const outputJson = JSON.parse(JSON.stringify(output)) as Prisma.InputJsonValue;
      await this.credits.settle(reservation.id, estimatedCredits);
      await this.prisma.creativeJob.update({
        where: { id: job.id },
        data: { status: CreativeJobStatus.SUCCEEDED, progress: 100, output: outputJson, costActual: estimatedCredits, completedAt: new Date() },
      });
      await this.prisma.creativeJobAttempt.update({
        where: { id: attempt.id },
        data: { status: 'SUCCEEDED', completedAt: new Date(), output: outputJson },
      });
      if (output.url) {
        await this.prisma.creativeAsset.create({
          data: {
            organizationId,
            projectId,
            type: input.tool === 'transcribe' || input.tool === 'captions' ? CreativeAssetType.OTHER : CreativeAssetType.VIDEO,
            status: CreativeAssetStatus.READY,
            rightsStatus: CreativeRightsStatus.UNKNOWN,
            name: `Creative ${input.tool} output`,
            url: output.url,
            mimeType: output.mimeType,
            metadata: { jobId: job.id, tool: input.tool, ...(output.metadata || {}) } as Prisma.InputJsonValue,
          },
        });
      }
      await this.prisma.creativeProvenance.create({
        data: {
          organizationId,
          projectId,
          operation: `tool.${input.tool}`,
          provider: 'contentflow',
          model: `creative-${input.tool}`,
          inputHash: createHash('sha256').update(JSON.stringify(jobInput)).digest('hex'),
          data: JSON.parse(JSON.stringify({ input: jobInput, output })) as Prisma.InputJsonValue,
        },
      });
      await this.webhooks.emit(organizationId, 'creative.job.completed', { jobId: job.id, projectId, output });
      await this.metrics.record({
        organizationId,
        projectId,
        jobId: job.id,
        event: 'creative.job.completed',
        provider: 'contentflow',
        model: `creative-${input.tool}`,
        value: estimatedCredits,
      });
      return this.getJob(job.id, organizationId);
    } catch (error) {
      const message = this.errorMessage(error);
      const failedJob = await this.getJob(job.id, organizationId);
      const currentAttempt = failedJob.attemptRecords.find((attempt) => attempt.attempt === failedJob.attempts);
      if (currentAttempt) {
        await this.prisma.creativeJobAttempt.update({
          where: { id: currentAttempt.id },
          data: { status: 'FAILED', error: message, completedAt: new Date() },
        });
      }
      const failedInput = failedJob.input as JsonRecord;
      if (failedInput?.reservationId) await this.credits.refund(failedInput.reservationId, message);
      await this.prisma.creativeJob.update({ where: { id: job.id }, data: { status: CreativeJobStatus.FAILED, error: message, completedAt: new Date() } });
      await this.webhooks.emit(organizationId, 'creative.job.failed', { jobId: job.id, projectId, error: message });
      await this.metrics.record({ organizationId, projectId, jobId: job.id, event: 'creative.job.failed', value: 1, metadata: { error: message, tool: input.tool } });
      throw error;
    }
  }

  async createProject(organizationId: string, input: {
    name: string;
    brandProfileId?: string;
    objective?: string;
    aspectRatio?: string;
    maxDurationSec?: number;
    metadata?: JsonRecord;
  }) {
    if (!input.name?.trim()) throw new BadRequestException('Project name is required');
    return this.prisma.creativeProject.create({
      data: {
        organizationId,
        brandProfileId: input.brandProfileId,
        name: input.name.trim(),
        objective: input.objective,
        aspectRatio: normalizeAspectRatio(input.aspectRatio),
        maxDurationSec: Math.min(180, Math.max(5, input.maxDurationSec || 60)),
        metadata: input.metadata as Prisma.InputJsonValue,
      },
      include: { products: true, assets: true, actors: true, scripts: true, variants: true },
    });
  }

  async listProjects(organizationId: string) {
    return this.prisma.creativeProject.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      include: {
        products: true,
        assets: { where: { deletedAt: null } },
        variants: { orderBy: { createdAt: 'desc' }, take: 5 },
        _count: { select: { scripts: true, variants: true, jobs: true } },
      },
    });
  }

  async updateProject(id: string, organizationId: string, input: {
    name?: string;
    objective?: string;
    aspectRatio?: string;
    maxDurationSec?: number;
    metadata?: JsonRecord;
  }) {
    await this.getProject(id, organizationId);
    if (input.name !== undefined && !input.name.trim()) throw new BadRequestException('Project name is required');
    return this.prisma.creativeProject.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.objective !== undefined ? { objective: input.objective } : {}),
        ...(input.aspectRatio !== undefined ? { aspectRatio: normalizeAspectRatio(input.aspectRatio) } : {}),
        ...(input.maxDurationSec !== undefined ? { maxDurationSec: Math.min(180, Math.max(5, input.maxDurationSec)) } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
      },
      include: { products: true, assets: true, actors: true, scripts: true, variants: true },
    });
  }

  async getProject(id: string, organizationId: string) {
    const project = await this.prisma.creativeProject.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        products: true,
        assets: { where: { deletedAt: null } },
        actors: { where: { deletedAt: null } },
        scripts: { orderBy: { version: 'desc' }, include: { scenes: { orderBy: { sceneIndex: 'asc' } } } },
        variants: { orderBy: { createdAt: 'desc' } },
        publications: { orderBy: { createdAt: 'desc' }, take: 100 },
        jobs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!project) throw new NotFoundException('Creative project not found');
    return project;
  }

  async archiveProject(id: string, organizationId: string) {
    await this.getProject(id, organizationId);
    return this.prisma.creativeProject.update({
      where: { id },
      data: { status: CreativeProjectStatus.ARCHIVED, deletedAt: new Date() },
    });
  }

  async takedownProject(id: string, organizationId: string, reason = 'operator-takedown') {
    const project = await this.getProject(id, organizationId);
    const candidateUrls = [
      ...(project.assets || []).flatMap((asset: any) => [asset.url, asset.thumbnailUrl]),
      ...(project.actors || []).flatMap((actor: any) => [actor.imageUrl, actor.previewUrl]),
      ...(project.variants || []).flatMap((variant: any) => [variant.videoUrl, variant.thumbnailUrl, variant.captionsUrl]),
    ].filter(Boolean) as string[];
    const relatedResourceIds = [
      id,
      ...(project.assets || []).map((asset: any) => asset.id),
      ...(project.actors || []).map((actor: any) => actor.id),
      ...(project.products || []).map((product: any) => product.id),
      ...(project.variants || []).flatMap((variant: any) => [variant.id, variant.actorId, variant.voiceId]).filter(Boolean),
    ];
    const activeJobs = await this.prisma.creativeJob.findMany({
      where: {
        organizationId,
        projectId: id,
        status: { in: [CreativeJobStatus.QUEUED, CreativeJobStatus.RESERVED, CreativeJobStatus.RUNNING, CreativeJobStatus.RETRYABLE] },
      },
    });
    for (const job of activeJobs) {
      const reservationId = (job.input as JsonRecord)?.reservationId;
      if (reservationId) {
        try {
          await this.credits.refund(reservationId, `takedown:${reason}`);
        } catch (error) {
          this.logger.warn(`Unable to refund creative job ${job.id} during takedown: ${this.errorMessage(error)}`);
        }
      }
    }
    await this.prisma.$transaction([
      this.prisma.creativeProject.update({ where: { id }, data: { status: CreativeProjectStatus.ARCHIVED, deletedAt: new Date() } }),
      this.prisma.creativeAsset.updateMany({ where: { organizationId, projectId: id }, data: { status: CreativeAssetStatus.ARCHIVED, deletedAt: new Date() } }),
      this.prisma.creativeProduct.updateMany({ where: { organizationId, projectId: id }, data: { status: 'ARCHIVED', deletedAt: new Date() } }),
      this.prisma.creativeActor.updateMany({ where: { organizationId, projectId: id }, data: { rightsStatus: CreativeRightsStatus.REVOKED, deletedAt: new Date() } }),
      this.prisma.creativeVariant.updateMany({ where: { organizationId, projectId: id }, data: { status: 'TAKEN_DOWN', videoUrl: null, thumbnailUrl: null, captionsUrl: null } }),
      this.prisma.creativeJob.updateMany({ where: { organizationId, projectId: id, status: { in: [CreativeJobStatus.QUEUED, CreativeJobStatus.RESERVED, CreativeJobStatus.RUNNING, CreativeJobStatus.RETRYABLE] } }, data: { status: CreativeJobStatus.CANCELLED, error: `Takedown: ${reason}`, completedAt: new Date() } }),
      this.prisma.creativePublication.updateMany({ where: { organizationId, projectId: id, status: { not: 'TAKEN_DOWN' } }, data: { status: 'TAKEN_DOWN', error: `Takedown: ${reason}` } }),
      this.prisma.creativeRightsGrant.updateMany({ where: { organizationId, resourceId: { in: relatedResourceIds } }, data: { status: CreativeRightsStatus.REVOKED, revokedAt: new Date() } }),
    ]);
    const [assetRefs, variantRefs, actorRefs, voiceRefs, mediaRefs] = await Promise.all([
      this.prisma.creativeAsset.findMany({ where: { organizationId, url: { in: candidateUrls }, deletedAt: null }, select: { url: true } }),
      this.prisma.creativeVariant.findMany({ where: { organizationId, OR: [{ videoUrl: { in: candidateUrls } }, { thumbnailUrl: { in: candidateUrls } }, { captionsUrl: { in: candidateUrls } }], NOT: { projectId: id } }, select: { videoUrl: true, thumbnailUrl: true, captionsUrl: true } }),
      this.prisma.creativeActor.findMany({ where: { organizationId, OR: [{ imageUrl: { in: candidateUrls } }, { previewUrl: { in: candidateUrls } }], NOT: { projectId: id } }, select: { imageUrl: true, previewUrl: true } }),
      this.prisma.creativeVoice.findMany({ where: { organizationId, previewUrl: { in: candidateUrls }, deletedAt: null }, select: { previewUrl: true } }),
      this.prisma.media.findMany({ where: { organizationId, path: { in: candidateUrls }, deletedAt: null }, select: { path: true, name: true } }),
    ]);
    const stillReferenced = new Set<string>([
      ...(assetRefs.map((item) => item.url).filter(Boolean) as string[]),
      ...(variantRefs.flatMap((item) => [item.videoUrl, item.thumbnailUrl, item.captionsUrl]).filter(Boolean) as string[]),
      ...(actorRefs.flatMap((item) => [item.imageUrl, item.previewUrl]).filter(Boolean) as string[]),
      ...(voiceRefs.map((item) => item.previewUrl).filter(Boolean) as string[]),
      ...mediaRefs.filter((item) => !item.name.startsWith('creative-')).map((item) => item.path),
    ]);
    await this.prisma.media.updateMany({
      where: { organizationId, path: { in: candidateUrls }, name: { startsWith: 'creative-' }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    for (const url of candidateUrls) {
      if (!stillReferenced.has(url)) await deleteCreativeLocalUpload(url);
    }
    await this.prisma.creativeProvenance.create({
      data: {
        organizationId,
        projectId: id,
        operation: 'project.takedown',
        inputHash: createHash('sha256').update(JSON.stringify({ id, organizationId, reason })).digest('hex'),
        data: { reason, projectName: project.name } as Prisma.InputJsonValue,
      },
    });
    await this.webhooks.emit(organizationId, 'creative.project.taken_down', { projectId: id, reason });
    await this.metrics.record({ organizationId, projectId: id, event: 'creative.project.taken_down', value: 1, metadata: { reason } });
    return { projectId: id, status: CreativeProjectStatus.ARCHIVED, reason };
  }

  async createAsset(organizationId: string, input: {
    projectId?: string;
    mediaId?: string;
    type: CreativeAssetType;
    name: string;
    url?: string;
    thumbnailUrl?: string;
    mimeType?: string;
    fileSize?: number;
    rightsStatus?: CreativeRightsStatus;
    metadata?: JsonRecord;
  }) {
    if (input.projectId) await this.getProject(input.projectId, organizationId);
    await this.assertCreativeInputUrl(input.url);
    await this.assertCreativeInputUrl(input.thumbnailUrl);
    if (input.rightsStatus === CreativeRightsStatus.APPROVED) {
      throw new BadRequestException('Approve asset rights through POST /creative/rights with a consent reference');
    }
    const asset = await this.prisma.creativeAsset.create({
      data: {
        organizationId,
        projectId: input.projectId,
        mediaId: input.mediaId,
        type: input.type,
        name: input.name,
        url: input.url,
        thumbnailUrl: input.thumbnailUrl,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        status: input.url ? CreativeAssetStatus.READY : CreativeAssetStatus.UPLOADING,
        rightsStatus: input.rightsStatus || CreativeRightsStatus.UNKNOWN,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
    return asset;
  }

  async listAssets(organizationId: string, projectId?: string) {
    return this.prisma.creativeAsset.findMany({
      where: { organizationId, deletedAt: null, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAsset(id: string, organizationId: string) {
    const asset = await this.prisma.creativeAsset.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!asset) throw new NotFoundException('Creative asset not found');
    return asset;
  }

  async updateAsset(id: string, organizationId: string, input: {
    name?: string;
    thumbnailUrl?: string;
    mimeType?: string;
    fileSize?: number;
    metadata?: JsonRecord;
  }) {
    await this.getAsset(id, organizationId);
    await this.assertCreativeInputUrl(input.thumbnailUrl);
    return this.prisma.creativeAsset.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.thumbnailUrl !== undefined ? { thumbnailUrl: input.thumbnailUrl } : {}),
        ...(input.mimeType !== undefined ? { mimeType: input.mimeType } : {}),
        ...(input.fileSize !== undefined ? { fileSize: input.fileSize } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async archiveAsset(id: string, organizationId: string) {
    await this.getAsset(id, organizationId);
    await this.prisma.creativeRightsGrant.updateMany({
      where: { organizationId, resourceType: 'asset', resourceId: id, status: { not: CreativeRightsStatus.REVOKED } },
      data: { status: CreativeRightsStatus.REVOKED, revokedAt: new Date() },
    });
    return this.prisma.creativeAsset.update({
      where: { id },
      data: { status: CreativeAssetStatus.ARCHIVED, rightsStatus: CreativeRightsStatus.REVOKED, deletedAt: new Date() },
    });
  }

  async createProduct(organizationId: string, input: {
    projectId?: string;
    name: string;
    description?: string;
    sku?: string;
    assetIds?: string[];
    metadata?: JsonRecord;
  }) {
    if (input.projectId) await this.getProject(input.projectId, organizationId);
    const assets = input.assetIds?.length
      ? await this.prisma.creativeAsset.count({
          where: { id: { in: input.assetIds }, organizationId, deletedAt: null },
        })
      : 0;
    if (input.assetIds?.length && assets !== input.assetIds.length) {
      throw new BadRequestException('One or more product assets do not belong to this workspace');
    }
    return this.prisma.creativeProduct.create({
      data: {
        organizationId,
        projectId: input.projectId,
        name: input.name.trim(),
        description: input.description,
        sku: input.sku,
        assetIds: input.assetIds || [],
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
  }

  async listProducts(organizationId: string, projectId?: string) {
    return this.prisma.creativeProduct.findMany({
      where: { organizationId, deletedAt: null, ...(projectId ? { projectId } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getProduct(id: string, organizationId: string) {
    const product = await this.prisma.creativeProduct.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Creative product not found');
    return product;
  }

  async updateProduct(id: string, organizationId: string, input: {
    name?: string;
    description?: string;
    sku?: string;
    assetIds?: string[];
    metadata?: JsonRecord;
  }) {
    await this.getProduct(id, organizationId);
    if (input.assetIds) {
      const count = await this.prisma.creativeAsset.count({
        where: { id: { in: input.assetIds }, organizationId, deletedAt: null },
      });
      if (count !== input.assetIds.length) throw new BadRequestException('One or more product assets do not belong to this workspace');
    }
    return this.prisma.creativeProduct.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.assetIds !== undefined ? { assetIds: input.assetIds } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async archiveProduct(id: string, organizationId: string) {
    await this.getProduct(id, organizationId);
    return this.prisma.creativeProduct.update({ where: { id }, data: { status: 'ARCHIVED', deletedAt: new Date() } });
  }

  async createActor(organizationId: string, input: {
    projectId?: string;
    name: string;
    provider?: string;
    externalId?: string;
    category?: string;
    imageUrl?: string;
    previewUrl?: string;
    tags?: string[];
    rightsStatus?: CreativeRightsStatus;
    metadata?: JsonRecord;
  }) {
    if (input.projectId) await this.getProject(input.projectId, organizationId);
    await this.assertCreativeInputUrl(input.imageUrl);
    await this.assertCreativeInputUrl(input.previewUrl);
    if (input.rightsStatus === CreativeRightsStatus.APPROVED) {
      throw new BadRequestException('Approve actor rights through POST /creative/rights with a consent reference');
    }
    return this.prisma.creativeActor.create({
      data: {
        organizationId,
        projectId: input.projectId,
        name: input.name.trim(),
        provider: input.provider,
        externalId: input.externalId,
        category: input.category,
        imageUrl: input.imageUrl,
        previewUrl: input.previewUrl,
        tags: input.tags || [],
        rightsStatus: input.rightsStatus || CreativeRightsStatus.PENDING,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
  }

  async listActors(organizationId: string, projectId?: string, includeUnapproved = false) {
    return this.prisma.creativeActor.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        ...(includeUnapproved ? {} : { rightsStatus: CreativeRightsStatus.APPROVED }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActor(id: string, organizationId: string, includeUnapproved = true) {
    const actor = await this.prisma.creativeActor.findFirst({
      where: { id, organizationId, deletedAt: null, ...(includeUnapproved ? {} : { rightsStatus: CreativeRightsStatus.APPROVED }) },
    });
    if (!actor) throw new NotFoundException('Creative actor not found');
    return actor;
  }

  async updateActor(id: string, organizationId: string, input: {
    name?: string;
    provider?: string;
    externalId?: string;
    category?: string;
    imageUrl?: string;
    previewUrl?: string;
    tags?: string[];
    metadata?: JsonRecord;
  }) {
    await this.getActor(id, organizationId);
    await this.assertCreativeInputUrl(input.imageUrl);
    await this.assertCreativeInputUrl(input.previewUrl);
    return this.prisma.creativeActor.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.provider !== undefined ? { provider: input.provider } : {}),
        ...(input.externalId !== undefined ? { externalId: input.externalId } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.previewUrl !== undefined ? { previewUrl: input.previewUrl } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async archiveActor(id: string, organizationId: string) {
    await this.getActor(id, organizationId);
    await this.prisma.creativeRightsGrant.updateMany({
      where: { organizationId, resourceType: 'actor', resourceId: id, status: { not: CreativeRightsStatus.REVOKED } },
      data: { status: CreativeRightsStatus.REVOKED, revokedAt: new Date() },
    });
    return this.prisma.creativeActor.update({ where: { id }, data: { rightsStatus: CreativeRightsStatus.REVOKED, deletedAt: new Date() } });
  }

  async createVoice(organizationId: string, input: {
    name: string;
    provider?: string;
    externalId?: string;
    language?: string;
    gender?: string;
    previewUrl?: string;
    rightsStatus?: CreativeRightsStatus;
    metadata?: JsonRecord;
  }) {
    await this.assertCreativeInputUrl(input.previewUrl);
    if (input.rightsStatus === CreativeRightsStatus.APPROVED) {
      throw new BadRequestException('Approve voice rights through POST /creative/rights with a consent reference');
    }
    return this.prisma.creativeVoice.create({
      data: {
        organizationId,
        name: input.name.trim(),
        provider: input.provider,
        externalId: input.externalId,
        language: input.language || 'pt-BR',
        gender: input.gender,
        previewUrl: input.previewUrl,
        rightsStatus: input.rightsStatus || CreativeRightsStatus.PENDING,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
  }

  async listVoices(organizationId: string, language?: string, includeUnapproved = false) {
    return this.prisma.creativeVoice.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(language ? { language } : {}),
        ...(includeUnapproved ? {} : { rightsStatus: CreativeRightsStatus.APPROVED }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async getVoice(id: string, organizationId: string, includeUnapproved = true) {
    const voice = await this.prisma.creativeVoice.findFirst({
      where: { id, organizationId, deletedAt: null, ...(includeUnapproved ? {} : { rightsStatus: CreativeRightsStatus.APPROVED }) },
    });
    if (!voice) throw new NotFoundException('Creative voice not found');
    return voice;
  }

  async updateVoice(id: string, organizationId: string, input: {
    name?: string;
    provider?: string;
    externalId?: string;
    language?: string;
    gender?: string;
    previewUrl?: string;
    metadata?: JsonRecord;
  }) {
    await this.getVoice(id, organizationId);
    await this.assertCreativeInputUrl(input.previewUrl);
    return this.prisma.creativeVoice.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.provider !== undefined ? { provider: input.provider } : {}),
        ...(input.externalId !== undefined ? { externalId: input.externalId } : {}),
        ...(input.language !== undefined ? { language: input.language } : {}),
        ...(input.gender !== undefined ? { gender: input.gender } : {}),
        ...(input.previewUrl !== undefined ? { previewUrl: input.previewUrl } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async archiveVoice(id: string, organizationId: string) {
    await this.getVoice(id, organizationId);
    await this.prisma.creativeRightsGrant.updateMany({
      where: { organizationId, resourceType: 'voice', resourceId: id, status: { not: CreativeRightsStatus.REVOKED } },
      data: { status: CreativeRightsStatus.REVOKED, revokedAt: new Date() },
    });
    return this.prisma.creativeVoice.update({ where: { id }, data: { rightsStatus: CreativeRightsStatus.REVOKED, deletedAt: new Date() } });
  }

  async createScript(organizationId: string, projectId: string, input: {
    name?: string;
    brief?: string;
    content?: JsonRecord;
    language?: string;
  }) {
    const project = await this.getProject(projectId, organizationId);
    this.moderation.assertAllowed(`${project.objective || ''}\n${input.brief || ''}\n${JSON.stringify(input.content || {})}`);
    const latest = project.scripts?.[0];
    const version = (latest?.version || 0) + 1;
    const language = input.language || 'pt-BR';
    const content = input.content || (await this.generateScriptContent(
      `${project.objective || ''}\n${input.brief || ''}`,
      language,
      project.maxDurationSec,
    ));
    const scenes = Array.isArray((content as any).scenes) ? (content as any).scenes : [];
    if (!scenes.length) throw new BadRequestException('A script must contain at least one scene');

    const script = await this.prisma.creativeScript.create({
      data: {
        organizationId,
        projectId,
        version,
        name: input.name || `Script v${version}`,
        language,
        source: input.content ? 'USER' : 'AI',
        content: content as Prisma.InputJsonValue,
        totalDurationSec: Number((content as any).totalDurationSec || 0) || null,
        status: 'READY',
        scenes: {
          create: scenes.map((scene: JsonRecord, index: number) => ({
            organizationId,
            sceneIndex: Number.isFinite(scene.index) ? scene.index : index,
            kind: scene.kind || 'TALKING_ACTOR',
            durationSec: Number(scene.durationSec || 5),
            scriptText: scene.voiceoverText || scene.scriptText || scene.body || scene.headline,
            visualPrompt: scene.imagePrompt || scene.visualPrompt,
            brollPrompt: scene.brollPrompt,
            metadata: scene as Prisma.InputJsonValue,
          })),
        },
      },
      include: { scenes: { orderBy: { sceneIndex: 'asc' } } },
    });
    await this.prisma.creativeProject.update({
      where: { id: projectId },
      data: { status: CreativeProjectStatus.SCRIPT_READY },
    });
    return script;
  }

  async reviseScript(organizationId: string, projectId: string, scriptId: string, input: {
    name?: string;
    brief?: string;
    content?: JsonRecord;
    language?: string;
  }) {
    const current = await this.prisma.creativeScript.findFirst({
      where: { id: scriptId, projectId, organizationId },
    });
    if (!current) throw new NotFoundException('Creative script not found');
    return this.createScript(organizationId, projectId, {
      name: input.name || `${current.name} revision`,
      brief: input.brief,
      content: input.content || (current.content as JsonRecord),
      language: input.language || current.language,
    });
  }

  async listScripts(organizationId: string, projectId: string) {
    await this.getProject(projectId, organizationId);
    return this.prisma.creativeScript.findMany({
      where: { projectId, organizationId },
      orderBy: { version: 'desc' },
      include: { scenes: { orderBy: { sceneIndex: 'asc' } } },
    });
  }

  async getScript(organizationId: string, projectId: string, scriptId: string) {
    const script = await this.prisma.creativeScript.findFirst({
      where: { id: scriptId, projectId, organizationId },
      include: { scenes: { orderBy: { sceneIndex: 'asc' } } },
    });
    if (!script) throw new NotFoundException('Creative script not found');
    return script;
  }

  async generateImage(organizationId: string, projectId: string, input: {
    prompt: string;
    name?: string;
    aspectRatio?: string;
    productAssetIds?: string[];
    idempotencyKey?: string;
  }) {
    const prepared = await this.prepareImageJob(organizationId, projectId, input);
    return prepared.run ? prepared.run() : prepared.job;
  }

  // Same validation and provider-input assembly as generateImage, but stops at
  // the reserved job and hands back the deferred `run()` so the carousel path
  // can return immediately and generate in the background.
  private async prepareImageJob(organizationId: string, projectId: string, input: {
    prompt: string;
    name?: string;
    aspectRatio?: string;
    productAssetIds?: string[];
    idempotencyKey?: string;
    // Reference image URLs resolved by the caller (e.g. the org's approved
    // brand logo) rather than looked up from productAssetIds — merged in
    // as-is, no ownership/approval check here since the caller already did it.
    extraImageUrls?: string[];
  }) {
    await this.getProject(projectId, organizationId);
    await this.planLimits?.enforceLimit(organizationId, 'image_generation');
    this.moderation.assertAllowed(input.prompt);
    const providerInput: CreativeProviderInput = {
      prompt: input.prompt,
      aspectRatio: normalizeAspectRatio(input.aspectRatio),
      imageUrls: [
        ...(await this.resolveAssetUrls(organizationId, input.productAssetIds)),
        ...(input.extraImageUrls || []),
      ],
    };
    return this.prepareCreativeJob(organizationId, projectId, {
      capability: 'image-generation',
      input: providerInput,
      variantId: undefined,
      outputType: 'asset',
      assetName: input.name || 'Generated creative image',
      idempotencyKey: input.idempotencyKey,
    });
  }

  // Builds the concrete brand identity injected into every carousel slide so
  // they stay coherent (same brand, same product, same visual world). Pulls
  // from the org's selected Brand Profile + its latest DNA snapshot; falls
  // back to the carousel's own name/brief as the brand name when no profile is
  // selected. Best-effort: any failure yields a minimal identity rather than
  // blocking generation.
  private async buildBrandIdentityBlock(
    organizationId: string,
    fallbackName?: string,
  ): Promise<string> {
    const compact = (value: unknown, max = 240): string => {
      if (!value) return '';
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      const clean = text.replace(/\s+/g, ' ').trim();
      return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
    };

    let brandName = compact(fallbackName, 80);
    const parts: string[] = [];
    try {
      const brand = await this.brandProfiles?.getSelectedBrand(organizationId);
      if (brand?.name) {
        brandName = compact(brand.name, 80);
        if (brand.industry) parts.push(`Industry: ${compact(brand.industry, 80)}.`);
        const dna = await this.brandProfiles?.getLatestDnaSnapshot(brand.id);
        const offer = compact(dna?.offer);
        if (offer) parts.push(`Product / offer: ${offer}`);

        // Concrete brand colours, called out on their own line and phrased as
        // a hard override: the carousel's design-spec palette is a generic
        // starting point (still defaults to the same swatch for every brand
        // until a human customises it), so without this the rendered art
        // drifts away from the brand's real colours. Doing this once here and
        // folding it into the identity block that's already injected
        // identically into every slide (see compileDesignPrompt) keeps every
        // slide's palette pinned to the same real brand colours.
        const visual = dna?.visual as { colors?: unknown; style?: unknown; imageryStyle?: unknown } | undefined;
        const colors = Array.isArray(visual?.colors)
          ? (visual!.colors as unknown[]).map((c) => String(c).trim()).filter(Boolean).slice(0, 4)
          : [];
        if (colors.length) {
          parts.push(
            `Primary brand colours (use these as the dominant background/accent colours on every slide; they take priority over any generic palette suggestion): ${colors.join(', ')}.`
          );
        }

        // A single, concrete rendering-style directive — the visual style
        // "signature" for this carousel. Phrased so the exact same sentence
        // lands on every slide (this whole block is injected verbatim into
        // each independent slide generation), which is what keeps a
        // photography-style carousel from drifting into illustration (or a
        // different subject/product) halfway through.
        const styleHint = compact(visual?.style, 120) || compact(visual?.imageryStyle, 120);
        parts.push(
          styleHint
            ? `Visual style signature (render every slide in this exact same style, do not vary it slide to slide): ${styleHint}.`
            : 'Visual style signature: pick ONE rendering style (e.g. clean product photography, or flat editorial illustration) on the first slide and reuse that exact same style, lighting and mood on every other slide — never mix photography and illustration within one carousel.'
        );
      }
    } catch {
      // best-effort — fall through to the name-only identity below
    }

    const nameLine = brandName
      ? `Brand name (render only as a plain-text wordmark, never an icon or emblem): ${brandName}.`
      : 'This carousel represents a single brand. Use one consistent, plain-text brand wordmark on every slide.';

    return [nameLine, ...parts].join('\n');
  }

  // Just the brand's DNA colour swatches, used to seed the default designSpec
  // for headless carousels (see buildDefaultCarouselDesignSpec). Kept separate
  // from buildBrandIdentityBlock — which returns a prose block, not raw data —
  // and best-effort like it: a missing brand or snapshot must never block
  // generation.
  private async getBrandDnaColors(organizationId: string): Promise<string[]> {
    try {
      const brand = await this.brandProfiles?.getSelectedBrand(organizationId);
      if (!brand?.id) return [];
      const dna = await this.brandProfiles?.getLatestDnaSnapshot(brand.id);
      const visual = dna?.visual as { colors?: unknown } | undefined;
      return Array.isArray(visual?.colors)
        ? (visual!.colors as unknown[]).map((c) => String(c).trim()).filter(Boolean).slice(0, 4)
        : [];
    } catch {
      return [];
    }
  }

  // Best-effort reference image for brand anchoring (Studio "professional
  // carousel" improvement): the org's approved logo/product BrandAsset,
  // fetched once per carousel and handed to every slide as an extra
  // `imageUrls` reference so independently-generated slides converge on the
  // real brand's colours/shapes instead of inventing them from a text
  // description alone. Never blocks generation — returns [] on any failure.
  private async resolveBrandReferenceImageUrls(organizationId: string): Promise<string[]> {
    try {
      const brand = await this.brandProfiles?.getSelectedBrand(organizationId);
      if (!brand?.id) return [];
      const assets = await this.brandProfiles?.getAssets(brand.id, 'logo');
      return (assets || [])
        .filter((asset: { approved?: boolean; sourceUrl?: string | null }) => asset.approved && asset.sourceUrl)
        .slice(0, 1)
        .map((asset: { sourceUrl?: string | null }) => asset.sourceUrl as string);
    } catch {
      return [];
    }
  }

  /**
   * Single source of truth for turning an approved carousel into real slide
   * images: used by both the chat tool and the Studio's "generate images"
   * button. The button path exists because the agent reliably fails to chain
   * this call on its own after a renderAndWaitForResponse click — the
   * browser already holds every input this needs (slides, designSpec,
   * imagePrompt per slide), so there is nothing for the model to add here.
   */
  async generateCarouselImages(organizationId: string, input: {
    projectId?: string;
    name?: string;
    brief?: string;
    prompt?: string;
    aspectRatio?: string;
    designSpec?: Record<string, unknown>;
    idempotencyKey?: string;
    slides: Array<{
      id?: string;
      index?: number;
      headline?: string;
      body?: string;
      cta?: string;
      imagePrompt: string;
      aspectRatio?: string;
    }>;
  }) {
    if (!input.slides?.length) {
      throw new BadRequestException('slides are required for carousel image generation');
    }
    const project = input.projectId
      ? { id: input.projectId }
      : await this.createProject(organizationId, {
          name: input.name || 'ContentFlow carousel creation',
          objective: input.brief || input.prompt || 'Carousel image generation',
          aspectRatio: input.aspectRatio,
        });
    // Build one brand identity and hand it to every slide. Each slide image is
    // generated in its own independent provider request, so without this shared
    // block every slide invented a different brand + product (a jewelry brand
    // on one slide, a skincare brand on the next). Sourced from the org's
    // selected Brand Profile; folded into the content hash via the compiled
    // prompt, so changing brands correctly forces a regeneration.
    let brandIdentity = await this.buildBrandIdentityBlock(organizationId, input.name || input.brief);
    // Best-effort reference image for real-brand anchoring. When present, it
    // must not fight the logo rule above (which mandates a plain-text
    // wordmark) — the source logo asset is frequently a graphic icon, so we
    // spell out that the reference is for colour/shape/material continuity
    // only, never for literally recreating that icon.
    const referenceImageUrls = await this.resolveBrandReferenceImageUrls(organizationId);
    if (referenceImageUrls.length) {
      brandIdentity = `${brandIdentity}\nA reference image of the real brand logo is attached. Use it ONLY to match the brand's real colours, shapes and materials — never recreate it as a graphic icon; the wordmark is still plain text only, per the logo rule.`;
    }
    // The Studio frontend always sends a full designSpec (the design editor
    // builds it); headless callers — the /mcp-studio agent — send none, which
    // dropped the entire [APPROVED DESIGN SPEC] block from every slide and let
    // layout/typography/art-direction drift image to image. Synthesise the
    // same default the editor would (seeded with the brand's real colours) so a
    // headless carousel is as cohesive as an in-platform one.
    const designSpec = input.designSpec ?? buildDefaultCarouselDesignSpec({
      aspectRatio: input.aspectRatio,
      brandColors: await this.getBrandDnaColors(organizationId),
    });
    const jobs: Array<{ slideId?: string; slideIndex: number; job?: unknown; error?: string }> = [];
    const runners: Array<() => Promise<unknown>> = [];
    for (const [i, slide] of input.slides.entries()) {
      const slideIndex = slide.index ?? i;
      try {
        // Omitting idempotencyKey (rather than defaulting to a fixed string)
        // lets prepareCreativeJob fall through to its own content hash of
        // {organizationId, projectId, prompt, aspectRatio, assetName}: an
        // unmodified slide regenerated against the same project — the common
        // case of "I only edited slide 3, why did all 5 bill again" —
        // resolves to the same hash and returns the cached job for free.
        // Editing the copy/design changes the compiled prompt, which changes
        // the hash, which correctly forces a fresh generation.
        const slideJobInput = {
          prompt: compileDesignPrompt(slide.imagePrompt, designSpec, slide, brandIdentity),
          name: `${input.name || 'Carousel'} slide ${slideIndex + 1}`,
          aspectRatio: slide.aspectRatio || input.aspectRatio,
          idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}:${slide.id || slideIndex + 1}` : undefined,
          extraImageUrls: referenceImageUrls,
        };
        const prepared = await this.prepareImageJob(organizationId, project.id, slideJobInput);
        jobs.push({ slideId: slide.id, slideIndex, job: prepared.job });
        // A cached (already-succeeded) slide has no run closure; only queue the
        // ones that still need the provider. Wrap with a single automatic
        // retry: prepareCreativeJob's own idempotency re-queues a FAILED job
        // under the same key (see prepareCreativeJob below), so re-preparing
        // with identical slideJobInput after a transient provider failure
        // picks the same job back up instead of creating a duplicate. This is
        // a completion/integrity retry, not a visual-quality judge — a slide
        // that fails outright (provider error, timeout) gets one more real
        // attempt before being left as a genuine failure the user can retry.
        if (prepared.run) {
          const firstRun = prepared.run;
          runners.push(async () => {
            try {
              await firstRun();
              await this.redriveRetryableJob(prepared.job.id, organizationId);
            } catch (error) {
              this.logger.warn(`Carousel slide ${slideIndex + 1} failed, retrying once: ${this.errorMessage(error)}`);
              const retried = await this.prepareImageJob(organizationId, project.id, slideJobInput);
              if (retried.run) {
                await retried.run();
                await this.redriveRetryableJob(retried.job.id, organizationId);
              }
            }
          });
        }
      } catch (error) {
        // One slide failing a content-moderation, reservation or provider check
        // should not discard the images already generated for the rest of the
        // carousel.
        jobs.push({ slideId: slide.id, slideIndex, error: this.errorMessage(error) });
      }
    }
    // Each slide image takes ~1-2 minutes to render — far longer than any HTTP
    // request (or the fronting nginx, ~60s by default) will stay open. Reserving
    // the jobs above is fast; here we hand the actual generation to a background
    // task and return the reserved jobs immediately, so the Studio can poll each
    // job to completion instead of the request dying at the proxy while the work
    // continues server-side (which billed credits for images the client never
    // received). The reservations already hold the credits, so a crash between
    // now and completion leaves a RESERVED job the client can still poll.
    if (runners.length) {
      void this.runJobsSequentially(runners);
    }
    return { projectId: project.id, jobs, slides: input.slides };
  }

  async generateVoicePreview(organizationId: string, projectId: string, input: {
    voiceId: string;
    text: string;
    language?: string;
    durationSec?: number;
    idempotencyKey?: string;
  }) {
    await this.getProject(projectId, organizationId);
    this.moderation.assertAllowed(input.text);
    const providerInput = await this.buildProviderInput(organizationId, projectId, {
      voiceId: input.voiceId,
      language: input.language,
      durationSec: input.durationSec,
      prompt: input.text,
    });
    providerInput.script = input.text;
    providerInput.prompt = input.text;
    const job = await this.executeCreativeJob(organizationId, projectId, {
      capability: 'text-to-speech',
      input: providerInput,
      outputType: 'asset',
      assetName: `Voice preview ${input.voiceId}`,
      idempotencyKey: input.idempotencyKey,
    });
    const output = (job.output || {}) as JsonRecord;
    if (job.status !== CreativeJobStatus.SUCCEEDED) {
      throw new BadRequestException(`Voice preview generation failed: ${(job as any).error || 'unknown provider error'}`);
    }
    if (output.url) {
      await this.prisma.creativeVoice.updateMany({
        where: { id: input.voiceId, organizationId, deletedAt: null },
        data: { previewUrl: output.url },
      });
    }
    return job;
  }

  async quoteVariant(organizationId: string, projectId: string, input: {
    capability?: CreativeCapability;
    durationSec?: number;
    provider?: string;
    prompt?: string;
    actorId?: string;
    voiceId?: string;
    scriptId?: string;
    productAssetIds?: string[];
    audioUrl?: string;
    videoUrl?: string;
    language?: string;
    aspectRatio?: string;
  }) {
    await this.getProject(projectId, organizationId);
    const providerInput = await this.buildProviderInput(organizationId, projectId, input);
    const capability = input.capability || 'talking-actor';
    if (['talking-actor', 'actor-replacement'].includes(capability) && !input.actorId) {
      throw new BadRequestException(`Capability ${capability} requires an approved actor`);
    }
    const quote = this.providers.quote(capability, providerInput, input.provider);
    const balance = await this.credits.getBalance(organizationId);
    return { quote, balance, canGenerate: balance.balance >= quote.estimatedCredits };
  }

  async quoteVariantMatrix(organizationId: string, projectId: string, input: {
    capability?: CreativeCapability;
    actorIds?: string[];
    voiceIds?: string[];
    languages?: string[];
    aspectRatios?: string[];
    prompts?: string[];
    provider?: string;
    maxItems?: number;
  }) {
    await this.getProject(projectId, organizationId);
    const capability = input.capability || 'talking-actor';
    if (['talking-actor', 'actor-replacement'].includes(capability) && !input.actorIds?.length) {
      throw new BadRequestException(`Capability ${capability} requires at least one approved actor`);
    }
    const combinations = this.buildVariantMatrix(input);
    const items = [];
    let estimatedCredits = 0;
    for (const combination of combinations) {
      const providerInput = await this.buildProviderInput(organizationId, projectId, combination);
      const quote = this.providers.quote(capability, providerInput, input.provider);
      estimatedCredits += quote.estimatedCredits;
      items.push({ combination, quote });
    }
    const balance = await this.credits.getBalance(organizationId);
    return {
      count: items.length,
      estimatedCredits,
      balance,
      canGenerate: balance.balance >= estimatedCredits,
      items,
    };
  }

  async generateVariantMatrix(organizationId: string, projectId: string, input: {
    capability?: CreativeCapability;
    actorIds?: string[];
    voiceIds?: string[];
    languages?: string[];
    aspectRatios?: string[];
    prompts?: string[];
    provider?: string;
    maxItems?: number;
    idempotencyKey?: string;
  }) {
    const quote = await this.quoteVariantMatrix(organizationId, projectId, input);
    if (!quote.canGenerate) {
      throw new BadRequestException(`Insufficient creative credits for matrix: ${quote.estimatedCredits} required`);
    }
    const jobs = [];
    const errors = [];
    for (let index = 0; index < quote.items.length; index += 1) {
      const combination = quote.items[index].combination;
      try {
        jobs.push(await this.generateVariant(organizationId, projectId, {
          capability: input.capability,
          provider: input.provider,
          actorId: combination.actorId,
          voiceId: combination.voiceId,
          language: combination.language,
          aspectRatio: combination.aspectRatio,
          prompt: combination.prompt,
          idempotencyKey: `${input.idempotencyKey || `matrix:${projectId}`}:${index}`,
        }));
      } catch (error) {
        errors.push({ index, error: this.errorMessage(error) });
      }
    }
    return { count: quote.items.length, jobs, errors, estimatedCredits: quote.estimatedCredits };
  }

  async generateVariant(organizationId: string, projectId: string, input: {
    capability?: CreativeCapability;
    provider?: string;
    actorId?: string;
    voiceId?: string;
    scriptId?: string;
    productAssetIds?: string[];
    audioUrl?: string;
    videoUrl?: string;
    language?: string;
    aspectRatio?: string;
    durationSec?: number;
    prompt?: string;
    idempotencyKey?: string;
  }) {
    const project = await this.getProject(projectId, organizationId);
    this.moderation.assertAllowed(`${project.objective || ''}\n${input.prompt || ''}`);
    const script = input.scriptId
      ? await this.prisma.creativeScript.findFirst({ where: { id: input.scriptId, projectId, organizationId }, include: { scenes: { orderBy: { sceneIndex: 'asc' } } } })
      : project.scripts?.[0];
    if (input.scriptId && !script) throw new NotFoundException('Creative script not found');
    if (!script && !input.prompt) throw new BadRequestException('Create a script or provide a prompt first');
    const capability = input.capability || 'talking-actor';
    if (['talking-actor', 'actor-replacement'].includes(capability) && !input.actorId) {
      throw new BadRequestException(`Capability ${capability} requires an approved actor`);
    }
    const providerInput = await this.buildProviderInput(organizationId, projectId, input);
    const quote = this.providers.quote(capability, providerInput, input.provider);
    await this.assertCreativeAccess(organizationId, capability, quote.model, providerInput);
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ organizationId, projectId, capability, input: providerInput }))
      .digest('hex');
    const idempotencyKey = input.idempotencyKey
      ? scopeCreativeIdempotencyKey(organizationId, input.idempotencyKey)
      : `creative:${fingerprint}`;
    const existingJob = await this.prisma.creativeJob.findUnique({ where: { idempotencyKey } });
    if (existingJob) return this.getJob(existingJob.id, organizationId);
    if (capability === 'video-generation' || capability === 'b-roll') {
      await this.planLimits?.enforceLimit(organizationId, 'video_generation');
    }
    await this.credits.assertConcurrencyQuota(organizationId);

    const variant = await this.prisma.creativeVariant.create({
      data: {
        organizationId,
        projectId,
        scriptId: script?.id,
        actorId: input.actorId,
        voiceId: input.voiceId,
        language: input.language || script?.language || 'pt-BR',
        format: normalizeAspectRatio(input.aspectRatio || project.aspectRatio),
        status: 'QUEUED',
        metadata: { capability, provider: input.provider } as Prisma.InputJsonValue,
      },
    });
    const job = await this.prisma.creativeJob.create({
      data: {
        organizationId,
        projectId,
        variantId: variant.id,
        type: capability,
        status: CreativeJobStatus.QUEUED,
        provider: quote.provider,
        model: quote.model,
        input: { ...providerInput, capability, provider: input.provider } as Prisma.InputJsonValue,
        costEstimate: quote.estimatedCredits,
        idempotencyKey,
      },
    });
    try {
      const reservation = await this.credits.reserve(organizationId, quote.estimatedCredits, {
        projectId,
        jobId: job.id,
        idempotencyKey: `reservation:${job.id}`,
        metadata: { capability, provider: quote.provider },
      });
      await this.prisma.creativeJob.update({
        where: { id: job.id },
        data: { status: CreativeJobStatus.RESERVED, input: { ...providerInput, capability, provider: input.provider, reservationId: reservation.id } as Prisma.InputJsonValue },
      });
      await this.prisma.creativeVariant.update({ where: { id: variant.id }, data: { status: 'QUEUED' } });
      void this.dispatchJob(job.id, organizationId);
      return this.getJob(job.id, organizationId);
    } catch (error) {
      await this.prisma.creativeJob.update({ where: { id: job.id }, data: { status: CreativeJobStatus.FAILED, error: this.errorMessage(error) } });
      await this.prisma.creativeVariant.update({ where: { id: variant.id }, data: { status: 'FAILED' } });
      throw error;
    }
  }

  async localizeVariant(organizationId: string, projectId: string, variantId: string, input: {
    targetLanguage: string;
    capability?: CreativeCapability;
    provider?: string;
    idempotencyKey?: string;
  }) {
    const variant = await this.prisma.creativeVariant.findFirst({
      where: { id: variantId, projectId, organizationId },
    });
    if (!variant) throw new NotFoundException('Creative variant not found');
    if (!input.targetLanguage?.trim()) throw new BadRequestException('Target language is required');

    const sourceScript = variant.scriptId
      ? await this.prisma.creativeScript.findFirst({
          where: { id: variant.scriptId, projectId, organizationId },
          include: { scenes: { orderBy: { sceneIndex: 'asc' } } },
        })
      : null;
    if (!sourceScript) throw new BadRequestException('The source variant has no script to localize');

    const sourceContent = (sourceScript.content || {}) as JsonRecord;
    const sourceScenes: JsonRecord[] = Array.isArray(sourceContent.scenes) && sourceContent.scenes.length
      ? sourceContent.scenes as JsonRecord[]
      : sourceScript.scenes.map((scene: any) => ({
          index: scene.sceneIndex,
          durationSec: scene.durationSec,
          voiceoverText: scene.scriptText || '',
          imagePrompt: scene.visualPrompt || '',
          brollPrompt: scene.brollPrompt || '',
        })) as JsonRecord[];
    const sourceText = sourceScenes
      .map((scene) => String(scene.voiceoverText || scene.scriptText || scene.body || scene.headline || '').trim())
      .join('\n---SCENE_BREAK---\n');
    if (!sourceText.trim()) throw new BadRequestException('The source script has no translatable text');
    this.moderation.assertAllowed(sourceText);

    const keyBase = input.idempotencyKey || createHash('sha256')
      .update(JSON.stringify({ organizationId, projectId, variantId, targetLanguage: input.targetLanguage, provider: input.provider }))
      .digest('hex');
    const translationJob = await this.executeCreativeJob(organizationId, projectId, {
      capability: 'translation',
      input: {
        prompt: `Translate this advertising script to ${input.targetLanguage}. Preserve the marker ---SCENE_BREAK--- exactly between scenes, preserve CTA intent and timing. Return only the translated script.`,
        script: sourceText,
        language: input.targetLanguage,
        metadata: { targetLanguage: input.targetLanguage, sourceVariantId: variantId, sourceScriptId: sourceScript.id },
      },
      outputType: 'asset',
      assetName: `Translated script ${input.targetLanguage}`,
      idempotencyKey: `${keyBase}:translation`,
    });
    if (translationJob.status !== CreativeJobStatus.SUCCEEDED) {
      throw new BadRequestException(`Translation failed: ${(translationJob as any).error || 'unknown provider error'}`);
    }
    const translatedText = String(((translationJob.output || {}) as JsonRecord).metadata?.translatedText || '').trim();
    if (!translatedText) throw new BadRequestException('Translation provider returned no translated text');

    const translatedParts = translatedText.includes('---SCENE_BREAK---')
      ? translatedText.split(/\s*---SCENE_BREAK---\s*/g).map((part) => part.trim())
      : translatedText.split(/\n+/).map((part) => part.trim()).filter(Boolean);
    const translatedScenes = sourceScenes.map((scene, index) => {
      const text = translatedParts[index] || translatedParts[translatedParts.length - 1] || String(scene.voiceoverText || '');
      return { ...scene, voiceoverText: text, scriptText: text };
    });
    const translatedScript = await this.createScript(organizationId, projectId, {
      name: `${sourceScript.name} — ${input.targetLanguage}`,
      language: input.targetLanguage,
      content: {
        ...sourceContent,
        language: input.targetLanguage,
        sourceScriptId: sourceScript.id,
        sourceVariantId: variantId,
        scenes: translatedScenes,
      },
    });

    const metadata = (variant.metadata || {}) as JsonRecord;
    const capability = input.capability || (metadata.capability as CreativeCapability | undefined) || 'talking-actor';
    const generated = await this.generateVariant(organizationId, projectId, {
      capability,
      provider: input.provider,
      scriptId: translatedScript.id,
      actorId: variant.actorId || undefined,
      voiceId: variant.voiceId || undefined,
      language: input.targetLanguage,
      aspectRatio: variant.format,
      idempotencyKey: `${keyBase}:render`,
    });
    return { translationJob, script: translatedScript, job: generated };
  }

  async getJob(id: string, organizationId: string) {
    const job = await this.prisma.creativeJob.findFirst({
      where: { id, organizationId },
      include: { attemptRecords: { orderBy: { attempt: 'asc' } } },
    });
    if (!job) throw new NotFoundException('Creative job not found');
    return job;
  }

  async listJobs(organizationId: string) {
    return this.prisma.creativeJob.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // Persists the images generated for a Studio chat carousel card so the card
  // can re-hydrate them after the user leaves and returns. Keyed by a stable
  // hash of the card's payload (`cardKey`), one row per slide, upserted so a
  // regenerated slide simply overwrites its previous URL.
  //
  // `carouselProjectId` is an optional, additive link to a saved
  // CarouselProject (see docs/studio-audit.md, item B1): when the caller
  // knows it, it's stored alongside cardKey on the same row (not a second
  // row), so the images become findable by either identifier. cardKey stays
  // required and remains the only identifier a caller needs before a
  // carousel has ever been saved.
  async saveStudioCarouselImages(
    organizationId: string,
    cardKey: string,
    images: Array<{ slideId?: string; imageUrl?: string }> = [],
    carouselProjectId?: string,
  ) {
    const raw = String(cardKey || '').trim();
    if (!raw) throw new BadRequestException('cardKey is required');
    // Hash to a fixed length so an arbitrarily long card signature never
    // overflows the composite unique btree index.
    const key = createHash('sha256').update(raw).digest('hex');
    const projectId = carouselProjectId?.trim() || undefined;
    const clean = (images || [])
      .filter((item) => item && item.slideId && item.imageUrl)
      .map((item) => ({ slideId: String(item.slideId), imageUrl: String(item.imageUrl) }));
    await Promise.all(
      clean.map((item) =>
        this.prisma.studioCarouselImage.upsert({
          where: {
            organizationId_cardKey_slideId: {
              organizationId,
              cardKey: key,
              slideId: item.slideId,
            },
          },
          create: { organizationId, cardKey: key, carouselProjectId: projectId, slideId: item.slideId, imageUrl: item.imageUrl },
          update: { imageUrl: item.imageUrl, ...(projectId ? { carouselProjectId: projectId } : {}) },
        }),
      ),
    );
    return { saved: clean.length };
  }

  async getStudioCarouselImages(organizationId: string, cardKey: string, carouselProjectId?: string) {
    const raw = String(cardKey || '').trim();
    const projectId = carouselProjectId?.trim() || undefined;
    if (!raw && !projectId) return { images: [] as Array<{ slideId: string; imageUrl: string }> };
    const key = raw ? createHash('sha256').update(raw).digest('hex') : undefined;
    // Matches on either identifier so a caller that only knows the
    // carouselProjectId (post-save) still finds images saved back when only
    // cardKey was known, and vice versa.
    const rows = await this.prisma.studioCarouselImage.findMany({
      where: {
        organizationId,
        OR: [...(key ? [{ cardKey: key }] : []), ...(projectId ? [{ carouselProjectId: projectId }] : [])],
      },
      orderBy: { updatedAt: 'desc' },
    });
    return { images: rows.map((row) => ({ slideId: row.slideId, imageUrl: row.imageUrl })) };
  }

  async listVariants(organizationId: string, projectId?: string) {
    return this.prisma.creativeVariant.findMany({
      where: { organizationId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { publications: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  }

  async getVariant(id: string, organizationId: string) {
    const variant = await this.prisma.creativeVariant.findFirst({
      where: { id, organizationId },
      include: { publications: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!variant) throw new NotFoundException('Creative variant not found');
    return variant;
  }

  async getVariantDownload(id: string, organizationId: string) {
    const variant = await this.getVariant(id, organizationId);
    if (!variant.videoUrl && !variant.captionsUrl) {
      throw new BadRequestException('Creative variant has no downloadable output');
    }
    return {
      variantId: variant.id,
      status: variant.status,
      videoUrl: variant.videoUrl,
      thumbnailUrl: variant.thumbnailUrl,
      captionsUrl: variant.captionsUrl,
      expiresAt: null as string | null,
    };
  }

  async cancelJob(id: string, organizationId: string) {
    const job = await this.getJob(id, organizationId);
    const terminalStatuses = new Set<CreativeJobStatus>([CreativeJobStatus.SUCCEEDED, CreativeJobStatus.FAILED, CreativeJobStatus.REFUNDED, CreativeJobStatus.CANCELLED]);
    if (terminalStatuses.has(job.status)) return job;
    const providerInput = job.input as JsonRecord;
    if (providerInput?.capability && job.provider) {
      try {
        await this.providers.cancel(providerInput.capability as CreativeCapability, providerInput as CreativeProviderInput, job.provider);
      } catch (error) {
        this.logger.warn(`Creative provider cancellation failed for ${id}: ${this.errorMessage(error)}`);
      }
    }
    const reservationId = (job.input as JsonRecord)?.reservationId;
    if (reservationId) await this.credits.refund(reservationId, 'user-cancelled');
    return this.prisma.creativeJob.update({ where: { id }, data: { status: CreativeJobStatus.CANCELLED, completedAt: new Date() } });
  }

  async getCreditBalance(organizationId: string) {
    return this.credits.getBalance(organizationId);
  }

  async getMetrics(organizationId: string, days = 30) {
    return this.metrics.summary(organizationId, days);
  }

  async listCreditLedger(organizationId: string, limit?: number) {
    return this.credits.list(organizationId, limit);
  }

  async reconcileCredits(organizationId: string) {
    return this.credits.reconcile(organizationId);
  }

  private async executeJob(jobId: string, organizationId: string) {
    const job = await this.getJob(jobId, organizationId);
    const terminalStatuses = new Set<CreativeJobStatus>([CreativeJobStatus.CANCELLED, CreativeJobStatus.SUCCEEDED, CreativeJobStatus.REFUNDED]);
    if (terminalStatuses.has(job.status)) return job;
    const input = job.input as unknown as CreativeProviderInput & JsonRecord;
    const attemptNumber = Number(job.attempts || 0) + 1;
    await this.prisma.creativeJob.update({ where: { id: jobId }, data: { status: CreativeJobStatus.RUNNING, startedAt: new Date(), progress: 5, attempts: { increment: 1 } } });
    let attemptRecord: { id: string } | null = null;
    try {
      attemptRecord = await this.prisma.creativeJobAttempt.create({
        data: { jobId, attempt: attemptNumber, provider: job.provider, model: job.model },
        select: { id: true },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        attemptRecord = await this.prisma.creativeJobAttempt.findUnique({ where: { jobId_attempt: { jobId, attempt: attemptNumber } }, select: { id: true } });
      } else {
        throw error;
      }
    }
    if (job.variantId) await this.prisma.creativeVariant.update({ where: { id: job.variantId }, data: { status: 'GENERATING' } });
    if (job.projectId) {
      await this.prisma.creativeProject.update({ where: { id: job.projectId }, data: { status: CreativeProjectStatus.GENERATING } });
    }

    try {
      let output = await this.providers.generate(input.capability as CreativeCapability, input, input.provider);
      this.outputValidation.validate(input.capability as CreativeCapability, output);
      const latestJob = await this.getJob(jobId, organizationId);
      if (latestJob.status === CreativeJobStatus.CANCELLED || latestJob.status === CreativeJobStatus.REFUNDED) {
        if (attemptRecord) await this.prisma.creativeJobAttempt.update({ where: { id: attemptRecord.id }, data: { status: 'CANCELLED', completedAt: new Date() } });
        this.logger.warn(`Creative job ${jobId} completed after cancellation; output discarded`);
        return null;
      }
      output = await this.outputStorage.persist(output, { jobId, capability: input.capability as CreativeCapability });
      const actual = job.costEstimate || 0;
      const reservationId = input.reservationId;
      if (reservationId) await this.credits.settle(reservationId, actual);
      if (this.pricingCatalog) {
        try {
          const financialQuote = await this.pricingCatalog.quote({
            capability: input.capability as CreativeCapability,
            model: output.model || job.model || undefined,
            durationSec: input.durationSec,
            resolution: String(input.metadata?.resolution || ''),
            hasInput: Boolean(input.imageUrls?.length || input.videoUrl),
            metadata: input.metadata,
          });
          await this.pricingCatalog.recordProviderCost({
            organizationId,
            provider: output.provider,
            model: output.model,
            operation: input.capability as string,
            providerRequestId: String(output.metadata?.providerTaskId || ''),
            estimatedCostUsd: financialQuote.providerCostUsd,
            actualCostUsd: financialQuote.providerCostUsd,
            costBrlCents: financialQuote.providerCostBrl ? Math.ceil(financialQuote.providerCostBrl * 100) : undefined,
            creditsCharged: actual,
            input: { durationSec: input.durationSec, resolution: input.metadata?.resolution, hasInput: Boolean(input.imageUrls?.length || input.videoUrl) },
          });
        } catch (costError) {
          this.logger.warn(`Provider cost record failed for ${jobId}: ${this.errorMessage(costError)}`);
        }
      }
      const outputJson = JSON.parse(JSON.stringify(output)) as Prisma.InputJsonValue;
      await this.prisma.creativeJob.update({ where: { id: jobId }, data: { status: CreativeJobStatus.SUCCEEDED, progress: 100, output: outputJson, costActual: actual, completedAt: new Date() } });
      if (attemptRecord) await this.prisma.creativeJobAttempt.update({ where: { id: attemptRecord.id }, data: { status: 'SUCCEEDED', completedAt: new Date(), output: outputJson } });
      if (job.variantId) {
        await this.prisma.creativeVariant.update({ where: { id: job.variantId }, data: { status: 'READY', videoUrl: output.url, thumbnailUrl: output.thumbnailUrl, output: outputJson } });
      }
      if (job.projectId) await this.prisma.creativeProject.update({ where: { id: job.projectId }, data: { status: CreativeProjectStatus.REVIEW } });
      await this.webhooks.emit(organizationId, 'creative.job.completed', { jobId, projectId: job.projectId, variantId: job.variantId, output });
      await this.prisma.creativeProvenance.create({
        data: {
          organizationId,
          projectId: job.projectId,
          variantId: job.variantId,
          operation: input.capability,
          provider: output.provider,
          model: output.model,
          inputHash: createHash('sha256').update(JSON.stringify(input)).digest('hex'),
          data: JSON.parse(JSON.stringify({ input, output })) as Prisma.InputJsonValue,
        },
      });
      await this.metrics.record({
        organizationId,
        projectId: job.projectId,
        jobId,
        event: 'creative.job.completed',
        provider: output.provider,
        model: output.model,
        value: actual,
        metadata: { durationMs: Date.now() - job.createdAt.getTime() },
      });
      return output;
    } catch (error: any) {
      const message = this.errorMessage(error);
      if (attemptRecord) await this.prisma.creativeJobAttempt.update({ where: { id: attemptRecord.id }, data: { status: 'FAILED', error: message, completedAt: new Date() } });
      const maxAttempts = Math.min(5, Math.max(1, Number(process.env.CREATIVE_MAX_ATTEMPTS || 2)));
      if (this.isRetryableProviderError(error) && attemptNumber < maxAttempts) {
        await this.prisma.creativeJob.update({ where: { id: jobId }, data: { status: CreativeJobStatus.RETRYABLE, error: message } });
        await this.metrics.record({ organizationId, projectId: job.projectId, jobId, event: 'creative.job.retryable', value: attemptNumber, provider: job.provider || undefined, model: job.model || undefined, metadata: { error: message, attempt: attemptNumber, maxAttempts } });
        if (process.env.DISABLE_TEMPORAL === 'true') {
          const delay = Math.min(30000, 500 * 2 ** Math.max(0, attemptNumber - 1));
          setTimeout(() => { void this.dispatchJob(jobId, organizationId); }, delay);
        }
        return null;
      }
      const reservationId = input.reservationId;
      if (reservationId) await this.credits.refund(reservationId, message);
      await this.prisma.creativeJob.update({ where: { id: jobId }, data: { status: CreativeJobStatus.FAILED, error: message, completedAt: new Date() } });
      if (job.variantId) await this.prisma.creativeVariant.update({ where: { id: job.variantId }, data: { status: 'FAILED', metadata: { error: message } as Prisma.InputJsonValue } });
      if (job.projectId) await this.prisma.creativeProject.update({ where: { id: job.projectId }, data: { status: CreativeProjectStatus.FAILED } });
      await this.webhooks.emit(organizationId, 'creative.job.failed', { jobId, projectId: job.projectId, variantId: job.variantId, error: message });
      await this.metrics.record({ organizationId, projectId: job.projectId, jobId, event: 'creative.job.failed', value: 1, metadata: { error: message, durationMs: Date.now() - job.createdAt.getTime() } });
      this.logger.error(`Creative job ${jobId} failed: ${message}`);
      return null;
    }
  }

  private async dispatchJob(jobId: string, organizationId: string) {
    if (process.env.DISABLE_TEMPORAL !== 'true') {
      try {
        const raw = this.temporal?.client?.getRawClient();
        if (raw?.workflow?.start) {
          await raw.workflow.start('creativeRenderWorkflow', {
            workflowId: `creative-render-${jobId}`,
            args: [{ jobId, organizationId }],
            taskQueue: 'main',
          });
          return;
        }
      } catch (error) {
        if (String((error as any)?.message || error).toLowerCase().includes('already started')) return;
        this.logger.warn(`Temporal unavailable for creative job ${jobId}; falling back to local execution`);
      }
    }
    void this.executeJob(jobId, organizationId);
  }

  private async executeCreativeJob(organizationId: string, projectId: string, input: {
    capability: CreativeCapability;
    input: CreativeProviderInput;
    variantId?: string;
    outputType: 'asset' | 'variant';
    assetName?: string;
    idempotencyKey?: string;
  }) {
    // Default (synchronous) path: reserve, run the provider to completion, and
    // return the finished job. Preserved for every caller that awaits a single
    // result inline (single image/voice generation, variants, etc.).
    const prepared = await this.prepareCreativeJob(organizationId, projectId, input);
    return prepared.run ? prepared.run() : prepared.job;
  }

  // Reserves credits and returns the job immediately, deferring the slow
  // provider call to the returned `run()` closure. This splits the fast,
  // request-bound work (quota + reservation, milliseconds) from the slow
  // generation (minutes per image), letting callers that must not block an HTTP
  // request — the Studio carousel — return the reserved jobs right away and
  // finish generation in the background while the client polls each job. When
  // the idempotency cache already holds a non-FAILED job there is nothing to
  // run, so `run` is omitted and the cached job is returned as-is.
  private async prepareCreativeJob(organizationId: string, projectId: string, input: {
    capability: CreativeCapability;
    input: CreativeProviderInput;
    variantId?: string;
    outputType: 'asset' | 'variant';
    assetName?: string;
    idempotencyKey?: string;
  }): Promise<{
    job: Awaited<ReturnType<CreativeEngineService['getJob']>>;
    run?: () => Promise<Awaited<ReturnType<CreativeEngineService['getJob']>>>;
  }> {
    const quote = this.providers.quote(input.capability, input.input);
    await this.assertCreativeAccess(organizationId, input.capability, quote.model, input.input);
    const idempotencyKey = input.idempotencyKey
      ? scopeCreativeIdempotencyKey(organizationId, input.idempotencyKey)
      : `creative-output:${createHash('sha256').update(JSON.stringify({ organizationId, projectId, input })).digest('hex')}`;
    const existing = await this.prisma.creativeJob.findUnique({ where: { idempotencyKey } });
    // A FAILED job's reservation was already refunded in executeJob's catch
    // block, so reusing it wastes nothing — but returning it here would also
    // mean a retry could never succeed, since identical content always hashes
    // to the same key. Reset it in place and retry instead (its
    // CreativeJobAttempt rows reference it by id, so delete-and-recreate
    // would violate that foreign key; update-in-place sidesteps that).
    if (existing && existing.status !== CreativeJobStatus.FAILED) {
      return { job: await this.getJob(existing.id, organizationId) };
    }
    await this.credits.assertConcurrencyQuota(organizationId);
    const job = existing
      ? await this.prisma.creativeJob.update({
          where: { id: existing.id },
          data: {
            status: CreativeJobStatus.QUEUED,
            error: null,
            output: Prisma.JsonNull,
            provider: quote.provider,
            model: quote.model,
            input: { ...input.input, capability: input.capability } as Prisma.InputJsonValue,
            costEstimate: quote.estimatedCredits,
            completedAt: null,
          },
        })
      : await this.prisma.creativeJob.create({
          data: {
            organizationId,
            projectId,
            type: input.capability,
            status: CreativeJobStatus.QUEUED,
            provider: quote.provider,
            model: quote.model,
            input: { ...input.input, capability: input.capability } as Prisma.InputJsonValue,
            costEstimate: quote.estimatedCredits,
            idempotencyKey,
          },
        });
    // Reserve synchronously so credits are held before this call returns; a
    // reservation failure (e.g. insufficient credits) marks the job FAILED and
    // propagates, exactly as the old inline path did.
    try {
      const reservation = await this.credits.reserve(organizationId, quote.estimatedCredits, {
        projectId,
        jobId: job.id,
        idempotencyKey: `reservation:${job.id}`,
        metadata: { capability: input.capability },
      });
      await this.prisma.creativeJob.update({ where: { id: job.id }, data: { status: CreativeJobStatus.RESERVED, input: { ...input.input, capability: input.capability, reservationId: reservation.id } as Prisma.InputJsonValue } });
    } catch (error) {
      await this.prisma.creativeJob.update({ where: { id: job.id }, data: { status: CreativeJobStatus.FAILED, error: this.errorMessage(error) } });
      throw error;
    }
    const run = async () => {
      try {
        const output = await this.executeJob(job.id, organizationId);
        if (!output || !('url' in output) || !output.url) return this.getJob(job.id, organizationId);
        if (input.outputType === 'asset') {
          const assetType = input.capability === 'text-to-speech'
            ? CreativeAssetType.AUDIO
            : input.capability === 'image-generation'
              ? CreativeAssetType.IMAGE
              : input.capability === 'captions' || input.capability === 'translation'
                ? CreativeAssetType.OTHER
                : CreativeAssetType.VIDEO;
          await this.prisma.creativeAsset.create({
            data: {
              organizationId,
              projectId,
              type: assetType,
              status: CreativeAssetStatus.READY,
              rightsStatus: CreativeRightsStatus.UNKNOWN,
              name: input.assetName || 'Generated asset',
              url: output.url,
              thumbnailUrl: output.thumbnailUrl,
              metadata: { provider: output.provider, model: output.model, jobId: job.id } as Prisma.InputJsonValue,
            },
          });
        }
        return this.getJob(job.id, organizationId);
      } catch (error) {
        await this.prisma.creativeJob.update({ where: { id: job.id }, data: { status: CreativeJobStatus.FAILED, error: this.errorMessage(error) } });
        throw error;
      }
    };
    return { job: await this.getJob(job.id, organizationId), run };
  }

  // Runs deferred job executors one after another in the background. Each
  // runner already records its own failure onto the job (prepareCreativeJob's
  // closure), so errors are only logged here to avoid an unhandled rejection.
  // Sequential execution preserves the provider's one-image-at-a-time behavior
  // and keeps only a single job RUNNING at any moment.
  private async runJobsSequentially(runners: Array<() => Promise<unknown>>) {
    for (const run of runners) {
      try {
        await run();
      } catch (error) {
        this.logger.warn(`Background creative job failed: ${this.errorMessage(error)}`);
      }
    }
  }

  // executeJob resolves (rather than throwing) leaving the job RETRYABLE when
  // the provider fails transiently, and its built-in re-dispatch only fires
  // under DISABLE_TEMPORAL. Carousel slides never get a Temporal workflow —
  // the sequential runner calls the job directly — so a RETRYABLE slide would
  // stay non-terminal forever and the Studio's poller would give up on it
  // while the job never finished. Redrive it here, still sequentially:
  // executeJob enforces its own attempt cap (CREATIVE_MAX_ATTEMPTS, default 2)
  // and flips the job to FAILED once the attempts are spent, so this loop
  // always terminates.
  private async redriveRetryableJob(jobId: string, organizationId: string) {
    let delayMs = 2000;
    for (;;) {
      const job = await this.getJob(jobId, organizationId);
      if (job.status !== CreativeJobStatus.RETRYABLE) return;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(30000, delayMs * 2);
      await this.executeJob(jobId, organizationId);
    }
  }

  private async assertCreativeAccess(
    organizationId: string,
    capability: CreativeCapability,
    model: string,
    input: CreativeProviderInput,
  ) {
    if (!this.entitlements) return;
    const feature = ['video-generation', 'b-roll', 'talking-actor', 'lip-sync', 'actor-replacement'].includes(capability)
      ? 'video-generation'
      : capability === 'image-generation'
        ? 'image-generation'
        : 'content-ideas';
    await this.entitlements.assertFeature(organizationId, feature);
    const normalized = String(model || '').toLowerCase();
    const resolution = String(input.metadata?.resolution || '').toLowerCase();
    let modelAccess: BillingModelAccessCode = 'text-default';
    if (capability === 'image-generation') modelAccess = resolution.includes('4k') ? 'image-4k' : resolution.includes('2k') ? 'image-2k' : 'image-basic';
    else if (normalized.includes('seedance')) modelAccess = resolution === '480p' ? 'seedance-2.5-480p' : 'seedance-2.5-720p';
    else if (normalized.includes('kling')) modelAccess = 'kling-3.0';
    else if (normalized.includes('veo')) modelAccess = 'veo-3.1';
    else if (['talking-actor', 'lip-sync', 'actor-replacement'].includes(capability)) modelAccess = 'avatar';
    await this.entitlements.assertModel(organizationId, modelAccess);
  }

  private async buildProviderInput(organizationId: string, projectId: string, input: {
    actorId?: string;
    voiceId?: string;
    language?: string;
    aspectRatio?: string;
    durationSec?: number;
    prompt?: string;
    scriptId?: string;
    productAssetIds?: string[];
    audioUrl?: string;
    videoUrl?: string;
  }): Promise<CreativeProviderInput> {
    const project = await this.getProject(projectId, organizationId);
    const script = input.scriptId
      ? await this.prisma.creativeScript.findFirst({ where: { id: input.scriptId, projectId, organizationId }, include: { scenes: { orderBy: { sceneIndex: 'asc' } } } })
      : project.scripts?.[0];
    if (input.scriptId && !script) throw new NotFoundException('Creative script not found');
    const actor = input.actorId
      ? await this.prisma.creativeActor.findFirst({ where: { id: input.actorId, organizationId, deletedAt: null } })
      : null;
    const voice = input.voiceId
      ? await this.prisma.creativeVoice.findFirst({ where: { id: input.voiceId, organizationId, deletedAt: null } })
      : null;
    const actorGrant = actor
      ? await this.prisma.creativeRightsGrant.findFirst({
          where: {
            organizationId,
            resourceType: 'actor',
            resourceId: actor.id,
            status: CreativeRightsStatus.APPROVED,
            OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
          },
        })
      : null;
    const voiceGrant = voice
      ? await this.prisma.creativeRightsGrant.findFirst({
          where: {
            organizationId,
            resourceType: 'voice',
            resourceId: voice.id,
            status: CreativeRightsStatus.APPROVED,
            OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
          },
        })
      : null;
    if (input.actorId && (!actor || actor.rightsStatus !== CreativeRightsStatus.APPROVED || !actorGrant)) {
      throw new BadRequestException('Actor is missing or does not have approved rights');
    }
    if (input.voiceId && (!voice || voice.rightsStatus !== CreativeRightsStatus.APPROVED || !voiceGrant)) {
      throw new BadRequestException('Voice is missing or does not have approved rights');
    }
    const scriptText = script?.scenes?.map((scene: any) => scene.scriptText).filter(Boolean).join('\n') || '';
    const prompt = input.prompt || `${project.objective || 'Create a performance marketing ad'}\n${scriptText}`;
    const projectImageUrls = (project.assets || [])
      .filter((asset: any) => asset.url && asset.type !== 'VOICE' && asset.status === CreativeAssetStatus.READY && asset.rightsStatus === CreativeRightsStatus.APPROVED)
      .map((asset: any) => asset.url);
    const referencedImageUrls = await this.resolveAssetUrls(organizationId, input.productAssetIds);
    return {
      prompt,
      script: scriptText,
      aspectRatio: normalizeAspectRatio(input.aspectRatio || project.aspectRatio),
      durationSec: input.durationSec || script?.totalDurationSec || project.maxDurationSec,
      imageUrls: [...new Set([...referencedImageUrls, ...projectImageUrls])].slice(0, 3),
      audioUrl: input.audioUrl,
      videoUrl: input.videoUrl,
      actor: actor ? { id: actor.id, imageUrl: actor.imageUrl || undefined, externalId: actor.externalId || undefined } : undefined,
      voice: voice ? { id: voice.id, externalId: voice.externalId || undefined, language: voice.language } : undefined,
      language: input.language || script?.language || 'pt-BR',
    };
  }

  private buildVariantMatrix(input: {
    actorIds?: string[];
    voiceIds?: string[];
    languages?: string[];
    aspectRatios?: string[];
    prompts?: string[];
    maxItems?: number;
  }) {
    const actors = input.actorIds?.length ? input.actorIds : [undefined];
    const voices = input.voiceIds?.length ? input.voiceIds : [undefined];
    const languages = input.languages?.length ? input.languages : [undefined];
    const aspectRatios = input.aspectRatios?.length ? input.aspectRatios : [undefined];
    const prompts = input.prompts?.length ? input.prompts : [undefined];
    const maxItems = Math.min(100, Math.max(1, input.maxItems || 20));
    const combinations: Array<{ actorId?: string; voiceId?: string; language?: string; aspectRatio?: string; prompt?: string }> = [];
    for (const actorId of actors) {
      for (const voiceId of voices) {
        for (const language of languages) {
          for (const aspectRatio of aspectRatios) {
            for (const prompt of prompts) {
              combinations.push({ actorId, voiceId, language, aspectRatio, prompt });
              if (combinations.length >= maxItems) return combinations;
            }
          }
        }
      }
    }
    return combinations;
  }

  private async resolveAssetUrls(organizationId: string, assetIds?: string[]) {
    if (!assetIds?.length) return [];
    const assets = await this.prisma.creativeAsset.findMany({
      where: {
        id: { in: assetIds },
        organizationId,
        deletedAt: null,
        status: CreativeAssetStatus.READY,
        rightsStatus: CreativeRightsStatus.APPROVED,
      },
    });
    if (assets.length !== assetIds.length) throw new BadRequestException('One or more assets are invalid');
    if (assets.some((asset) => !asset.url)) throw new BadRequestException('One or more approved assets have no media URL');
    return assets.map((asset) => asset.url) as string[];
  }

  private async generateScriptContent(brief: string, language: string, maxDurationSec: number): Promise<JsonRecord> {
    if (process.env.OPENAI_API_KEY) {
      const slides = await this.openai.generateSlidesFromText(`${brief}\nLanguage: ${language}\nDuration: ${maxDurationSec}s`);
      if (slides?.length) {
        return {
          title: 'Creative ad script',
          language,
          totalDurationSec: Math.min(maxDurationSec, slides.length * 5),
          scenes: slides.map((slide: any, index: number) => ({
            index,
            durationSec: 5,
            headline: index === 0 ? 'Hook' : index === slides.length - 1 ? 'CTA' : `Scene ${index + 1}`,
            voiceoverText: slide.voiceText,
            imagePrompt: slide.imagePrompt,
            transition: index === 0 ? 'cut' : 'crossfade',
          })),
        };
      }
    }
    return {
      title: 'Creative ad script',
      language,
      totalDurationSec: Math.min(maxDurationSec, 20),
      scenes: [
        { index: 0, durationSec: 4, headline: 'Hook', voiceoverText: brief.slice(0, 140), imagePrompt: brief, transition: 'cut' },
        { index: 1, durationSec: 6, headline: 'Benefit', voiceoverText: `Veja como ${brief.slice(0, 100)}`, imagePrompt: `Product showcase: ${brief}`, transition: 'crossfade' },
        { index: 2, durationSec: 5, headline: 'Proof', voiceoverText: 'Uma forma simples de começar hoje.', imagePrompt: `Happy customer using product: ${brief}`, transition: 'crossfade' },
        { index: 3, durationSec: 5, headline: 'CTA', voiceoverText: 'Conheça agora e teste por você.', imagePrompt: `Clean product hero shot: ${brief}`, transition: 'zoom-in' },
      ],
    };
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private async assertCreativeInputUrl(value?: string) {
    if (!value) return;
    if (resolveCreativeLocalUploadPath(value)) return;
    if (!(await isSafePublicHttpsUrl(value))) throw new BadRequestException('Creative media URL must be a public HTTPS URL or a ContentFlow upload');
  }

  private isRetryableProviderError(error: unknown) {
    const candidate = error as any;
    const status = Number(candidate?.status || candidate?.response?.status || 0);
    const message = this.errorMessage(error).toLowerCase();
    return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
      || ['timeout', 'timed out', 'temporarily unavailable', 'econnreset', 'enotfound', 'socket hang up'].some((term) => message.includes(term));
  }
}
