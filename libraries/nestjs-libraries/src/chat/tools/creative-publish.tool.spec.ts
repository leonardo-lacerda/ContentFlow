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

import { CreativePublishTool } from './creative-publish.tool';
import { ToolConfirmationService } from '@gitroom/nestjs-libraries/chat/tool-confirmation.service';

// Safety net for the C4 split (docs/studio-audit.md) - see
// creative-generation.tool.spec.ts for the full rationale. Publish has a real
// external side effect (posting to a channel), so its confirmation gate
// matters more than most.

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

describe('CreativePublishTool', () => {
  let service: Record<string, jest.Mock>;
  let exportService: Record<string, jest.Mock>;
  let publishService: Record<string, jest.Mock>;
  let moduleRef: { get: jest.Mock };
  let tool: ReturnType<CreativePublishTool['run']>;

  beforeEach(() => {
    redisStore.clear();
    delete process.env.CREATIVE_ENGINE_ENABLED;
    service = { getVariantDownload: jest.fn().mockResolvedValue({ videoUrl: 'https://example.com/v.mp4' }) };
    exportService = { exportProject: jest.fn().mockResolvedValue({ zipUrl: 'https://example.com/export.zip' }) };
    publishService = { publishVariant: jest.fn().mockResolvedValue({ id: 'publication-1' }) };
    moduleRef = {
      get: jest.fn((token: any) => {
        if (token === ToolConfirmationService) return new ToolConfirmationService();
        if (token?.name === 'CreativeExportService') return exportService;
        if (token?.name === 'CreativePublishService') return publishService;
        return service;
      }),
    };
    tool = new CreativePublishTool(moduleRef as any).run();
  });

  const execute = (input: Record<string, any>, threadId?: string) =>
    (tool as any).execute(input, buildContext('org-1', threadId));

  // See creative-generation.tool.spec.ts's confirmedExecute for rationale:
  // every confirmation-gated operation now needs a real preceding ask.
  const confirmedExecute = async (input: Record<string, any>, threadId?: string) => {
    const { confirmed, ...rest } = input;
    await execute(rest, threadId).catch(() => {});
    return execute({ ...rest, confirmed: true }, threadId);
  };

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
    await confirmedExecute({ operation: 'export-project', projectId: 'proj-1' });
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

  // Regression coverage for the 2026-08-20 audit finding — see
  // generate.image.tool.spec.ts for the full rationale. Publish has a real
  // external side effect, so this matters more here than most tools.
  it('cannot self-confirm publish in a single call within a thread', async () => {
    await expect(
      execute(
        { operation: 'publish', projectId: 'proj-1', variantId: 'var-1', integrationId: 'ig-1', confirmed: true },
        'thread-1'
      )
    ).rejects.toThrow(/confirmac/i);
    expect(publishService.publishVariant).not.toHaveBeenCalled();
  });

  it('publishes within a thread once confirmed=true follows an earlier unconfirmed ask', async () => {
    const input = { operation: 'publish', projectId: 'proj-1', variantId: 'var-1', integrationId: 'ig-1' };
    await expect(execute(input, 'thread-1')).rejects.toThrow(/confirmac/i);
    await execute({ ...input, confirmed: true }, 'thread-1');
    expect(publishService.publishVariant).toHaveBeenCalled();
  });

  it('requires projectId, variantId and integrationId for publish', async () => {
    await expect(confirmedExecute({ operation: 'publish' })).rejects.toThrow(
      /projectId, variantId and integrationId/
    );
  });

  it('dispatches publish with the full option set once confirmed', async () => {
    await confirmedExecute({
      operation: 'publish',
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
