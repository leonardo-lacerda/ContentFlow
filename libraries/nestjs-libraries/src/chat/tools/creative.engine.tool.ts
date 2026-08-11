import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { CreativeCapability } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.types';
import { CreativeEngineService } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.service';
import { CreativeExportService } from '@gitroom/nestjs-libraries/creative-engine/creative-export.service';
import { CreativeEvaluationService } from '@gitroom/nestjs-libraries/creative-engine/creative-evaluation.service';
import { CreativePublishService } from '@gitroom/nestjs-libraries/creative-engine/creative-publish.service';
import { CreativeWorkflowService } from '@gitroom/nestjs-libraries/creative-engine/creative-workflow.service';
import type { CreativeMediaTool } from '@gitroom/nestjs-libraries/creative-engine/creative-media-tool.service';
import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { compileDesignPrompt } from '@gitroom/nestjs-libraries/creative-engine/creative-design-prompt.util';

const capabilities = [
  'image-generation',
  'video-generation',
  'talking-actor',
  'text-to-speech',
  'translation',
  'lip-sync',
  'captions',
  'b-roll',
  'actor-replacement',
] as const;

const operations = [
  'capabilities',
  'presets',
  'run-preset',
  'projects',
  'project',
  'create-project',
  'create-script',
  'revise-script',
  'generate-image',
  'generate-carousel',
  'assets',
  'products',
  'actors',
  'voices',
  'quote-tool',
  'run-tool',
  'quote',
  'quote-matrix',
  'generate',
  'generate-matrix',
  'localize',
  'download',
  'export-project',
  'jobs',
  'job',
  'cancel-job',
  'evaluate',
  'review',
  'publications',
  'publish',
  'credits',
  'metrics',
  'workflows',
  'workflow',
  'create-workflow',
  'validate-workflow',
  'quote-workflow',
  'run-workflow',
  'workflow-run',
  'cancel-workflow-run',
] as const;

type CreativeToolInput = {
  operation: (typeof operations)[number];
  projectId?: string;
  presetId?: string;
  jobId?: string;
  variantId?: string;
  scriptId?: string;
  name?: string;
  objective?: string;
  brief?: string;
  language?: string;
  capability?: (typeof capabilities)[number];
  actorId?: string;
  voiceId?: string;
  prompt?: string;
  provider?: string;
  aspectRatio?: string;
  durationSec?: number;
  targetLanguage?: string;
  integrationId?: string;
  publicationType?: 'draft' | 'schedule' | 'now';
  publicationDate?: string;
  content?: string;
  shortLink?: boolean;
  approved?: boolean;
  score?: number;
  productFidelity?: number;
  lipSync?: number;
  captionAccuracy?: number;
  notes?: string;
  actorIds?: string[];
  productAssetIds?: string[];
  voiceIds?: string[];
  languages?: string[];
  aspectRatios?: string[];
  prompts?: string[];
  maxItems?: number;
  confirmed?: boolean;
  designApproved?: boolean;
  idempotencyKey?: string;
  tool?: CreativeMediaTool;
  script?: string;
  audioUrl?: string;
  videoUrl?: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  scenes?: Array<Record<string, unknown>>;
  startSec?: number;
  workflowId?: string;
  workflowRunId?: string;
  workflowInput?: Record<string, unknown>;
  nodes?: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
  maxCredits?: number;
  designSpec?: Record<string, unknown>;
  slides?: Array<{
    id?: string;
    index?: number;
    headline?: string;
    body?: string;
    cta?: string;
    imagePrompt: string;
    aspectRatio?: string;
  }>;
};

@Injectable()
export class CreativeEngineTool implements AgentToolInterface {
  name = 'creativeEngineTool';

  constructor(private readonly moduleRef: ModuleRef) {}

  private getService() {
    const service = this.moduleRef.get(CreativeEngineService, {
      strict: false,
    });
    if (!service)
      throw new Error(
        'Creative Engine is not available in this backend instance'
      );
    return service;
  }

  private getOptionalService<T>(token: any, message: string): T {
    const service = this.moduleRef.get<T>(token, { strict: false });
    if (!service) throw new Error(message);
    return service;
  }

  private getOrganization(context: any) {
    const raw = context?.requestContext?.get('organization');
    if (!raw)
      throw new Error(
        'This Creative Engine operation requires an authenticated organization'
      );
    return JSON.parse(raw) as { id: string };
  }

