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

import { GenerateImageTool } from './generate.image.tool';

// The image/video generation tools are a SEPARATE credit-consuming path from
// the Creative Engine tools (they call MediaService.generateImage/Video, which
// spend ai_images/ai_videos credits directly). Unlike creativeGenerationTool,
// they used to have no confirmation gate at all — the model could auto-fill a
// missing post attachment mid-scheduling and silently bill the user. This
// covers the gate that was added: refuse without confirmed=true, and only
// touch the credit-spending service after explicit confirmation.

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

describe('GenerateImageTool', () => {
  let mediaService: { generateImage: jest.Mock; saveFile: jest.Mock };
  let tool: ReturnType<GenerateImageTool['run']>;

  beforeEach(() => {
    mediaService = {
      generateImage: jest.fn().mockResolvedValue('BASE64DATA'),
      saveFile: jest.fn().mockResolvedValue({ id: 'media-1', path: 'https://cdn.example.com/generated.png' }),
    };
    tool = new GenerateImageTool(mediaService as any).run();
  });

  const execute = (input: Record<string, any>) => (tool as any).execute(input, buildContext());

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

  it('generates and saves the file once confirmed=true', async () => {
    const result = await execute({ prompt: 'a cat wearing a hat', confirmed: true });
    expect(mediaService.generateImage).toHaveBeenCalledWith(
      'a cat wearing a hat',
      expect.objectContaining({ id: 'org-1' })
    );
    expect(mediaService.saveFile).toHaveBeenCalled();
    expect(result).toEqual({ id: 'media-1', path: 'https://cdn.example.com/generated.png' });
  });
});
