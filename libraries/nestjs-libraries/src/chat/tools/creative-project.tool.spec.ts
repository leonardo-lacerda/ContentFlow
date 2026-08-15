import { CreativeProjectTool } from './creative-project.tool';

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

describe('CreativeProjectTool', () => {
  let service: Record<string, jest.Mock>;
  let moduleRef: { get: jest.Mock };
  let tool: ReturnType<CreativeProjectTool['run']>;

  beforeEach(() => {
    delete process.env.CREATIVE_ENGINE_ENABLED;
    service = {
      createProject: jest.fn().mockResolvedValue({ id: 'proj-1' }),
      createScript: jest.fn().mockResolvedValue({ id: 'script-1' }),
      reviseScript: jest.fn().mockResolvedValue({ id: 'script-1', version: 2 }),
    };
    moduleRef = { get: jest.fn().mockReturnValue(service) };
    tool = new CreativeProjectTool(moduleRef as any).run();
  });

  const execute = (input: Record<string, any>) => (tool as any).execute(input, buildContext());

  it('is registered under the expected tool id', () => {
    expect((tool as any).id).toBe('creativeProjectTool');
  });

  it('requires name for create-project', async () => {
    await expect(execute({ operation: 'create-project' })).rejects.toThrow(/name is required/);
    await execute({ operation: 'create-project', name: 'My Project', objective: 'sell shoes' });
    expect(service.createProject).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ name: 'My Project', objective: 'sell shoes' })
    );
  });

  it('requires projectId and brief for create-script', async () => {
    await expect(execute({ operation: 'create-script', projectId: 'proj-1' })).rejects.toThrow(
      /projectId and brief are required/
    );
    await execute({ operation: 'create-script', projectId: 'proj-1', brief: 'a story about coffee' });
    expect(service.createScript).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      expect.objectContaining({ brief: 'a story about coffee' })
    );
  });

  it('requires projectId, scriptId and brief for revise-script', async () => {
    await expect(
      execute({ operation: 'revise-script', projectId: 'proj-1', scriptId: 'script-1' })
    ).rejects.toThrow(/projectId, scriptId and brief are required/);
    await execute({
      operation: 'revise-script',
      projectId: 'proj-1',
      scriptId: 'script-1',
      brief: 'make it shorter',
    });
    expect(service.reviseScript).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      'script-1',
      expect.objectContaining({ brief: 'make it shorter' })
    );
  });
});
