import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { CreativeEngineService } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.service';
import { CreativeExportService } from '@gitroom/nestjs-libraries/creative-engine/creative-export.service';
import { CreativePublishService } from '@gitroom/nestjs-libraries/creative-engine/creative-publish.service';
import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

const operations = ['publish', 'export-project', 'download'] as const;

type CreativePublishInput = {
  operation: (typeof operations)[number];
  projectId?: string;
  variantId?: string;
  integrationId?: string;
  publicationType?: 'draft' | 'schedule' | 'now';
  publicationDate?: string;
  content?: string;
  shortLink?: boolean;
  confirmed?: boolean;
  idempotencyKey?: string;
};

// Publish/export/download operations split out of the former 40-operation
// creativeEngineTool (see docs/studio-audit.md, item C4). publish and
// export-project require explicit confirmation; download is a free read.
@Injectable()
export class CreativePublishTool implements AgentToolInterface {
  name = 'creativePublishTool';

  constructor(private readonly moduleRef: ModuleRef) {}

  private getService() {
    const service = this.moduleRef.get(CreativeEngineService, { strict: false });
    if (!service) throw new Error('Creative Engine is not available in this backend instance');
    return service;
  }

  private getOptionalService<T>(token: any, message: string): T {
    const service = this.moduleRef.get<T>(token, { strict: false });
    if (!service) throw new Error(message);
    return service;
  }

  private getOrganization(context: any) {
    const raw = context?.requestContext?.get('organization');
    if (!raw) throw new Error('This Creative Engine operation requires an authenticated organization');
    return JSON.parse(raw) as { id: string };
  }

  run() {
    return createTool({
      id: 'creativePublishTool',
      description:
        'Publish a finished Creative Engine variant to a channel, export a project as a downloadable ZIP, or fetch a variant download link. Never call publish until the user has explicitly confirmed the channel and timing.',
      mcp: {
        annotations: {
          title: 'Creative Publish',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        operation: z.enum(operations),
        projectId: z.string().optional(),
        variantId: z.string().optional(),
        integrationId: z.string().optional(),
        publicationType: z.enum(['draft', 'schedule', 'now']).optional(),
        publicationDate: z.string().optional(),
        content: z.string().optional(),
        shortLink: z.boolean().optional(),
        confirmed: z.boolean().optional(),
        idempotencyKey: z.string().optional(),
      }),
      outputSchema: z.object({ result: z.any() }),
      execute: async (inputData: CreativePublishInput, context) => {
        checkAuth(inputData, context);
        if (process.env.CREATIVE_ENGINE_ENABLED === 'false') {
          throw new Error('Creative Engine is disabled');
        }
        const organization = this.getOrganization(context);
        const service = this.getService();
        const confirmationRequired = new Set(['publish', 'export-project']);
        if (confirmationRequired.has(inputData.operation) && inputData.confirmed !== true) {
          throw new Error('Esta acao exige confirmacao explicita do usuario antes de continuar.');
        }

        switch (inputData.operation) {
          case 'download':
            if (!inputData.variantId) throw new Error('variantId is required for operation download');
            return { result: await service.getVariantDownload(inputData.variantId, organization.id) };
          case 'export-project':
            if (!inputData.projectId) throw new Error('projectId is required for operation export-project');
            return {
              result: await this.getOptionalService<CreativeExportService>(CreativeExportService, 'Creative export is not available').exportProject(organization.id, inputData.projectId),
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
        }
      },
    });
  }
}
