import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { CreativeCapability } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.types';
import { CreativeEngineService } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.service';
import type { CreativeMediaTool } from '@gitroom/nestjs-libraries/creative-engine/creative-media-tool.service';
import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { ToolConfirmationService } from '@gitroom/nestjs-libraries/chat/tool-confirmation.service';
import { compileDesignPrompt } from '@gitroom/nestjs-libraries/creative-engine/creative-design-prompt.util';
import { STYLE_PRESETS, PALETTES } from '@gitroom/nestjs-libraries/creative-engine/carousel-design-catalogue';

// Cast to zod's non-empty-tuple shape: the id lists are derived from the
// shared catalogue (not re-typed here) so a new preset/palette added there is
// picked up automatically without touching this file. Font pairing is
// deliberately not exposed here: compileDesignPrompt never reads
// typography.headingFont/bodyFont (font choice only affects the Studio's own
// client-side text-overlay compositing, which the headless/MCP path doesn't
// have), so it would be a knob that silently does nothing.
const stylePresetIds = STYLE_PRESETS.map((p) => p.presetId) as unknown as [string, ...string[]];
const paletteIds = PALETTES.map((p) => p.paletteId) as unknown as [string, ...string[]];

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
  'run-preset',
  'generate-image',
  'generate-carousel',
  'quote-tool',
  'run-tool',
  'quote',
  'quote-matrix',
  'generate',
  'generate-matrix',
  'localize',
] as const;

type CreativeGenerationInput = {
  operation: (typeof operations)[number];
  projectId?: string;
  presetId?: string;
  variantId?: string;
  name?: string;
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
  designSpec?: Record<string, unknown>;
  stylePresetId?: string;
  paletteId?: string;
  density?: 'airy' | 'balanced' | 'dense';
  alignment?: 'left' | 'center' | 'right';
  slides?: Array<{
    id?: string;
    index?: number;
    headline?: string;
    body?: string;
    cta?: string;
    imagePrompt: string;
    aspectRatio?: string;
    styleOverride?: {
      stylePresetId?: string;
      paletteId?: string;
      density?: 'airy' | 'balanced' | 'dense';
      alignment?: 'left' | 'center' | 'right';
    };
  }>;
};

// Credit-consuming generation operations split out of the former 40-operation
// creativeEngineTool (see docs/studio-audit.md, item C4). Every operation here
// requires explicit user confirmation before it runs.
@Injectable()
export class CreativeGenerationTool implements AgentToolInterface {
  name = 'creativeGenerationTool';

  constructor(private readonly moduleRef: ModuleRef) {}

  private getService() {
    const service = this.moduleRef.get(CreativeEngineService, { strict: false });
    if (!service) throw new Error('Creative Engine is not available in this backend instance');
    return service;
  }

  private getOrganization(context: any) {
    const raw = context?.requestContext?.get('organization');
    if (!raw) throw new Error('This Creative Engine operation requires an authenticated organization');
    return JSON.parse(raw) as { id: string };
  }

  private getConfirmationService() {
    return this.moduleRef.get(ToolConfirmationService, { strict: false });
  }

