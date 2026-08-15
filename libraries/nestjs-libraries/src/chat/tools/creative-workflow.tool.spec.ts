import { CreativeWorkflowTool } from './creative-workflow.tool';

// Safety net for the C4 split (docs/studio-audit.md) - see
// creative-generation.tool.spec.ts for the full rationale.

const buildContext = (organizationId = 'org-1') => {
  const store = new Map<string, string>([
    ['organization', JSON.stringify({ id: organizationId })],
  ]);
  return {
    requestContext: {
      get: (key: string) => store.get(key),
      set: (key: string, value: string) => store.set(key, value),
    },
  };
};

describe('CreativeWorkflowTool', () => {
  let workflows: Record<string, jest.Mock>;
  let moduleRef: { get: jest.Mock };
  let tool: ReturnType<CreativeWorkflowTool['run']>;

  beforeEach(() => {
    delete process.env.CREATIVE_ENGINE_ENABLED;
    workflows = {
      create: jest.fn().mockResolvedValue({ id: 'wf-1' }),
      validate: jest.fn().mockResolvedValue({ valid: true }),
      quote: jest.fn().mockResolvedValue({ estimatedCredits: 50 }),
      run: jest.fn().mockResolvedValue({ id: 'run-1' }),
      cancelRun: jest.fn().mockResolvedValue({ id: 'run-1', status: 'CANCELLED' }),
    };
    moduleRef = { get: jest.fn().mockReturnValue(workflows) };
    tool = new CreativeWorkflowTool(moduleRef as any).run();
  });

  const execute = (input: Record<string, any>) => (tool as any).execute(input, buildContext());

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

  it('dispatches run-workflow with the supplied input once confirmed', async () => {
    await execute({
      operation: 'run-workflow',
      workflowId: 'wf-1',
      confirmed: true,
      workflowInput: { topic: 'coffee' },
    });
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
