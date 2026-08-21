// MediaService (imported only as a constructor type here) pulls in a
// transitive nostr-tools ESM import chain that Jest's default CJS transform
// can't parse; the tool only uses the injected instance, so stubbing the
// module is safe. Same pattern used in media.service.carousel-logo.spec.ts.
jest.mock('@gitroom/nestjs-libraries/database/prisma/media/media.service', () => ({
  MediaService: class MediaService {},
}));

jest.mock('@gitroom/nestjs-libraries/upload/upload.factory', () => ({
  UploadFactory: {
    createStorage: () => ({
      uploadSimple: jest.fn().mockResolvedValue('https://cdn.example.com/generated.png'),
    }),
  },
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

import { GenerateImageTool } from './generate.image.tool';
import { ToolConfirmationService } from '@gitroom/nestjs-libraries/chat/tool-confirmation.service';

// The image/video generation tools are a SEPARATE credit-consuming path from
// the Creative Engine tools (they call MediaService.generateImage/Video, which
// spend ai_images/ai_videos credits directly). Unlike creativeGenerationTool,
// they used to have no confirmation gate at all — the model could auto-fill a
// missing post attachment mid-scheduling and silently bill the user. This
// covers the gate that was added: refuse without confirmed=true, and only
// touch the credit-spending service after explicit confirmation.

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

describe('GenerateImageTool', () => {
  let mediaService: { generateImage: jest.Mock; saveFile: jest.Mock };
  let tool: ReturnType<GenerateImageTool['run']>;

  beforeEach(() => {
    redisStore.clear();
    mediaService = {
      generateImage: jest.fn().mockResolvedValue('BASE64DATA'),
      saveFile: jest.fn().mockResolvedValue({ id: 'media-1', path: 'https://cdn.example.com/generated.png' }),
    };
    tool = new GenerateImageTool(
      mediaService as any,
      new ToolConfirmationService()
    ).run();
  });

  const execute = (input: Record<string, any>, threadId?: string) =>
    (tool as any).execute(input, buildContext('org-1', threadId));

  it('is registered under the expected tool id', () => {
    expect((tool as any).id).toBe('generateImageTool');
  });

  it('refuses to generate without confirmed=true, spending no credits', async () => {
    await expect(execute({ prompt: 'a cat' })).rejects.toThrow(/confirmac/i);
    expect(mediaService.generateImage).not.toHaveBeenCalled();
  });

  it('refuses when confirmed is explicitly false', async () => {
    await expect(execute({ prompt: 'a cat', confirmed: false })).rejects.toThrow(/confirmac/i);
    expect(mediaService.generateImage).not.toHaveBeenCalled();
  });

  // Regression coverage for the 2026-08-20 audit CONFIRMED-1 finding: a raw
  // MCP `tools/call` has no chat threadId at all, and this used to be the
  // exact condition under which the tool trusted a bare confirmed=true with
  // no prior ask whatsoever. Without a thread, the tool now binds the
  // confirmation to the caller's organizationId instead, and still requires
  // the same two-separate-calls protocol.
  describe('with no thread context (e.g. a direct MCP call, bound by organizationId)', () => {
    it('cannot self-confirm in a single call — confirmed=true with no prior ask is rejected', async () => {
      await expect(
        execute({ prompt: 'a cat wearing a hat', confirmed: true })
      ).rejects.toThrow(/confirmac/i);
      expect(mediaService.generateImage).not.toHaveBeenCalled();
    });

    it('generates and saves the file once confirmed=true follows an earlier unconfirmed ask', async () => {
      await expect(
        execute({ prompt: 'a cat wearing a hat' })
      ).rejects.toThrow(/confirmac/i);
      expect(mediaService.generateImage).not.toHaveBeenCalled();

      const result = await execute({ prompt: 'a cat wearing a hat', confirmed: true });
      expect(mediaService.generateImage).toHaveBeenCalledWith(
        'a cat wearing a hat',
        expect.objectContaining({ id: 'org-1' })
      );
      expect(mediaService.saveFile).toHaveBeenCalled();
      expect(result).toEqual({ id: 'media-1', path: 'https://cdn.example.com/generated.png' });
    });
  });

  // Regression coverage for the 2026-08-20 audit finding: `confirmed=true`
  // used to be a bare model-controlled boolean with nothing tying it to a
  // real user turn — a prompt-injected instruction (e.g. via Brand DNA)
  // could talk the model into self-confirming in a single tool call. Inside
  // a chat thread, confirmation must now come from a SEPARATE, earlier call.
  describe('within a chat thread (two-turn confirmation)', () => {
    const threadId = 'thread-1';

    it('cannot self-confirm in a single call — confirmed=true with no prior ask is rejected', async () => {
      await expect(
        execute({ prompt: 'a cat', confirmed: true }, threadId)
      ).rejects.toThrow(/confirmac/i);
      expect(mediaService.generateImage).not.toHaveBeenCalled();
    });

    it('succeeds once confirmed=true follows an earlier unconfirmed ask for the same prompt', async () => {
      await expect(execute({ prompt: 'a cat' }, threadId)).rejects.toThrow(
        /confirmac/i
      );
      expect(mediaService.generateImage).not.toHaveBeenCalled();

      const result = await execute({ prompt: 'a cat', confirmed: true }, threadId);
      expect(mediaService.generateImage).toHaveBeenCalledWith(
        'a cat',
        expect.objectContaining({ id: 'org-1' })
      );
      expect(result).toEqual({ id: 'media-1', path: 'https://cdn.example.com/generated.png' });
    });

    it('the confirmation token is one-time use — replaying confirmed=true a second time fails', async () => {
      await expect(execute({ prompt: 'a cat' }, threadId)).rejects.toThrow();
      await execute({ prompt: 'a cat', confirmed: true }, threadId);
      mediaService.generateImage.mockClear();

      await expect(
        execute({ prompt: 'a cat', confirmed: true }, threadId)
      ).rejects.toThrow(/confirmac/i);
      expect(mediaService.generateImage).not.toHaveBeenCalled();
    });

    it('a pending ask for one prompt does not confirm a different prompt', async () => {
      await expect(execute({ prompt: 'a cat' }, threadId)).rejects.toThrow();

      await expect(
        execute({ prompt: 'a completely different dog picture', confirmed: true }, threadId)
      ).rejects.toThrow(/confirmac/i);
      expect(mediaService.generateImage).not.toHaveBeenCalled();
    });
  });
});
