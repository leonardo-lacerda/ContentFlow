import { BadRequestException } from '@nestjs/common';
import { CreativeWorkflowService } from './creative-workflow.service';

describe('CreativeWorkflowService', () => {
  const prisma = {
    creativeWorkflow: {
      create: jest.fn().mockResolvedValue({ id: 'workflow-1' }),
    },
  } as any;
  const service = new CreativeWorkflowService(prisma, {} as any, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('persists a valid acyclic workflow', async () => {
    await service.create('org-1', {
      name: 'Ad pipeline',
      nodes: [
        { nodeKey: 'brief', type: 'input' },
        { nodeKey: 'video', type: 'generate.video' },
        { nodeKey: 'output', type: 'output' },
      ],
      edges: [
        { sourceNode: 'brief', targetNode: 'video' },
        { sourceNode: 'video', targetNode: 'output' },
      ],
    });

    expect(prisma.creativeWorkflow.create).toHaveBeenCalledTimes(1);
  });

  it('rejects cycles and edges to unknown nodes', async () => {
    await expect(
      service.create('org-1', {
        name: 'Cycle',
        nodes: [
          { nodeKey: 'a', type: 'input' },
          { nodeKey: 'b', type: 'output' },
        ],
        edges: [
          { sourceNode: 'a', targetNode: 'b' },
          { sourceNode: 'b', targetNode: 'a' },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create('org-1', {
        name: 'Unknown edge',
        nodes: [{ nodeKey: 'a', type: 'input' }],
        edges: [{ sourceNode: 'a', targetNode: 'missing' }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('includes media tools in the quote and rejects an unsupported node type', async () => {
    const quotePrisma = {
      creativeWorkflow: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'workflow-2',
          organizationId: 'org-1',
          deletedAt: null,
          nodes: [
            { nodeKey: 'input', type: 'input', config: {} },
            { nodeKey: 'captions', type: 'tool.captions', config: {} },
          ],
          edges: [],
        }),
      },
    } as any;
    const credits = { getBalance: jest.fn().mockResolvedValue({ balance: 100, reserved: 0 }) } as any;
    const providers = { quote: jest.fn() } as any;
    const toolService = new CreativeWorkflowService(quotePrisma, credits, providers, {} as any);

    const result = await toolService.quote('workflow-2', 'org-1', { script: 'Hook' });
    expect(result.estimatedCredits).toBe(8);
    expect(result.items).toEqual(expect.arrayContaining([expect.objectContaining({ nodeKey: 'captions', credits: 8 })]));

    await expect(
      toolService.create('org-1', {
        name: 'Invalid',
        nodes: [{ nodeKey: 'bad', type: 'unknown.node' }],
        edges: [],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('duplicates a workflow contract and exposes its cost ceiling', async () => {
    const workflow = {
      id: 'workflow-template',
      organizationId: 'org-1',
      projectId: null,
      name: 'Template',
      version: 3,
      maxCredits: 25,
      status: 'ACTIVE',
      deletedAt: null,
      nodes: [{ nodeKey: 'captions', type: 'tool.captions', config: {}, inputSchema: { script: 'string' }, outputSchema: { url: 'string' }, position: null }],
      edges: [],
    };
    const duplicatePrisma = {
      creativeWorkflow: {
        findFirst: jest.fn().mockResolvedValue(workflow),
        create: jest.fn().mockResolvedValue({ id: 'workflow-copy' }),
      },
    } as any;
    const duplicateService = new CreativeWorkflowService(duplicatePrisma, {} as any, {} as any, {} as any);

    await duplicateService.duplicate('workflow-template', 'org-1', { name: 'Template copy', version: 1 });

    expect(duplicatePrisma.creativeWorkflow.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'Template copy', version: 1, maxCredits: 25 }),
    }));

    const quotePrisma = {
      creativeWorkflow: { findFirst: jest.fn().mockResolvedValue(workflow) },
    } as any;
    const quoteService = new CreativeWorkflowService(
      quotePrisma,
      { getBalance: jest.fn().mockResolvedValue({ balance: 100 }) } as any,
      {} as any,
      {} as any,
    );
    const quote = await quoteService.quote('workflow-template', 'org-1', { script: 'Hook' });
    expect(quote.withinMaxCredits).toBe(true);
    expect(quote.maxCredits).toBe(25);
  });
});
