// integration.schedule.post.ts imports socialIntegrationList directly from
// the integrations manager, and IntegrationService/PostsService, whose
// module chains transitively pull in nostr-tools (ESM) - Jest's default CJS
// transform can't parse it (pre-existing gap, same rationale as
// generate.image.tool.spec.ts / creative-publish.tool.spec.ts). This test
// injects its own fakes via the constructor anyway, so the real
// implementations are never used - mock the modules out.
jest.mock('@gitroom/nestjs-libraries/integrations/integration.manager', () => ({
  socialIntegrationList: [
    {
      identifier: 'mock',
      dto: undefined, // skips the settings-DTO/character-limit validation branch entirely
      maxLength: () => 1_000_000,
    },
  ],
}));
jest.mock('@gitroom/nestjs-libraries/database/prisma/integrations/integration.service', () => ({
  IntegrationService: class IntegrationService {},
}));
jest.mock('@gitroom/nestjs-libraries/database/prisma/posts/posts.service', () => ({
  PostsService: class PostsService {},
}));

// In-memory stand-in for Redis's SET/GETDEL, used by ToolConfirmationService.
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

import { IntegrationSchedulePostTool } from './integration.schedule.post';
import { ToolConfirmationService } from '@gitroom/nestjs-libraries/chat/tool-confirmation.service';

// Regression coverage for the 2026-08-20 audit finding: unlike every
// credit-spending tool (generateImageTool, creativePublishTool, ...), this
// tool - the one that actually posts to a real connected social channel -
// had NO code-level confirmation gate at all, only a system-prompt
// instruction telling the model to ask first. Combined with unfiltered
// external content reaching the agent's context (attachments/links), that
// was a plausible prompt-injection -> unauthorized real-world post chain.
// This covers the gate that was added: 'schedule'/'now' require a
// two-turn confirmed=true the same way image/video generation does;
// 'draft' (never leaves this app) is exempt.

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

const socialPost = (type: 'draft' | 'schedule' | 'now') => [
  {
    integrationId: 'int-1',
    isPremium: false,
    date: '2026-08-20T12:00:00.000Z',
    shortLink: false,
    type,
    postsAndComments: [{ content: '<p>hello</p>', attachments: [] }],
    settings: [],
  },
];

describe('IntegrationSchedulePostTool', () => {
  let postsService: { createPost: jest.Mock };
  let integrationService: { getIntegrationById: jest.Mock };
  let tool: ReturnType<IntegrationSchedulePostTool['run']>;

  beforeEach(() => {
    redisStore.clear();
    postsService = {
      createPost: jest.fn().mockResolvedValue([{ postId: 'p1', integration: 'int-1' }]),
    };
    integrationService = {
      getIntegrationById: jest
        .fn()
        .mockResolvedValue({ id: 'int-1', providerIdentifier: 'mock' }),
    };
    tool = new IntegrationSchedulePostTool(
      postsService as any,
      integrationService as any,
      new ToolConfirmationService()
    ).run();
  });

  const execute = (input: Record<string, any>, threadId?: string) =>
    (tool as any).execute(input, buildContext('org-1', threadId));

  it('is registered under the expected tool id', () => {
    expect((tool as any).id).toBe('schedulePostTool');
  });

  it('refuses to schedule (type=schedule) without confirmed=true, creating no post', async () => {
    await expect(
      execute({ socialPost: socialPost('schedule') })
    ).rejects.toThrow(/confirmac/i);
    expect(postsService.createPost).not.toHaveBeenCalled();
  });

  it('refuses to publish immediately (type=now) without confirmed=true, creating no post', async () => {
    await expect(execute({ socialPost: socialPost('now') })).rejects.toThrow(/confirmac/i);
    expect(postsService.createPost).not.toHaveBeenCalled();
  });

  it('refuses when confirmed is explicitly false', async () => {
    await expect(
      execute({ socialPost: socialPost('now'), confirmed: false })
    ).rejects.toThrow(/confirmac/i);
    expect(postsService.createPost).not.toHaveBeenCalled();
  });

  it('does NOT require confirmation for draft-only posts (never leaves this app)', async () => {
    const result = await execute({ socialPost: socialPost('draft') });
    expect(postsService.createPost).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ output: [{ postId: 'p1', integration: 'int-1' }] });
  });

  // With no thread (e.g. a direct MCP call), confirmation is bound by
  // organizationId instead and still needs a real preceding ask — see the
  // CONFIRMED-1 regression coverage in generate.image.tool.spec.ts.
  describe('with no thread context (e.g. a direct MCP call, bound by organizationId)', () => {
    it('cannot self-confirm in a single call — confirmed=true with no prior ask is rejected', async () => {
      await expect(
        execute({ socialPost: socialPost('now'), confirmed: true })
      ).rejects.toThrow(/confirmac/i);
      expect(postsService.createPost).not.toHaveBeenCalled();
    });

    it('publishes once confirmed=true follows an earlier unconfirmed ask', async () => {
      await expect(
        execute({ socialPost: socialPost('now') })
      ).rejects.toThrow(/confirmac/i);
      expect(postsService.createPost).not.toHaveBeenCalled();

      const result = await execute({ socialPost: socialPost('now'), confirmed: true });
      expect(postsService.createPost).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ output: [{ postId: 'p1', integration: 'int-1' }] });
    });
  });

  // The same two-turn protection generateImageTool has, now applied to the
  // one tool with a real external side effect: publishing to a live channel.
  describe('within a chat thread (two-turn confirmation)', () => {
    const threadId = 'thread-1';

    it('cannot self-confirm in a single call — confirmed=true with no prior ask is rejected', async () => {
      await expect(
        execute({ socialPost: socialPost('now'), confirmed: true }, threadId)
      ).rejects.toThrow(/confirmac/i);
      expect(postsService.createPost).not.toHaveBeenCalled();
    });

    it('succeeds once confirmed=true follows an earlier unconfirmed ask for the same batch', async () => {
      await expect(
        execute({ socialPost: socialPost('now') }, threadId)
      ).rejects.toThrow(/confirmac/i);
      expect(postsService.createPost).not.toHaveBeenCalled();

      const result = await execute(
        { socialPost: socialPost('now'), confirmed: true },
        threadId
      );
      expect(postsService.createPost).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ output: [{ postId: 'p1', integration: 'int-1' }] });
    });

    it('the confirmation token is one-time use — replaying confirmed=true a second time fails', async () => {
      await expect(execute({ socialPost: socialPost('now') }, threadId)).rejects.toThrow();
      await execute({ socialPost: socialPost('now'), confirmed: true }, threadId);
      postsService.createPost.mockClear();

      await expect(
        execute({ socialPost: socialPost('now'), confirmed: true }, threadId)
      ).rejects.toThrow(/confirmac/i);
      expect(postsService.createPost).not.toHaveBeenCalled();
    });

    it('a pending ask for one batch does not confirm a different batch', async () => {
      await expect(execute({ socialPost: socialPost('now') }, threadId)).rejects.toThrow();

      const differentBatch = socialPost('now');
      differentBatch[0].integrationId = 'int-2';
      await expect(
        execute({ socialPost: differentBatch, confirmed: true }, threadId)
      ).rejects.toThrow(/confirmac/i);
      expect(postsService.createPost).not.toHaveBeenCalled();
    });
  });
});