  run() {
    return createTool({
      id: 'creativeGenerationTool',
      description:
        'Quote and generate Creative Engine image or video output: run approved presets and media tools, quote a variant or a matrix of variants, generate a single image/video/carousel, generate a variant matrix, or localize an existing variant. Always quote before a credit-consuming operation, require explicit confirmed=true, and never expose provider details unless explicitly requested.',
      mcp: {
        annotations: {
          title: 'Creative Generation',
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
        variantId: z.string().optional(),
        name: z.string().optional(),
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
        designApproved: z.boolean().optional(),
        designSpec: z.record(z.any()).optional(),
        stylePresetId: z.enum(stylePresetIds).optional().describe(
          `For generate-carousel: a named visual style, applied identically to every slide. If the user hasn't stated a preference, call creativeCatalogTool with operation 'carousel-styles' first and offer 2-3 named options rather than silently picking one. Available presets: ${STYLE_PRESETS.map((p) => `${p.presetId} (${p.presetName}: ${p.description})`).join('; ')}. Defaults to photo-clean when omitted.`
        ),
        paletteId: z.enum(paletteIds).optional().describe(
          `For generate-carousel: overrides the colour palette independently of stylePresetId (e.g. a dark-premium style with a mint-fresh palette). Available palettes: ${PALETTES.map((p) => `${p.paletteId} (${p.name})`).join('; ')}. When omitted, uses the chosen preset's own palette, seeded with the brand's real colours if available.`
        ),
        density: z.enum(['airy', 'balanced', 'dense']).optional().describe(
          'For generate-carousel: how much visual/text density per slide. Defaults to the chosen preset\'s own density.'
        ),
        alignment: z.enum(['left', 'center', 'right']).optional().describe(
          'For generate-carousel: text alignment for headline/body/CTA. Defaults to left.'
        ),
        slides: z.array(z.object({
          id: z.string().optional(),
          index: z.number().optional(),
          headline: z.string().optional(),
          body: z.string().optional(),
          cta: z.string().optional(),
          imagePrompt: z.string().min(1),
          aspectRatio: z.string().optional(),
          styleOverride: z.object({
            stylePresetId: z.enum(stylePresetIds).optional(),
            paletteId: z.enum(paletteIds).optional(),
            density: z.enum(['airy', 'balanced', 'dense']).optional(),
            alignment: z.enum(['left', 'center', 'right']).optional(),
          }).optional().describe(
            "Breaks just this one slide from the carousel's shared style (e.g. a bolder CTA slide). Rare — most carousels should share one style; only use this when the user explicitly asks for one slide to look different. Requires this slide to also set id or index."
          ),
        })).optional(),
      }),
      outputSchema: z.object({ result: z.any() }),
      execute: async (inputData: CreativeGenerationInput, context) => {
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
        ]);
        if (confirmationRequired.has(inputData.operation)) {
          const threadId = (context as any)?.agent?.threadId as
            | string
            | undefined;
          const requestId = (context?.requestContext as any)?.get(
            'requestId'
          ) as string | undefined;
          const { confirmed, ...fingerprintParams } = inputData as any;
          const canProceed = await this.getConfirmationService().requestOrConsume(
            threadId || organization.id,
            requestId,
            `creativeGenerationTool:${inputData.operation}`,
            fingerprintParams,
            inputData.confirmed
          );
          if (!canProceed) {
            throw new Error('Esta acao exige confirmacao explicita do usuario antes de continuar.');
          }
        }

        switch (inputData.operation) {
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
              stylePresetId: inputData.stylePresetId,
              paletteId: inputData.paletteId,
              density: inputData.density,
              alignment: inputData.alignment,
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
            if (!inputData.projectId) throw new Error('projectId is required for operation quote');
            return {
              result: await service.quoteVariant(organization.id, inputData.projectId, {
                capability: inputData.capability as CreativeCapability | undefined,
                actorId: inputData.actorId,
                voiceId: inputData.voiceId,
                prompt: inputData.prompt,
                provider: inputData.provider,
                aspectRatio: inputData.aspectRatio,
                durationSec: inputData.durationSec,
                language: inputData.language,
              }),
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
            if (!inputData.projectId) throw new Error('projectId is required for operation generate');
            return {
              result: await service.generateVariant(organization.id, inputData.projectId, {
                capability: inputData.capability as CreativeCapability | undefined,
                actorId: inputData.actorId,
                voiceId: inputData.voiceId,
                prompt: inputData.prompt,
                provider: inputData.provider,
                aspectRatio: inputData.aspectRatio,
                durationSec: inputData.durationSec,
                language: inputData.language,
                idempotencyKey: inputData.idempotencyKey,
              }),
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
        }
      },
    });
  }
}
