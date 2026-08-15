import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { CreativeEngineService } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.service';
import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

const operations = ['create-project', 'create-script', 'revise-script'] as const;

type CreativeProjectInput = {
  operation: (typeof operations)[number];
  projectId?: string;
  scriptId?: string;
  name?: string;
  objective?: string;
  brief?: string;
  language?: string;
  aspectRatio?: string;
  durationSec?: number;
};

// Project/script CRUD split out of the former 40-operation creativeEngineTool
// (see docs/studio-audit.md, item C4). None of these consume credits.
@Injectable()
export class CreativeProjectTool implements AgentToolInterface {
  name = 'creativeProjectTool';

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

  run() {
    return createTool({
      id: 'creativeProjectTool',
      description:
        'Create Creative Engine projects and scripts, and revise existing scripts. Use before generating creative for a new production.',
      mcp: {
        annotations: {
          title: 'Creative Project',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        operation: z.enum(operations),
        projectId: z.string().optional(),
        scriptId: z.string().optional(),
        name: z.string().optional(),
        objective: z.string().optional(),
        brief: z.string().optional(),
        language: z.string().optional(),
        aspectRatio: z.string().optional(),
        durationSec: z.number().optional(),
      }),
      outputSchema: z.object({ result: z.any() }),
      execute: async (inputData: CreativeProjectInput, context) => {
        checkAuth(inputData, context);
        if (process.env.CREATIVE_ENGINE_ENABLED === 'false') {
          throw new Error('Creative Engine is disabled');
        }
        const organization = this.getOrganization(context);
        const service = this.getService();

        switch (inputData.operation) {
          case 'create-project':
            if (!inputData.name) throw new Error('name is required for operation create-project');
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
              throw new Error('projectId and brief are required for operation create-script');
            }
            return {
              result: await service.createScript(organization.id, inputData.projectId, {
                brief: inputData.brief,
                language: inputData.language,
              }),
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
        }
      },
    });
  }
}
