import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { CreativeEngineService } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.service';
import { CreativeWorkflowService } from '@gitroom/nestjs-libraries/creative-engine/creative-workflow.service';
import { CreativePublishService } from '@gitroom/nestjs-libraries/creative-engine/creative-publish.service';
import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

const operations = [
  'capabilities',
  'presets',
  'projects',
  'project',
  'assets',
  'products',
  'actors',
  'voices',
  'jobs',
  'job',
  'credits',
  'metrics',
  'publications',
  'workflows',
  'workflow',
  'workflow-run',
] as const;

type CreativeCatalogInput = {
  operation: (typeof operations)[number];
  projectId?: string;
  language?: string;
  jobId?: string;
  workflowId?: string;
  workflowRunId?: string;
  maxItems?: number;
};

// Read-only lookups split out of the former 40-operation creativeEngineTool
// (see docs/studio-audit.md, item C4): none of these mutate state or consume
// credits, so they carry no confirmation requirement.
@Injectable()
export class CreativeCatalogTool implements AgentToolInterface {
  name = 'creativeCatalogTool';

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
      id: 'creativeCatalogTool',
      description:
        'Read-only lookups for the ContentFlow Creative Engine: capabilities, presets, projects, assets, products, actors, voices, credits, metrics, publications, jobs and workflows. Never mutates state and never consumes credits.',
      mcp: {
        annotations: {
          title: 'Creative Catalog',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        operation: z.enum(operations),
        projectId: z.string().optional(),
        language: z.string().optional(),
        jobId: z.string().optional(),
        workflowId: z.string().optional(),
        workflowRunId: z.string().optional(),
        maxItems: z.number().optional(),
      }),
      outputSchema: z.object({ result: z.any() }),
      execute: async (inputData: CreativeCatalogInput, context) => {
        checkAuth(inputData, context);
        if (process.env.CREATIVE_ENGINE_ENABLED === 'false') {
          throw new Error('Creative Engine is disabled');
        }
        const organization = this.getOrganization(context);
        const service = this.getService();

        switch (inputData.operation) {
          case 'capabilities':
            return { result: service.listCapabilities() };
          case 'presets':
            return { result: service.listPresets() };
          case 'projects':
            return { result: await service.listProjects(organization.id) };
          case 'project':
            if (!inputData.projectId) throw new Error('projectId is required for operation project');
            return { result: await service.getProject(inputData.projectId, organization.id) };
          case 'assets':
            return { result: await service.listAssets(organization.id, inputData.projectId) };
          case 'products':
            return { result: await service.listProducts(organization.id, inputData.projectId) };
          case 'actors':
            return { result: await service.listActors(organization.id, inputData.projectId) };
          case 'voices':
            return { result: await service.listVoices(organization.id, inputData.language) };
          case 'jobs':
            return { result: await service.listJobs(organization.id) };
          case 'job':
            if (!inputData.jobId) throw new Error('jobId is required for operation job');
            return { result: await service.getJob(inputData.jobId, organization.id) };
          case 'credits':
            return { result: await service.getCreditBalance(organization.id) };
          case 'metrics':
            return { result: await service.getMetrics(organization.id, inputData.maxItems || 30) };
          case 'publications':
            return {
              result: await this.getOptionalService<CreativePublishService>(CreativePublishService, 'Creative publishing is not available').list(organization.id, inputData.projectId),
            };
          case 'workflows':
            return { result: await this.getOptionalService<CreativeWorkflowService>(CreativeWorkflowService, 'Creative workflows are not available').list(organization.id) };
          case 'workflow':
            if (!inputData.workflowId) throw new Error('workflowId is required for operation workflow');
            return { result: await this.getOptionalService<CreativeWorkflowService>(CreativeWorkflowService, 'Creative workflows are not available').get(inputData.workflowId, organization.id) };
          case 'workflow-run':
            if (!inputData.workflowRunId) throw new Error('workflowRunId is required for operation workflow-run');
            return { result: await this.getOptionalService<CreativeWorkflowService>(CreativeWorkflowService, 'Creative workflows are not available').getRun(inputData.workflowRunId, organization.id) };
        }
      },
    });
  }
}
