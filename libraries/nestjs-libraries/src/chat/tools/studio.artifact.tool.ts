import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { StudioArtifactService } from '@gitroom/nestjs-libraries/chat/studio/studio-artifact.service';

const operations = [
  'list',
  'get',
  'versions',
  'save',
  'revise',
  'restore-version',
  'approve',
  'reject',
  'archive',
  'restore',
  'duplicate',
  'attach',
] as const;

type StudioArtifactInput = {
  operation: (typeof operations)[number];
  artifactId?: string;
  version?: number;
  type?: string;
  title?: string;
  status?: string;
  content?: unknown;
  changeSummary?: string;
  reason?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  storageUrl?: string;
  kind?: string;
};

@Injectable()
export class StudioArtifactTool implements AgentToolInterface {
  name = 'studioArtifactTool';

  constructor(private readonly moduleRef: ModuleRef) {}

  private service() {
    const service = this.moduleRef.get(StudioArtifactService, { strict: false });
    if (!service) throw new Error('Studio artifact storage is not available');
    return service;
  }

  private organization(context: any) {
    const raw = context?.requestContext?.get('organization');
    if (!raw) throw new Error('Esta operação exige uma organização autenticada.');
    return JSON.parse(raw) as { id: string };
  }

  run() {
    return createTool({
      id: 'studioArtifactTool',
      description:
        'Manage durable ContentFlow Studio artifacts and their versions. Use this to save explicit user-approved drafts, revise without losing history, restore a previous version, approve/reject, archive/restore, duplicate, list versions or attach a file/link to an artifact. Do not save unsolicited content.',
      mcp: {
        annotations: {
          title: 'Studio Artifacts',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },
      inputSchema: z.object({
        operation: z.enum(operations),
        artifactId: z.string().optional(),
        version: z.number().int().positive().optional(),
        type: z.string().max(80).optional(),
        title: z.string().max(240).optional(),
        status: z.string().max(40).optional(),
        content: z.any().optional(),
        changeSummary: z.string().max(500).optional(),
        reason: z.string().max(2000).optional(),
        filename: z.string().max(500).optional(),
        mimeType: z.string().max(160).optional(),
        size: z.number().int().nonnegative().optional(),
        storageUrl: z.string().max(4000).optional(),
        kind: z.string().max(80).optional(),
      }),
      outputSchema: z.object({ result: z.any() }),
      execute: async (input: StudioArtifactInput, context) => {
        checkAuth(input, context);
        const organization = this.organization(context);
        const service = this.service();
        const threadId = context?.agent?.threadId;

        switch (input.operation) {
          case 'list':
            return { result: await service.list(organization.id, { threadId, type: input.type }) };
          case 'get':
            if (!input.artifactId) throw new Error('artifactId is required for operation get');
            return { result: await service.get(input.artifactId, organization.id) };
          case 'versions':
            if (!input.artifactId) throw new Error('artifactId is required for operation versions');
            return { result: await service.listVersions(input.artifactId, organization.id) };
          case 'save':
            if (!input.type || !input.title || input.content === undefined) {
              throw new Error('type, title and content are required for operation save');
            }
            return {
              result: await service.create(organization.id, {
                threadId,
                type: input.type,
                title: input.title,
                status: input.status,
                content: input.content,
                source: 'chat',
              }),
            };
          case 'revise':
            if (!input.artifactId || input.content === undefined) {
              throw new Error('artifactId and content are required for operation revise');
            }
            return {
              result: await service.createVersion(input.artifactId, organization.id, {
                content: input.content,
                title: input.title,
                status: input.status,
                changeSummary: input.changeSummary,
              }),
            };
          case 'restore-version':
            if (!input.artifactId || !input.version) {
              throw new Error('artifactId and version are required for operation restore-version');
            }
            return { result: await service.restoreVersion(input.artifactId, organization.id, input.version) };
          case 'approve':
            if (!input.artifactId) throw new Error('artifactId is required for operation approve');
            return { result: await service.approve(input.artifactId, organization.id) };
          case 'reject':
            if (!input.artifactId) throw new Error('artifactId is required for operation reject');
            return { result: await service.reject(input.artifactId, organization.id, input.reason) };
          case 'archive':
            if (!input.artifactId) throw new Error('artifactId is required for operation archive');
            return { result: await service.archive(input.artifactId, organization.id) };
          case 'restore':
            if (!input.artifactId) throw new Error('artifactId is required for operation restore');
            return { result: await service.restore(input.artifactId, organization.id) };
          case 'duplicate':
            if (!input.artifactId) throw new Error('artifactId is required for operation duplicate');
            return { result: await service.duplicate(input.artifactId, organization.id, input.title) };
          case 'attach':
            if (!input.filename || !input.storageUrl) {
              throw new Error('filename and storageUrl are required for operation attach');
            }
            return {
              result: await service.addAttachment(organization.id, {
                artifactId: input.artifactId,
                threadId,
                kind: input.kind,
                filename: input.filename,
                mimeType: input.mimeType,
                size: input.size,
                storageUrl: input.storageUrl,
              }),
            };
        }
      },
    });
  }
}
