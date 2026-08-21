import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { CreativeWorkflowService } from '@gitroom/nestjs-libraries/creative-engine/creative-workflow.service';
import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { ToolConfirmationService } from '@gitroom/nestjs-libraries/chat/tool-confirmation.service';

const operations = [
  'create-workflow',
  'validate-workflow',
  'quote-workflow',
  'run-workflow',
  'cancel-workflow-run',
] as const;

type CreativeWorkflowInput = {
  operation: (typeof operations)[number];
  projectId?: string;
  name?: string;
  workflowId?: string;
  workflowRunId?: string;
  workflowInput?: Record<string, unknown>;
  nodes?: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
  maxCredits?: number;
  confirmed?: boolean;
};

// Workflow builder/runner operations split out of the former 40-operation
// creativeEngineTool (see docs/studio-audit.md, item C4). Only run-workflow
// consumes credits and requires confirmation.
@Injectable()
export class CreativeWorkflowTool implements AgentToolInterface {
  name = 'creativeWorkflowTool';

  constructor(private readonly moduleRef: ModuleRef) {}

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

  private getConfirmationService() {
    return this.moduleRef.get(ToolConfirmationService, { strict: false });
  }

  run() {
    return createTool({
      id: 'creativeWorkflowTool',
      description:
        'Create, validate, quote, run and cancel Creative Engine workflows (multi-step generation pipelines). Quote a workflow and require explicit confirmation before running it.',
      mcp: {
        annotations: {
          title: 'Creative Workflow',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        operation: z.enum(operations),
        projectId: z.string().optional(),
        name: z.string().optional(),
        workflowId: z.string().optional(),
        workflowRunId: z.string().optional(),
        workflowInput: z.record(z.any()).optional(),
        nodes: z.array(z.record(z.any())).optional(),
        edges: z.array(z.record(z.any())).optional(),
        maxCredits: z.number().optional(),
        confirmed: z.boolean().optional(),
      }),
      outputSchema: z.object({ result: z.any() }),
      execute: async (inputData: CreativeWorkflowInput, context) => {
        checkAuth(inputData, context);
        if (process.env.CREATIVE_ENGINE_ENABLED === 'false') {
          throw new Error('Creative Engine is disabled');
        }
        const organization = this.getOrganization(context);
        if (inputData.operation === 'run-workflow') {
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
            'creativeWorkflowTool:run-workflow',
            fingerprintParams,
            inputData.confirmed
          );
          if (!canProceed) {
            throw new Error('Esta acao exige confirmacao explicita do usuario antes de continuar.');
          }
        }
        const workflows = this.getOptionalService<CreativeWorkflowService>(CreativeWorkflowService, 'Creative workflows are not available');

        switch (inputData.operation) {
          case 'create-workflow':
            if (!inputData.name || !inputData.nodes || !inputData.edges) {
              throw new Error('name, nodes and edges are required for operation create-workflow');
            }
            return {
              result: await workflows.create(organization.id, {
                projectId: inputData.projectId,
                name: inputData.name,
                nodes: inputData.nodes as any,
                edges: inputData.edges as any,
                maxCredits: inputData.maxCredits,
              }),
            };
          case 'validate-workflow':
            if (!inputData.workflowId) throw new Error('workflowId is required for operation validate-workflow');
            return { result: await workflows.validate(inputData.workflowId, organization.id) };
          case 'quote-workflow':
            if (!inputData.workflowId) throw new Error('workflowId is required for operation quote-workflow');
            return { result: await workflows.quote(inputData.workflowId, organization.id, inputData.workflowInput || {}) };
          case 'run-workflow':
            if (!inputData.workflowId) throw new Error('workflowId is required for operation run-workflow');
            return { result: await workflows.run(inputData.workflowId, organization.id, inputData.workflowInput || {}) };
          case 'cancel-workflow-run':
            if (!inputData.workflowRunId) throw new Error('workflowRunId is required for operation cancel-workflow-run');
            return { result: await workflows.cancelRun(inputData.workflowRunId, organization.id) };
        }
      },
    });
  }
}
