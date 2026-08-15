// This tool pulls in CreativePublishService directly, whose module chain
// transitively imports posts.service.ts -> the social integrations manager
// -> nostr-tools and its own ESM dependency chain - none of which Jest can
// parse out of the box (pre-existing gap, unrelated to this tool: any test
// importing CreativePublishService hits it, including one for the original,
// untouched creative.engine.tool.ts). This test injects its own fake service
// via moduleRef anyway, so the real implementation is never used - mock the
// whole module out rather than chase an unknown, possibly long chain of
// transitive ESM packages, and rather than touch the shared jest config,
// which would risk affecting every other backend test.
jest.mock('@gitroom/nestjs-libraries/creative-engine/creative-publish.service', () => ({
  CreativePublishService: class CreativePublishService {},
}));

import { CreativePublishTool } from './creative-publish.tool';

// Safety net for the C4 split (docs/studio-audit.md) - see
// creative-generation.tool.spec.ts for the full rationale. Publish has a real
// external side effect (posting to a channel), so its confirmation gate
// matters more than most.

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

describe('CreativePublishTool', () => {
  let service: Record<string, jest.Mock>;
  let exportService: Record<string, jest.Mock>;
  let publishService: Record<string, jest.Mock>;
  let moduleRef: { get: jest.Mock };
  let tool: ReturnType<CreativePublishTool['run']>;

  beforeEach(() => {
    delete process.env.CREATIVE_ENGINE_ENABLED;
    service = { getVariantDownload: jest.fn().mockResolvedValue({ videoUrl: 'https://example.com/v.mp4' }) };
    exportService = { exportProject: jest.fn().mockResolvedValue({ zipUrl: 'https://example.com/export.zip' }) };
    publishService = { publishVariant: jest.fn().mockResolvedValue({ id: 'publication-1' }) };
    moduleRef = {
      get: jest.fn((token: any) => {
        if (token?.name === 'CreativeExportService') return exportService;
        if (token?.name === 'CreativePublishService') return publishService;
        return service;
      }),
    };
    tool = new CreativePublishTool(moduleRef as any).run();
  });

  const execute = (input: Record<string, any>) => (tool as any).execute(input, buildContext());

  it('is registered under the expected tool id', () => {
    expect((tool as any).id).toBe('creativePublishTool');
  });

  it('does not require confirmation for download (a free read)', async () => {
    await expect(execute({ operation: 'download' })).rejects.toThrow(/variantId is required/);
    await execute({ operation: 'download', variantId: 'var-1' });
    expect(service.getVariantDownload).toHaveBeenCalledWith('var-1', 'org-1');
  });

  it('rejects export-project without confirmed=true', async () => {
    await expect(execute({ operation: 'export-project', projectId: 'proj-1' })).rejects.toThrow(
      /confirmac/i
    );
    expect(exportService.exportProject).not.toHaveBeenCalled();
  });

  it('dispatches export-project once confirmed', async () => {
    await execute({ operation: 'export-project', projectId: 'proj-1', confirmed: true });
    expect(exportService.exportProject).toHaveBeenCalledWith('org-1', 'proj-1');
  });

  it('rejects publish without confirmed=true even with every other field present', async () => {
    await expect(
      execute({
        operation: 'publish',
        projectId: 'proj-1',
        variantId: 'var-1',
        integrationId: 'ig-1',
      })
    ).rejects.toThrow(/confirmac/i);
    expect(publishService.publishVariant).not.toHaveBeenCalled();
  });

  it('requires projectId, variantId and integrationId for publish', async () => {
    await expect(execute({ operation: 'publish', confirmed: true })).rejects.toThrow(
      /projectId, variantId and integrationId/
    );
  });

  it('dispatches publish with the full option set once confirmed', async () => {
    await execute({
      operation: 'publish',
      confirmed: true,
      projectId: 'proj-1',
      variantId: 'var-1',
      integrationId: 'ig-1',
      publicationType: 'now',
    });
    expect(publishService.publishVariant).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      'var-1',
      expect.objectContaining({ integrationId: 'ig-1', type: 'now' })
    );
  });
});
