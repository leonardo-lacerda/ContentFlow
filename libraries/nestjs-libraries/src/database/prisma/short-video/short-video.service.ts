import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ShortVideoRepository } from './short-video.repository';
import { ShortVideoStatus, ShortVideoFormat, GenerationJobType } from '@prisma/client';
import { GenerationJobService } from '../generation-jobs/generation-job.service';
import { BrandProfileService } from '../brands/brand-profile.service';
import { CarouselProjectService } from '../carousel-projects/carousel-project.service';
import { VideoScriptGenerateService } from '@gitroom/nestjs-libraries/ai-generate/video-script-generate.service';
import { VIDEO_FORMATS } from '@gitroom/nestjs-libraries/ai-generate/schemas/video-script.schema';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';

@Injectable()
export class ShortVideoService {
  private readonly logger = new Logger(ShortVideoService.name);

  constructor(
    private shortVideoRepository: ShortVideoRepository,
    private generationJobService: GenerationJobService,
    private brandProfileService: BrandProfileService,
    private carouselProjectService: CarouselProjectService,
    private videoScriptGenerateService: VideoScriptGenerateService,
    private planLimitsService: PlanLimitsService,
  ) {}

  async getProjects(orgId: string) {
    return this.shortVideoRepository.findByOrganization(orgId);
  }

  async getProjectsByBrand(brandProfileId: string, status?: ShortVideoStatus) {
    return this.shortVideoRepository.findByBrandProfile(brandProfileId, status);
  }

  async getProject(id: string, orgId: string) {
    const project = await this.shortVideoRepository.findById(id, orgId);
    if (!project) throw new NotFoundException('Short video project not found');
    return project;
  }

  async createProject(orgId: string, data: {
    brandProfileId: string;
    carouselProjectId?: string;
    contentIdeaId?: string;
    name: string;
    format?: string;
    maxDurationSec?: number;
    aspectRatio?: string;
  }) {
    // Validate brand ownership
    await this.brandProfileService.validateBrandOwnership(orgId, data.brandProfileId);

    if (!data.carouselProjectId && !data.contentIdeaId) {
      throw new BadRequestException(
        'Provide carouselProjectId or contentIdeaId'
      );
    }

    // Validate carousel exists when provided
    if (data.carouselProjectId) {
      const carousel = await this.carouselProjectService.getProject(
        data.carouselProjectId,
        orgId
      );
      if (!carousel) throw new NotFoundException('Carousel project not found');
    }

    // Resolve format defaults
    const formatConfig = VIDEO_FORMATS.find(f => f.id === (data.format || 'REELS')) || VIDEO_FORMATS[0];

    return this.shortVideoRepository.create({
      organizationId: orgId,
      brandProfileId: data.brandProfileId,
      carouselProjectId: data.carouselProjectId || null,
      contentIdeaId: data.contentIdeaId || null,
      name: data.name,
      format: formatConfig.id as ShortVideoFormat,
      maxDurationSec: data.maxDurationSec || formatConfig.maxDuration,
      aspectRatio: data.aspectRatio || formatConfig.aspectRatio,
    });
  }

  async generateScript(
    projectId: string,
    orgId: string,
    options: {
      language?: string;
      targetDurationSec?: number;
      style?: string;
    } = {}
  ) {
    await this.planLimitsService.enforceLimit(orgId, 'video_script');
    const project = await this.shortVideoRepository.findById(projectId, orgId);
    if (!project) throw new NotFoundException('Short video project not found');

    // Delegate to the AI generation service
    const script = await this.videoScriptGenerateService.generateVideoScript(orgId, {
      brandProfileId: project.brandProfileId,
      carouselProjectId: project.carouselProjectId || undefined,
      contentIdeaId: project.contentIdeaId || undefined,
      format: project.format,
      maxDuration: options.targetDurationSec || project.maxDurationSec,
      additionalContext: options.style ? `Style: ${options.style}` : undefined,
    });

    // Calculate cost estimate
    const scenes = script.scenes || [];
    const scriptCost = this.estimateScriptCost(scenes.length);

    // Update project with script
    await this.shortVideoRepository.update(projectId, orgId, {
      script: script as any,
      totalDurationSec: script.totalDurationSec,
      status: 'SCRIPT_GENERATED' as ShortVideoStatus,
      scriptCostEstimate: scriptCost,
      totalCostEstimate: scriptCost + (project.renderCostEstimate || 0),
    });

    this.logger.log(`Script generated for project ${projectId}, ${scenes.length} scenes`);

    return {
      script,
      costEstimate: scriptCost,
    };
  }

