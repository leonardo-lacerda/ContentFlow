import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { CreativeEngineService } from '@gitroom/nestjs-libraries/creative-engine/creative-engine.service';
import { CreativeEvaluationService } from '@gitroom/nestjs-libraries/creative-engine/creative-evaluation.service';
import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

const operations = ['cancel-job', 'evaluate', 'review'] as const;

type CreativeJobInput = {
  operation: (typeof operations)[number];
  jobId?: string;
  approved?: boolean;
  score?: number;
  productFidelity?: number;
  lipSync?: number;
  captionAccuracy?: number;
  notes?: string;
};

// Job lifecycle operations split out of the former 40-operation
// creativeEngineTool (see docs/studio-audit.md, item C4). None of these
// consume credits (cancelling a job triggers a refund, it does not charge).
@Injectable()
export class CreativeJobTool implements AgentToolInterface {
  name = 'creativeJobTool';

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
      id: 'creativeJobTool',
      description:
        'Cancel a running Creative Engine job, or preflight/review its output quality. Use evaluate before presenting a finished render, and review to record approval or rejection with a score.',
      mcp: {
        annotations: {
          title: 'Creative Job',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        operation: z.enum(operations),
        jobId: z.string().optional(),
        approved: z.boolean().optional(),
        score: z.number().optional(),
        productFidelity: z.number().optional(),
        lipSync: z.number().optional(),
        captionAccuracy: z.number().optional(),
        notes: z.string().optional(),
      }),
      outputSchema: z.object({ result: z.any() }),
      execute: async (inputData: CreativeJobInput, context) => {
        checkAuth(inputData, context);
        if (process.env.CREATIVE_ENGINE_ENABLED === 'false') {
          throw new Error('Creative Engine is disabled');
        }
        const organization = this.getOrganization(context);
        const service = this.getService();

        switch (inputData.operation) {
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
        }
      },
    });
  }
}
