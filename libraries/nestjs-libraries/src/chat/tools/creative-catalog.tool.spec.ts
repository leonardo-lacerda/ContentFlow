// This tool pulls in CreativePublishService (for the `publications` lookup),
// whose module chain transitively imports posts.service.ts -> the social
// integrations manager -> nostr-tools and its own ESM dependency chain -
// none of which Jest can parse out of the box (pre-existing gap, unrelated
// to this tool: any test importing CreativePublishService hits it, including
// one for the original, untouched creative.engine.tool.ts). This test
// injects its own fake service via moduleRef anyway, so the real
// implementation is never used - mock the whole module out rather than
// chase an unknown, possibly long chain of transitive ESM packages, and
// rather than touch the shared jest config, which would risk affecting
// every other backend test.
jest.mock('@gitroom/nestjs-libraries/creative-engine/creative-publish.service', () => ({
  CreativePublishService: class CreativePublishService {},
}));

import { CreativeCatalogTool } from './creative-catalog.tool';

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

describe('CreativeCatalogTool', () => {
  let service: Record<string, jest.Mock>;
  let publishService: Record<string, jest.Mock>;
  let workflowService: Record<string, jest.Mock>;
  let moduleRef: { get: jest.Mock };
  let tool: ReturnType<CreativeCatalogTool['run']>;

  beforeEach(() => {
    delete process.env.CREATIVE_ENGINE_ENABLED;
    service = {
      listCapabilities: jest.fn().mockReturnValue(['image-generation']),
      listPresets: jest.fn().mockReturnValue([]),
      listProjects: jest.fn().mockResolvedValue([{ id: 'proj-1' }]),
      getProject: jest.fn().mockResolvedValue({ id: 'proj-1' }),
      listAssets: jest.fn().mockResolvedValue([]),
      listProducts: jest.fn().mockResolvedValue([]),
      listActors: jest.fn().mockResolvedValue([]),
      listVoices: jest.fn().mockResolvedValue([]),
      listJobs: jest.fn().mockResolvedValue([]),
      getJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
      getCreditBalance: jest.fn().mockResolvedValue({ credits: 100 }),
      getMetrics: jest.fn().mockResolvedValue({}),
    };
    publishService = { list: jest.fn().mockResolvedValue([]) };
    workflowService = {
      list: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue({ id: 'wf-1' }),
      getRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
    };
    moduleRef = {
      get: jest.fn((token: any) => {
        if (token?.name === 'CreativePublishService') return publishService;
        if (token?.name === 'CreativeWorkflowService') return workflowService;
        return service;
      }),
    };
    tool = new CreativeCatalogTool(moduleRef as any).run();
  });

  const execute = (input: Record<string, any>) => (tool as any).execute(input, buildContext());

  it('is registered under the expected tool id', () => {
    expect((tool as any).id).toBe('creativeCatalogTool');
  });

  it('dispatches project to getProject and requires projectId', async () => {
    await expect(execute({ operation: 'project' })).rejects.toThrow(/projectId is required/);
    await execute({ operation: 'project', projectId: 'proj-1' });
    expect(service.getProject).toHaveBeenCalledWith('proj-1', 'org-1');
  });

  it('dispatches job to getJob and requires jobId', async () => {
    await expect(execute({ operation: 'job' })).rejects.toThrow(/jobId is required/);
    await execute({ operation: 'job', jobId: 'job-1' });
    expect(service.getJob).toHaveBeenCalledWith('job-1', 'org-1');
  });

  it('dispatches workflow-run to the workflow service and requires workflowRunId', async () => {
    await expect(execute({ operation: 'workflow-run' })).rejects.toThrow(/workflowRunId is required/);
    await execute({ operation: 'workflow-run', workflowRunId: 'run-1' });
    expect(workflowService.getRun).toHaveBeenCalledWith('run-1', 'org-1');
  });

  it('dispatches publications to the publish service', async () => {
    await execute({ operation: 'publications', projectId: 'proj-1' });
    expect(publishService.list).toHaveBeenCalledWith('org-1', 'proj-1');
  });

  it('dispatches credits and metrics with a default maxItems', async () => {
    await execute({ operation: 'credits' });
    expect(service.getCreditBalance).toHaveBeenCalledWith('org-1');
    await execute({ operation: 'metrics' });
    expect(service.getMetrics).toHaveBeenCalledWith('org-1', 30);
  });

  it('refuses to run when the Creative Engine is disabled', async () => {
    process.env.CREATIVE_ENGINE_ENABLED = 'false';
    await expect(execute({ operation: 'capabilities' })).rejects.toThrow(/Creative Engine is disabled/);
    delete process.env.CREATIVE_ENGINE_ENABLED;
  });

  // Lets an MCP agent list real style/palette options before generate-carousel
  // (see creativeGenerationTool's stylePresetId/paletteId) instead of guessing
  // or always using the default - static catalogue data, no service call.
  it('dispatches carousel-styles to the shared design catalogue', async () => {
    const result = await execute({ operation: 'carousel-styles' });
    expect(result.result.stylePresets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'dark-premium', name: 'Premium escuro', defaultPaletteId: 'midnight-neon' }),
      ])
    );
    expect(result.result.palettes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'cobalt-cream', name: 'Azul & creme' }),
      ])
    );
    expect(result.result.stylePresets).toHaveLength(10);
    expect(result.result.palettes).toHaveLength(10);
  });
});