  run() {
    return createTool({
      id: 'creativeEngineTool',
      description:
        'Operate the ContentFlow Creative Engine behind ContentFlow Studio: create projects and scripts, inspect capabilities and presets, run approved media tools and workflows, manage assets/actors/voices, quote and generate image or video creative variants, publish, and track render jobs. Use this for Studio creative production. Always quote before a credit-consuming operation and never expose provider details unless explicitly requested.',
      mcp: {
        annotations: {
          title: 'Creative Engine',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        operation: z.enum(operations),
        projectId: z.string().optional(),
        presetId: z.string().optional(),
        jobId: z.string().optional(),
        variantId: z.string().optional(),
        scriptId: z.string().optional(),
        name: z.string().optional(),
        objective: z.string().optional(),
        brief: z.string().optional(),
        language: z.string().optional(),
        capability: z.enum(capabilities).optional(),
        actorId: z.string().optional(),
        voiceId: z.string().optional(),
        prompt: z.string().optional(),
        provider: z.string().optional(),
        aspectRatio: z.string().optional(),
        durationSec: z.number().optional(),
        targetLanguage: z.string().optional(),
        integrationId: z.string().optional(),
        publicationType: z.enum(['draft', 'schedule', 'now']).optional(),
        publicationDate: z.string().optional(),
        content: z.string().optional(),
        shortLink: z.boolean().optional(),
        approved: z.boolean().optional(),
        score: z.number().optional(),
        productFidelity: z.number().optional(),
        lipSync: z.number().optional(),
        captionAccuracy: z.number().optional(),
        notes: z.string().optional(),
        actorIds: z.array(z.string()).optional(),
        productAssetIds: z.array(z.string()).optional(),
        voiceIds: z.array(z.string()).optional(),
        languages: z.array(z.string()).optional(),
        aspectRatios: z.array(z.string()).optional(),
        prompts: z.array(z.string()).optional(),
        maxItems: z.number().optional(),
        confirmed: z.boolean().optional(),
        idempotencyKey: z.string().optional(),
        tool: z.enum(['captions', 'transcribe', 'resize', 'trim', 'merge', 'compose', 'scene-render']).optional(),
        script: z.string().optional(),
        audioUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        sourceUrl: z.string().optional(),
        sourceUrls: z.array(z.string()).optional(),
        scenes: z.array(z.record(z.any())).optional(),
        startSec: z.number().optional(),
        workflowId: z.string().optional(),
        workflowRunId: z.string().optional(),
        workflowInput: z.record(z.any()).optional(),
        nodes: z.array(z.record(z.any())).optional(),
        edges: z.array(z.record(z.any())).optional(),
        maxCredits: z.number().optional(),
        designApproved: z.boolean().optional(),
        designSpec: z.record(z.any()).optional(),
        slides: z.array(z.object({
          id: z.string().optional(),
          index: z.number().optional(),
          headline: z.string().optional(),
          body: z.string().optional(),
          cta: z.string().optional(),
          imagePrompt: z.string().min(1),
          aspectRatio: z.string().optional(),
        })).optional(),
      }),
      outputSchema: z.object({ result: z.any() }),
      execute: async (inputData: CreativeToolInput, context) => {
        checkAuth(inputData, context);
        if (process.env.CREATIVE_ENGINE_ENABLED === 'false') {
          throw new Error('Creative Engine is disabled');
        }
        const organization = this.getOrganization(context);
        const service = this.getService();
        const confirmationRequired = new Set([
          'generate-image',
          'generate-carousel',
          'run-preset',
          'run-tool',
          'generate',
          'generate-matrix',
          'localize',
          'export-project',
          'publish',
          'run-workflow',
        ]);
        if (confirmationRequired.has(inputData.operation) && inputData.confirmed !== true) {
          throw new Error('Esta acao exige confirmacao explicita do usuario antes de continuar.');
        }

        switch (inputData.operation) {
          case 'capabilities':
            return { result: service.listCapabilities() };
          case 'presets':
            return { result: service.listPresets() };
          case 'run-preset':
            if (!inputData.projectId || !inputData.presetId) {
              throw new Error('projectId and presetId are required for operation run-preset');
            }
            return {
              result: await service.runPreset(organization.id, inputData.projectId, inputData.presetId, {
                actorId: inputData.actorId,
                voiceId: inputData.voiceId,
                variantId: inputData.variantId,
                targetLanguage: inputData.targetLanguage,
                productAssetIds: inputData.productAssetIds,
                prompt: inputData.prompt,
                provider: inputData.provider,
                capability: inputData.capability as CreativeCapability | undefined,
                language: inputData.language,
                aspectRatio: inputData.aspectRatio,
                durationSec: inputData.durationSec,
                audioUrl: inputData.audioUrl,
                videoUrl: inputData.videoUrl,
                idempotencyKey: inputData.idempotencyKey,
              }),
            };
          case 'projects':
            return { result: await service.listProjects(organization.id) };
          case 'project':
            if (!inputData.projectId)
              throw new Error('projectId is required for operation project');
            return {
              result: await service.getProject(
                inputData.projectId,
                organization.id
              ),
            };
          case 'create-project':
            if (!inputData.name)
              throw new Error('name is required for operation create-project');
            return {
              result: await service.createProject(organization.id, {
                name: inputData.name,
                objective: inputData.objective,
                aspectRatio: inputData.aspectRatio,
                maxDurationSec: inputData.durationSec,
              }),
            };
          case 'create-script':
            if (!inputData.projectId || !inputData.brief) {
              throw new Error(
                'projectId and brief are required for operation create-script'
              );
            }
            return {
              result: await service.createScript(
                organization.id,
                inputData.projectId,
                {
                  brief: inputData.brief,
                  language: inputData.language,
                }
              ),
            };
          case 'revise-script':
            if (!inputData.projectId || !inputData.scriptId || !inputData.brief) {
              throw new Error('projectId, scriptId and brief are required for operation revise-script');
            }
            return {
              result: await service.reviseScript(organization.id, inputData.projectId, inputData.scriptId, {
                brief: inputData.brief,
                language: inputData.language,
              }),
            };
          case 'generate-image':
            if (!inputData.prompt) throw new Error('prompt is required for operation generate-image');
            {
              const project = inputData.projectId
                ? { id: inputData.projectId }
                : await service.createProject(organization.id, {
                    name: inputData.name || 'ContentFlow image creation',
                    objective: inputData.prompt,
                    aspectRatio: inputData.aspectRatio,
                  });
              return {
              result: await service.generateImage(organization.id, project.id, {
                  prompt: compileDesignPrompt(inputData.prompt, inputData.designSpec),
                  name: inputData.name,
                  aspectRatio: inputData.aspectRatio,
                  idempotencyKey: inputData.idempotencyKey,
                }),
              };
            }
          case 'generate-carousel': {
            if (!inputData.slides?.length) {
              throw new Error('slides are required for operation generate-carousel');
            }
            if (inputData.designApproved !== true) {
              throw new Error('designApproved=true is required before generating carousel images');
            }
            const generated = await service.generateCarouselImages(organization.id, {
              projectId: inputData.projectId,
              name: inputData.name,
              brief: inputData.brief,
              prompt: inputData.prompt,
              aspectRatio: inputData.aspectRatio,
              designSpec: inputData.designSpec,
              idempotencyKey: inputData.idempotencyKey,
              slides: inputData.slides,
            });
            return {
              result: {
                type: 'CAROUSEL_IMAGES_GENERATED',
                ...generated,
              },
            };
          }
          case 'assets':
            return { result: await service.listAssets(organization.id, inputData.projectId) };
          case 'products':
            return { result: await service.listProducts(organization.id, inputData.projectId) };
          case 'actors':
            return { result: await service.listActors(organization.id, inputData.projectId) };
          case 'voices':
            return { result: await service.listVoices(organization.id, inputData.language) };
          case 'quote-tool':
            if (!inputData.projectId || !inputData.tool) {
              throw new Error('projectId and tool are required for operation quote-tool');
            }
            return { result: await service.quoteTool(organization.id, inputData.projectId, { tool: inputData.tool }) };
          case 'run-tool':
            if (!inputData.projectId || !inputData.tool) {
              throw new Error('projectId and tool are required for operation run-tool');
            }
            return {
              result: await service.runTool(organization.id, inputData.projectId, {
                tool: inputData.tool,
                script: inputData.script,
                prompt: inputData.prompt,
                language: inputData.language,
                audioUrl: inputData.audioUrl,
                sourceUrl: inputData.sourceUrl,
                sourceUrls: inputData.sourceUrls,
                scenes: inputData.scenes,
                maxDurationSec: inputData.durationSec,
                aspectRatio: inputData.aspectRatio,
                startSec: inputData.startSec,
                durationSec: inputData.durationSec,
                idempotencyKey: inputData.idempotencyKey,
              }),
            };
          case 'quote':
            if (!inputData.projectId)
              throw new Error('projectId is required for operation quote');
            return {
              result: await service.quoteVariant(
                organization.id,
                inputData.projectId,
                {
                  capability: inputData.capability as
                    | CreativeCapability
                    | undefined,
                  actorId: inputData.actorId,
                  voiceId: inputData.voiceId,
                  prompt: inputData.prompt,
                  provider: inputData.provider,
                  aspectRatio: inputData.aspectRatio,
                  durationSec: inputData.durationSec,
                  language: inputData.language,
                }
              ),
            };
          case 'quote-matrix':
            if (!inputData.projectId) {
              throw new Error('projectId is required for operation quote-matrix');
            }
            return {
              result: await service.quoteVariantMatrix(organization.id, inputData.projectId, {
                capability: inputData.capability as CreativeCapability | undefined,
                actorIds: inputData.actorIds,
                voiceIds: inputData.voiceIds,
                languages: inputData.languages,
                aspectRatios: inputData.aspectRatios,
                prompts: inputData.prompts,
                provider: inputData.provider,
                maxItems: inputData.maxItems,
              }),
            };
          case 'generate':
            if (!inputData.projectId)
              throw new Error('projectId is required for operation generate');
            return {
              result: await service.generateVariant(
                organization.id,
                inputData.projectId,
                {
                  capability: inputData.capability as
                    | CreativeCapability
                    | undefined,
                  actorId: inputData.actorId,
                  voiceId: inputData.voiceId,
                  prompt: inputData.prompt,
                  provider: inputData.provider,
                  aspectRatio: inputData.aspectRatio,
                  durationSec: inputData.durationSec,
                  language: inputData.language,
                  idempotencyKey: inputData.idempotencyKey,
                }
              ),
            };
          case 'generate-matrix':
            if (!inputData.projectId) {
              throw new Error('projectId is required for operation generate-matrix');
            }
            return {
              result: await service.generateVariantMatrix(organization.id, inputData.projectId, {
                capability: inputData.capability as CreativeCapability | undefined,
                actorIds: inputData.actorIds,
                voiceIds: inputData.voiceIds,
                languages: inputData.languages,
                aspectRatios: inputData.aspectRatios,
                prompts: inputData.prompts,
                provider: inputData.provider,
                maxItems: inputData.maxItems,
                idempotencyKey: inputData.idempotencyKey,
              }),
            };
          case 'localize':
            if (!inputData.projectId || !inputData.variantId || !inputData.targetLanguage) {
              throw new Error('projectId, variantId and targetLanguage are required for operation localize');
            }
            return {
              result: await service.localizeVariant(organization.id, inputData.projectId, inputData.variantId, {
                targetLanguage: inputData.targetLanguage,
                capability: inputData.capability as CreativeCapability | undefined,
                provider: inputData.provider,
                idempotencyKey: inputData.idempotencyKey,
              }),
            };
          case 'download':
            if (!inputData.variantId) throw new Error('variantId is required for operation download');
            return { result: await service.getVariantDownload(inputData.variantId, organization.id) };
          case 'export-project':
            if (!inputData.projectId) throw new Error('projectId is required for operation export-project');
            return {
              result: await this.getOptionalService<CreativeExportService>(CreativeExportService, 'Creative export is not available').exportProject(organization.id, inputData.projectId),
            };
          case 'jobs':
            return { result: await service.listJobs(organization.id) };
          case 'job':
            if (!inputData.jobId)
              throw new Error('jobId is required for operation job');
            return {
              result: await service.getJob(inputData.jobId, organization.id),
            };
          case 'cancel-job':
            if (!inputData.jobId) throw new Error('jobId is required for operation cancel-job');
            return { result: await service.cancelJob(inputData.jobId, organization.id) };
          case 'evaluate':
            if (!inputData.jobId) throw new Error('jobId is required for operation evaluate');
            return {
              result: await this.getOptionalService<CreativeEvaluationService>(CreativeEvaluationService, 'Creative evaluation is not available').preflight(organization.id, inputData.jobId),
            };
          case 'review':
            if (!inputData.jobId || inputData.approved === undefined) {
              throw new Error('jobId and approved are required for operation review');
            }
            return {
              result: await this.getOptionalService<CreativeEvaluationService>(CreativeEvaluationService, 'Creative evaluation is not available').review(organization.id, inputData.jobId, {
                approved: inputData.approved,
                score: inputData.score,
                productFidelity: inputData.productFidelity,
                lipSync: inputData.lipSync,
                captionAccuracy: inputData.captionAccuracy,
                notes: inputData.notes,
              }),
            };
          case 'publications':
            return {
              result: await this.getOptionalService<CreativePublishService>(CreativePublishService, 'Creative publishing is not available').list(organization.id, inputData.projectId),
            };
          case 'publish':
            if (!inputData.projectId || !inputData.variantId || !inputData.integrationId) {
              throw new Error('projectId, variantId and integrationId are required for operation publish');
            }
            return {
              result: await this.getOptionalService<CreativePublishService>(CreativePublishService, 'Creative publishing is not available').publishVariant(organization.id, inputData.projectId, inputData.variantId, {
                integrationId: inputData.integrationId,
                type: inputData.publicationType,
                date: inputData.publicationDate,
                shortLink: inputData.shortLink,
                content: inputData.content,
                idempotencyKey: inputData.idempotencyKey,
              }),
            };
          case 'credits':
            return { result: await service.getCreditBalance(organization.id) };
          case 'metrics':
            return { result: await service.getMetrics(organization.id, inputData.maxItems || 30) };
          case 'workflows':
            return { result: await this.getOptionalService<CreativeWorkflowService>(CreativeWorkflowService, 'Creative workflows are not available').list(organization.id) };
          case 'workflow':
            if (!inputData.workflowId) throw new Error('workflowId is required for operation workflow');
            return { result: await this.getOptionalService<CreativeWorkflowService>(CreativeWorkflowService, 'Creative workflows are not available').get(inputData.workflowId, organization.id) };
          case 'create-workflow':
            if (!inputData.name || !inputData.nodes || !inputData.edges) {
              throw new Error('name, nodes and edges are required for operation create-workflow');
            }
            return {
              result: await this.getOptionalService<CreativeWorkflowService>(CreativeWorkflowService, 'Creative workflows are not available').create(organization.id, {
                projectId: inputData.projectId,
                name: inputData.name,
                nodes: inputData.nodes as any,
                edges: inputData.edges as any,
                maxCredits: inputData.maxCredits,
              }),
            };
          case 'validate-workflow':
            if (!inputData.workflowId) throw new Error('workflowId is required for operation validate-workflow');
            return { result: await this.getOptionalService<CreativeWorkflowService>(CreativeWorkflowService, 'Creative workflows are not available').validate(inputData.workflowId, organization.id) };
          case 'quote-workflow':
            if (!inputData.workflowId) throw new Error('workflowId is required for operation quote-workflow');
            return { result: await this.getOptionalService<CreativeWorkflowService>(CreativeWorkflowService, 'Creative workflows are not available').quote(inputData.workflowId, organization.id, inputData.workflowInput || {}) };
          case 'run-workflow':
            if (!inputData.workflowId) throw new Error('workflowId is required for operation run-workflow');
            return { result: await this.getOptionalService<CreativeWorkflowService>(CreativeWorkflowService, 'Creative workflows are not available').run(inputData.workflowId, organization.id, inputData.workflowInput || {}) };
          case 'workflow-run':
            if (!inputData.workflowRunId) throw new Error('workflowRunId is required for operation workflow-run');
            return { result: await this.getOptionalService<CreativeWorkflowService>(CreativeWorkflowService, 'Creative workflows are not available').getRun(inputData.workflowRunId, organization.id) };
          case 'cancel-workflow-run':
            if (!inputData.workflowRunId) throw new Error('workflowRunId is required for operation cancel-workflow-run');
            return { result: await this.getOptionalService<CreativeWorkflowService>(CreativeWorkflowService, 'Creative workflows are not available').cancelRun(inputData.workflowRunId, organization.id) };
        }
      },
    });
  }
}