  async estimateRenderCost(projectId: string, orgId: string, provider: string, voiceId?: string) {
    const project = await this.shortVideoRepository.findById(projectId, orgId);
    if (!project) throw new NotFoundException('Short video project not found');
    if (!project.script) throw new BadRequestException('Script not generated yet');

    const script = project.script as any;
    const sceneCount = script.scenes?.length || 0;
    const duration = project.totalDurationSec || 60;

    // Cost estimation based on provider
    const estimates: Record<string, { baseCost: number; perSceneCost: number; perSecondCost: number }> = {
      'image-text-slides': {
        baseCost: 0.02,
        perSceneCost: 0.01,
        perSecondCost: 0.005,
      },
      'veo3': {
        baseCost: 0.10,
        perSceneCost: 0.15,
        perSecondCost: 0.02,
      },
    };

    const est = estimates[provider] || estimates['image-text-slides'];
    const cost = est.baseCost + (sceneCount * est.perSceneCost) + (duration * est.perSecondCost);

    // Add voice cost if voiceover
    const hasVoiceover = script.scenes?.some((s: any) => s.voiceoverText);
    const voiceCost = hasVoiceover ? duration * 0.003 : 0;

    const totalCost = cost + voiceCost;

    await this.shortVideoRepository.update(projectId, orgId, {
      renderCostEstimate: totalCost,
      renderProvider: provider,
      totalCostEstimate: (project.scriptCostEstimate || 0) + totalCost,
    });

    return {
      provider,
      estimatedCostUsd: Math.round(totalCost * 10000) / 10000,
      voiceCost,
      breakdown: {
        baseCost: est.baseCost,
        sceneCost: sceneCount * est.perSceneCost,
        durationCost: duration * est.perSecondCost,
        voiceCost,
      },
    };
  }

  async renderVideo(
    projectId: string,
    orgId: string,
    options: {
      provider: string;
      voiceId?: string;
      musicStyle?: string;
      includeSubtitles?: boolean;
      maxCostUsd?: number;
    }
  ) {
    const project = await this.shortVideoRepository.findById(projectId, orgId);
    if (!project) throw new NotFoundException('Short video project not found');
    if (!project.script) throw new BadRequestException('Script not generated yet');
    if (project.status !== 'SCRIPT_GENERATED' && project.status !== 'FAILED') {
      throw new BadRequestException(`Cannot render in status: ${project.status}`);
    }

    // Cost check
    const costEstimate = await this.estimateRenderCost(projectId, orgId, options.provider, options.voiceId);
    if (options.maxCostUsd && costEstimate.estimatedCostUsd > options.maxCostUsd) {
      throw new BadRequestException(`Estimated cost ($${costEstimate.estimatedCostUsd}) exceeds max ($${options.maxCostUsd})`);
    }

    // Create render job
    const job = await this.generationJobService.createJob({
      organizationId: project.organizationId,
      brandProfileId: project.brandProfileId,
      carouselProjectId: project.carouselProjectId,
      type: 'VIDEO_GENERATION' as GenerationJobType,
      model: options.provider,
      provider: options.provider,
      promptVersion: '1.0.0',
      schemaVersion: '1.0.0',
      costEstimate: costEstimate.estimatedCostUsd,
      idempotencyKey: `video-render-${projectId}-${Date.now()}`,
    });

    await this.shortVideoRepository.update(projectId, orgId, {
      status: 'RENDERING' as ShortVideoStatus,
      renderJobId: job.id,
    });

    await this.generationJobService.startJob(job.id);

    this.logger.log(`Video render started for project ${projectId}, job ${job.id}`);

    return {
      jobId: job.id,
      status: 'RENDERING',
      costEstimate: costEstimate.estimatedCostUsd,
      message: 'Video rendering started. Check the Jobs page for progress.',
    };
  }

  async updateRenderResult(jobId: string, videoUrl: string, thumbnailUrl?: string) {
    // Called by the render worker when done
    const job = await this.generationJobService.getJob(jobId, '');
    if (!job) return;

    // Find the associated ShortVideoProject
    const projects = await this.shortVideoRepository.findByOrganization(job.organizationId);
    const project = projects.find((p: any) => p.renderJobId === jobId);
    if (!project) return;

    await this.shortVideoRepository.update(project.id, project.organizationId, {
      status: 'COMPLETED' as ShortVideoStatus,
      videoUrl,
      thumbnailUrl,
      renderCostActual: job.costEstimate || undefined,
    });

    this.logger.log(`Video render completed for project ${project.id}`);
  }

  async updateStatus(id: string, orgId: string, status: string) {
    await this.getProject(id, orgId); // validate existence + ownership
    return this.shortVideoRepository.updateStatus(id, orgId, status as ShortVideoStatus);
  }

  async deleteProject(id: string, orgId: string) {
    await this.getProject(id, orgId); // validate existence + ownership
    return this.shortVideoRepository.delete(id, orgId);
  }

  private estimateScriptCost(sceneCount: number): number {
    const inputTokens = sceneCount * 100;
    const outputTokens = sceneCount * 150;
    const costPer1kInput = 0.0025;
    const costPer1kOutput = 0.01;
    return (inputTokens / 1000) * costPer1kInput + (outputTokens / 1000) * costPer1kOutput;
  }
}
