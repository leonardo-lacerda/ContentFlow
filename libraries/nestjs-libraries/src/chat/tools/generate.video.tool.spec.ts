// MediaService (imported only as a constructor type) transitively pulls in a
// nostr-tools ESM chain Jest can't parse — stub the module, same as
// generate.image.tool.spec.ts / media.service.carousel-logo.spec.ts.
jest.mock('@gitroom/nestjs-libraries/database/prisma/media/media.service', () => ({
  MediaService: class MediaService {},
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

import { GenerateVideoTool } from './generate.video.tool';
import { ToolConfirmationService } from '@gitroom/nestjs-libraries/chat/tool-confirmation.service';

// Companion to generate.image.tool.spec.ts — same separate credit-consuming
// path (MediaService.generateVideo spends ai_videos credits), same
// confirmation gate added to stop the model auto-filling a missing attachment
// without asking. Covers: the description renders the available video types
// (so the constructor's getAllVideos() call is exercised), the gate refuses
// without confirmed=true, and generation dispatches once confirmed.

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

describe('GenerateVideoTool', () => {
  let mediaService: { generateVideo: jest.Mock };
  let videoManager: { getAllVideos: jest.Mock };
  let tool: ReturnType<GenerateVideoTool['run']>;

  beforeEach(() => {
    redisStore.clear();
    mediaService = {
      generateVideo: jest.fn().mockResolvedValue({ path: 'https://cdn.example.com/generated.mp4' }),
    };
    videoManager = {
      getAllVideos: jest.fn().mockReturnValue([{ title: 'Talking Avatar', identifier: 'avatar' }]),
    };
    tool = new GenerateVideoTool(
      mediaService as any,
      videoManager as any,
      new ToolConfirmationService()
    ).run();
  });

  const execute = (input: Record<string, any>, threadId?: string) =>
    (tool as any).execute(input, buildContext('org-1', threadId));

  it('is registered under the expected tool id', () => {
    expect((tool as any).id).toBe('generateVideoTool');
  });

  it('refuses to generate without confirmed=true, spending no credits', async () => {
    await expect(
      execute({ identifier: 'avatar', output: 'vertical', customParams: [] })
    ).rejects.toThrow(/confirmac/i);
    expect(mediaService.generateVideo).not.toHaveBeenCalled();
  });

  // With no thread (e.g. a direct MCP call), confirmation is bound by
  // organizationId instead and still needs a real preceding ask — see the
  // CONFIRMED-1 regression coverage in generate.image.tool.spec.ts.
  it('rejects confirmed=true with no thread and no prior ask', async () => {
    await expect(
      execute({
        identifier: 'avatar',
        output: 'vertical',
        customParams: [{ key: 'voiceId', value: 'v1' }],
        confirmed: true,
      })
    ).rejects.toThrow(/confirmac/i);
    expect(mediaService.generateVideo).not.toHaveBeenCalled();
  });

  it('generates once confirmed=true follows an earlier unconfirmed ask (no thread, org-bound)', async () => {
    const params = {
      identifier: 'avatar',
      output: 'vertical' as const,
      customParams: [{ key: 'voiceId', value: 'v1' }],
    };
    await expect(execute(params)).rejects.toThrow(/confirmac/i);
    const result = await execute({ ...params, confirmed: true });
    expect(mediaService.generateVideo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'org-1' }),
      expect.objectContaining({ type: 'avatar', output: 'vertical', customParams: { voiceId: 'v1' } })
    );
    expect(result).toEqual({ url: 'https://cdn.example.com/generated.mp4' });
  });

  // Regression coverage for the 2026-08-20 audit finding — see
  // generate.image.tool.spec.ts for the full rationale.
  describe('within a chat thread (two-turn confirmation)', () => {
    const threadId = 'thread-1';
    const params = { identifier: 'avatar', output: 'vertical' as const, customParams: [] };

    it('cannot self-confirm in a single call', async () => {
      await expect(
        execute({ ...params, confirmed: true }, threadId)
      ).rejects.toThrow(/confirmac/i);
      expect(mediaService.generateVideo).not.toHaveBeenCalled();
    });

    it('succeeds once confirmed=true follows an earlier unconfirmed ask for the same params', async () => {
      await expect(execute(params, threadId)).rejects.toThrow(/confirmac/i);
      const result = await execute({ ...params, confirmed: true }, threadId);
      expect(mediaService.generateVideo).toHaveBeenCalled();
      expect(result).toEqual({ url: 'https://cdn.example.com/generated.mp4' });
    });
  });
});
