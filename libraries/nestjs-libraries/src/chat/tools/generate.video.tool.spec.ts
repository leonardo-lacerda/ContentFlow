// MediaService (imported only as a constructor type) transitively pulls in a
// nostr-tools ESM chain Jest can't parse — stub the module, same as
// generate.image.tool.spec.ts / media.service.carousel-logo.spec.ts.
jest.mock('@gitroom/nestjs-libraries/database/prisma/media/media.service', () => ({
  MediaService: class MediaService {},
}));

import { GenerateVideoTool } from './generate.video.tool';

// Companion to generate.image.tool.spec.ts — same separate credit-consuming
// path (MediaService.generateVideo spends ai_videos credits), same
// confirmation gate added to stop the model auto-filling a missing attachment
// without asking. Covers: the description renders the available video types
// (so the constructor's getAllVideos() call is exercised), the gate refuses
// without confirmed=true, and generation dispatches once confirmed.

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

describe('GenerateVideoTool', () => {
  let mediaService: { generateVideo: jest.Mock };
  let videoManager: { getAllVideos: jest.Mock };
  let tool: ReturnType<GenerateVideoTool['run']>;

  beforeEach(() => {
    mediaService = {
      generateVideo: jest.fn().mockResolvedValue({ path: 'https://cdn.example.com/generated.mp4' }),
    };
    videoManager = {
      getAllVideos: jest.fn().mockReturnValue([{ title: 'Talking Avatar', identifier: 'avatar' }]),
    };
    tool = new GenerateVideoTool(mediaService as any, videoManager as any).run();
  });

  const execute = (input: Record<string, any>) => (tool as any).execute(input, buildContext());

  it('is registered under the expected tool id', () => {
    expect((tool as any).id).toBe('generateVideoTool');
  });

  it('refuses to generate without confirmed=true, spending no credits', async () => {
    await expect(
      execute({ identifier: 'avatar', output: 'vertical', customParams: [] })
    ).rejects.toThrow(/confirmac/i);
    expect(mediaService.generateVideo).not.toHaveBeenCalled();
  });

  it('generates once confirmed=true', async () => {
    const result = await execute({
      identifier: 'avatar',
      output: 'vertical',
      customParams: [{ key: 'voiceId', value: 'v1' }],
      confirmed: true,
    });
    expect(mediaService.generateVideo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'org-1' }),
      expect.objectContaining({ type: 'avatar', output: 'vertical', customParams: { voiceId: 'v1' } })
    );
    expect(result).toEqual({ url: 'https://cdn.example.com/generated.mp4' });
  });
});
