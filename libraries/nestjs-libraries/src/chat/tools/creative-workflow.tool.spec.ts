const redisStore = new Map<string, string>();
jest.mock('@gitroom/nestjs-libraries/redis/redis.service', () => ({
  ioRedis: {
    set: jest.fn(async (key: string, value: string) => {
      redisStore.set(key, value);
      return 'OK';
    }),
    getdel: jest.fn(async (key: string) => {
      const value = redisStore.get(key);
      redisStore.delete(key);
      return value;
    }),
  },
}));

import { CreativeWorkflowTool } from './creative-workflow.tool';
import { ToolConfirmationService } from '@gitroom/nestjs-libraries/chat/tool-confirmation.service';

// Safety net for the C4 split (docs/studio-audit.md) - see
// creative-generation.tool.spec.ts for the full rationale.

const buildContext = (organizationId = 'org-1', threadId?: string) => {
  const store = new Map<string, string>([
    ['organization', JSON.stringify({ id: organizationId })],
  ]);
  return {
    requestContext: {
      get: (key: string) => store.get(key),
      set: (key: string, value: string) => store.set(key, value),
    },
    ...(threadId ? { agent: { threadId } } : {}),
  };
};

describe('CreativeWorkflowTool', () => {
  let workflows: Record<string, jest.Mock>;
  let moduleRef: { get: jest.Mock };
  let tool: ReturnType<CreativeWorkflowTool['run']>;

  beforeEach(() => {
    redisStore.clear();
    delete process.env.CREATIVE_ENGINE_ENABLED;
    workflows = {
      create: jest.fn().mockResolvedValue({ id: 'wf-1' }),
      validate: jest.fn().mockResolvedValue({ valid: true }),
      quote: jest.fn().mockResolvedValue({ estimatedCredits: 50 }),
      run: jest.fn().mockResolvedValue({ id: 'run-1' }),
      cancelRun: jest.fn().mockResolvedValue({ id: 'run-1', status: 'CANCELLED' }),
    };
    moduleRef = {
      get: jest.fn((token: any) =>
        token === ToolConfirmationService
          ? new ToolConfirmationService()
          : workflows
      ),
    };
    tool = new CreativeWorkflowTool(moduleRef as any).run();
  });

  const execute = (input: Record<string, any>, threadId?: string) =>
    (tool as any).execute(input, buildContext('org-1', threadId));

  it('is registered under the expected tool id', () => {
    expect((tool as any).id).toBe('creativeWorkflowTool');
  });

  it('requires name, nodes and edges for create-workflow (no confirmation needed)', async () => {
    await expect(execute({ operation: 'create-workflow', name: 'wf' })).rejects.toThrow(
      /name, nodes and edges are required/
    );
    await execute({ operation: 'create-workflow', name: 'wf', nodes: [], edges: [] });
    expect(workflows.create).toHaveBeenCalledWith('org-1', expect.objectContaining({ name: 'wf' }));
  });

  it('does not require confirmation for quote-workflow', async () => {
    await expect(execute({ operation: 'quote-workflow' })).rejects.toThrow(/workflowId is required/);
    await execute({ operation: 'quote-workflow', workflowId: 'wf-1' });
    expect(workflows.quote).toHaveBeenCalledWith('wf-1', 'org-1', {});
  });

  it('rejects run-workflow without confirmed=true', async () => {
    await expect(execute({ operation: 'run-workflow', workflowId: 'wf-1' })).rejects.toThrow(/confirmac/i);
    expect(workflows.run).not.toHaveBeenCalled();
  });

  // Regression coverage for the 2026-08-20 audit finding — see
  // generate.image.tool.spec.ts for the full rationale.
  it('cannot self-confirm run-workflow in a single call within a thread', async () => {
    await expect(
      execute({ operation: 'run-workflow', workflowId: 'wf-1', confirmed: true }, 'thread-1')
    ).rejects.toThrow(/confirmac/i);
    expect(workflows.run).not.toHaveBeenCalled();
  });

  it('runs within a thread once confirmed=true follows an earlier unconfirmed ask', async () => {
    const input = { operation: 'run-workflow', workflowId: 'wf-1' };
    await expect(execute(input, 'thread-1')).rejects.toThrow(/confirmac/i);
    await execute({ ...input, confirmed: true }, 'thread-1');
    expect(workflows.run).toHaveBeenCalled();
  });

  it('dispatches run-workflow with the supplied input once confirmed', async () => {
    const input = {
      operation: 'run-workflow',
      workflowId: 'wf-1',
      workflowInput: { topic: 'coffee' },
    };
    await execute(input).catch(() => {});
    await execute({ ...input, confirmed: true });
    expect(workflows.run).toHaveBeenCalledWith('wf-1', 'org-1', { topic: 'coffee' });
  });

  it('dispatches cancel-workflow-run and requires workflowRunId', async () => {
    await expect(execute({ operation: 'cancel-workflow-run' })).rejects.toThrow(
      /workflowRunId is required/
    );
    await execute({ operation: 'cancel-workflow-run', workflowRunId: 'run-1' });
    expect(workflows.cancelRun).toHaveBeenCalledWith('run-1', 'org-1');
  });
});
