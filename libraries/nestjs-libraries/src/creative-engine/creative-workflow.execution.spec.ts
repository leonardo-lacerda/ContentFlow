import { CreativeWorkflowService } from './creative-workflow.service';

function createHarness(mediaExecute: jest.Mock) {
  const nodes = [
    { id: 'node-1', nodeKey: 'brief', type: 'input', config: { key: 'prompt' } },
    { id: 'node-2', nodeKey: 'captions', type: 'tool.captions', config: { from: 'brief' } },
    { id: 'node-3', nodeKey: 'resize', type: 'tool.resize', config: { from: 'captions' } },
  ];
  const workflow = { id: 'workflow-1', organizationId: 'org-1', projectId: 'project-1', nodes, edges: [] };
  const run: any = {
    id: 'run-1',
    organizationId: 'org-1',
    workflowId: workflow.id,
    projectId: workflow.projectId,
    status: 'RUNNING',
    input: { prompt: 'Hook', reservationId: 'reservation-1' },
    estimatedCost: 26,
    actualCost: null,
    items: nodes.map((node, index) => ({ id: `item-${index + 1}`, runId: 'run-1', nodeKey: node.nodeKey, status: 'QUEUED', costEstimate: index === 1 ? 8 : index === 2 ? 18 : 0, costActual: null, output: null })),
    workflow,
  };
  const prisma: any = {
    creativeWorkflow: { findFirst: jest.fn().mockResolvedValue(workflow) },
    creativeWorkflowRun: {
      findFirst: jest.fn().mockImplementation(async () => run),
      update: jest.fn().mockImplementation(async ({ data }: any) => {
        Object.assign(run, data);
        return run;
      }),
    },
    creativeWorkflowRunItem: {
      update: jest.fn().mockImplementation(async ({ where, data }: any) => {
        const item = run.items.find((entry: any) => entry.id === where.id);
        Object.assign(item, data);
        return item;
      }),
    },
    creativeProvenance: { create: jest.fn().mockResolvedValue({ id: 'provenance-1' }) },
  };
  const credits = { settle: jest.fn().mockResolvedValue({}), getBalance: jest.fn() };
  const providers = { quote: jest.fn(), generate: jest.fn() };
  const webhooks = { emit: jest.fn().mockResolvedValue(undefined) };
  const validation = { validateTool: jest.fn() };
  const metrics = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new CreativeWorkflowService(
    prisma,
    credits as any,
    providers as any,
    webhooks as any,
    { execute: mediaExecute } as any,
    validation as any,
    metrics as any,
    { assertAllowed: jest.fn() } as any,
    undefined,
  );
  return { service, run, prisma, credits, webhooks, mediaExecute };
}

describe('CreativeWorkflowService execution', () => {
  it('executes media tools in DAG order and settles completed cost', async () => {
    const mediaExecute = jest.fn()
      .mockResolvedValueOnce({ url: 'https://cdn.example/captions.srt', mimeType: 'application/x-subrip' })
      .mockResolvedValueOnce({ url: 'https://cdn.example/resized.mp4', mimeType: 'video/mp4' });
    const harness = createHarness(mediaExecute);

    const result = await harness.service.executeForWorker('run-1', 'org-1');

    expect(result.status).toBe('SUCCEEDED');
    expect(mediaExecute).toHaveBeenNthCalledWith(1, 'captions', expect.objectContaining({ script: 'Hook' }));
    expect(mediaExecute).toHaveBeenNthCalledWith(2, 'resize', expect.objectContaining({ sourceUrl: 'https://cdn.example/captions.srt' }));
    expect(harness.credits.settle).toHaveBeenCalledWith('reservation-1', 26);
    expect(harness.prisma.creativeProvenance.create).toHaveBeenCalledTimes(2);
  });

  it('marks a partial run and settles only successful nodes after failure', async () => {
    const mediaExecute = jest.fn()
      .mockResolvedValueOnce({ url: 'https://cdn.example/captions.srt', mimeType: 'application/x-subrip' })
      .mockRejectedValueOnce(new Error('FFmpeg unavailable'));
    const harness = createHarness(mediaExecute);

    const result = await harness.service.executeForWorker('run-1', 'org-1');

    expect(result.status).toBe('PARTIAL');
    expect(harness.credits.settle).toHaveBeenCalledWith('reservation-1', 8);
    expect(harness.run.items[1].status).toBe('SUCCEEDED');
    expect(harness.run.items[2].status).toBe('FAILED');
  });
});
