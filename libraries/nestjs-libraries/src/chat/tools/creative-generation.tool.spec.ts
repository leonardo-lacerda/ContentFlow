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

import { CreativeGenerationTool } from './creative-generation.tool';
import { ToolConfirmationService } from '@gitroom/nestjs-libraries/chat/tool-confirmation.service';

// Safety net for the C4 split (docs/studio-audit.md): creative.engine.tool.ts
// had zero test coverage before this, so a mis-copied case body when
// splitting it into 6 smaller tools could only have surfaced in production.
// This covers the highest-stakes of the six (every operation here consumes
// credits): required-field validation, the confirmation gate, and that each
// operation dispatches to the right service method with the right args.

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

describe('CreativeGenerationTool', () => {
  let service: Record<string, jest.Mock>;
  let moduleRef: { get: jest.Mock };
  let tool: ReturnType<CreativeGenerationTool['run']>;
  let previousEnabledFlag: string | undefined;

  beforeEach(() => {
    redisStore.clear();
    previousEnabledFlag = process.env.CREATIVE_ENGINE_ENABLED;
    delete process.env.CREATIVE_ENGINE_ENABLED;

    service = {
      runPreset: jest.fn().mockResolvedValue({ id: 'job-preset' }),
      createProject: jest.fn().mockResolvedValue({ id: 'proj-auto' }),
      generateImage: jest.fn().mockResolvedValue({ id: 'job-image' }),
      generateCarouselImages: jest.fn().mockResolvedValue({ projectId: 'proj-1', jobs: [] }),
      quoteTool: jest.fn().mockResolvedValue({ estimatedCredits: 3 }),
      runTool: jest.fn().mockResolvedValue({ id: 'job-tool' }),
      quoteVariant: jest.fn().mockResolvedValue({ estimatedCredits: 5 }),
      quoteVariantMatrix: jest.fn().mockResolvedValue({ estimatedCredits: 20 }),
      generateVariant: jest.fn().mockResolvedValue({ id: 'variant-1' }),
      generateVariantMatrix: jest.fn().mockResolvedValue({ variants: [] }),
      localizeVariant: jest.fn().mockResolvedValue({ id: 'variant-2' }),
    };
    moduleRef = {
      get: jest.fn((token: any) =>
        token === ToolConfirmationService
          ? new ToolConfirmationService()
          : service
      ),
    };
    tool = new CreativeGenerationTool(moduleRef as any).run();
  });

  afterEach(() => {
    if (previousEnabledFlag === undefined) delete process.env.CREATIVE_ENGINE_ENABLED;
    else process.env.CREATIVE_ENGINE_ENABLED = previousEnabledFlag;
  });

  const execute = (input: Record<string, any>, threadId?: string) =>
    (tool as any).execute(input, buildContext('org-1', threadId));

  // With no thread (or within one), a credit-consuming operation now always
  // needs a real preceding "ask" call before confirmed=true is honoured —
  // see the CONFIRMED-1 regression coverage in generate.image.tool.spec.ts.
  // Tests that exercise dispatch/validation logic PAST the confirmation
  // gate use this to get there, mirroring what a real two-turn interaction
  // does; it is not itself a test of the confirmation gate (that has its
  // own dedicated tests below and in tool-confirmation.service.spec.ts).
  const confirmedExecute = async (input: Record<string, any>, threadId?: string) => {
    const { confirmed, ...rest } = input;
    await execute(rest, threadId).catch(() => {});
    return execute({ ...rest, confirmed: true }, threadId);
  };

  it('is registered under the expected tool id', () => {
    expect((tool as any).id).toBe('creativeGenerationTool');
  });

  it('rejects a credit-consuming operation without confirmed=true', async () => {
    await expect(
      execute({ operation: 'generate-image', prompt: 'a cat', confirmed: false })
    ).rejects.toThrow(/confirmac/i);
    expect(service.generateImage).not.toHaveBeenCalled();
  });

  // Regression coverage for the 2026-08-20 audit finding — see
  // generate.image.tool.spec.ts for the full rationale: inside a chat
  // thread, confirmed=true must follow a separate, earlier unconfirmed call.
  it('cannot self-confirm a credit-consuming operation in a single call within a thread', async () => {
    await expect(
      execute(
        { operation: 'generate-image', prompt: 'a cat', confirmed: true },
        'thread-1'
      )
    ).rejects.toThrow(/confirmac/i);
    expect(service.generateImage).not.toHaveBeenCalled();
  });

  it('succeeds within a thread once confirmed=true follows an earlier unconfirmed ask', async () => {
    const input = { operation: 'generate-image', prompt: 'a cat', projectId: 'proj-1' };
    await expect(execute(input, 'thread-1')).rejects.toThrow(/confirmac/i);
    await execute({ ...input, confirmed: true }, 'thread-1');
    expect(service.generateImage).toHaveBeenCalled();
  });

  it('rejects generate-image without a prompt', async () => {
    await expect(confirmedExecute({ operation: 'generate-image' })).rejects.toThrow(
      /prompt is required/
    );
  });

  it('dispatches generate-image to the service with an existing project', async () => {
    const result = await confirmedExecute({
      operation: 'generate-image',
      projectId: 'proj-1',
      prompt: 'a cat wearing a hat',
      aspectRatio: '1:1',
    });
    expect(service.createProject).not.toHaveBeenCalled();
    expect(service.generateImage).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      expect.objectContaining({ prompt: expect.stringContaining('a cat wearing a hat'), aspectRatio: '1:1' })
    );
    expect(result).toEqual({ result: { id: 'job-image' } });
  });

  it('creates a project first when generate-image has no projectId', async () => {
    await confirmedExecute({ operation: 'generate-image', prompt: 'a dog' });
    expect(service.createProject).toHaveBeenCalledWith('org-1', expect.objectContaining({ objective: 'a dog' }));
    expect(service.generateImage).toHaveBeenCalledWith('org-1', 'proj-auto', expect.anything());
  });

  it('rejects generate-carousel without slides', async () => {
    await expect(confirmedExecute({ operation: 'generate-carousel', designApproved: true })).rejects.toThrow(
      /slides are required/
    );
  });

  it('rejects generate-carousel without designApproved', async () => {
    await expect(
      confirmedExecute({
        operation: 'generate-carousel',
        slides: [{ imagePrompt: 'p' }],
      })
    ).rejects.toThrow(/designApproved=true/);
  });

  it('dispatches generate-carousel including the brief field (fidelity with the original tool)', async () => {
    await confirmedExecute({
      operation: 'generate-carousel',
      designApproved: true,
      projectId: 'proj-1',
      brief: 'a carousel about coffee',
      slides: [{ imagePrompt: 'slide 1' }],
    });
    expect(service.generateCarouselImages).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ brief: 'a carousel about coffee', projectId: 'proj-1' })
    );
  });

  it('passes stylePresetId/paletteId/density/alignment through to generateCarouselImages', async () => {
    await confirmedExecute({
      operation: 'generate-carousel',
      designApproved: true,
      projectId: 'proj-1',
      slides: [{ imagePrompt: 'slide 1' }],
      stylePresetId: 'dark-premium',
      paletteId: 'mint-fresh',
      density: 'dense',
      alignment: 'center',
    });
    expect(service.generateCarouselImages).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        stylePresetId: 'dark-premium',
        paletteId: 'mint-fresh',
        density: 'dense',
        alignment: 'center',
      })
    );
  });

  it('passes a per-slide styleOverride through to generateCarouselImages untouched', async () => {
    await confirmedExecute({
      operation: 'generate-carousel',
      designApproved: true,
      projectId: 'proj-1',
      slides: [
        { id: 'slide-1', imagePrompt: 'slide 1' },
        { id: 'slide-2', imagePrompt: 'slide 2', styleOverride: { paletteId: 'sunset-pop' } },
      ],
    });
    expect(service.generateCarouselImages).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        slides: [
          { id: 'slide-1', imagePrompt: 'slide 1' },
          { id: 'slide-2', imagePrompt: 'slide 2', styleOverride: { paletteId: 'sunset-pop' } },
        ],
      })
    );
  });

  it('requires projectId and presetId for run-preset', async () => {
    await expect(confirmedExecute({ operation: 'run-preset' })).rejects.toThrow(
      /projectId and presetId are required/
    );
  });

  it('dispatches run-preset with the full option set', async () => {
    await confirmedExecute({
      operation: 'run-preset',
      projectId: 'proj-1',
      presetId: 'preset-1',
      actorId: 'actor-1',
    });
    expect(service.runPreset).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      'preset-1',
      expect.objectContaining({ actorId: 'actor-1' })
    );
  });

  it('does not require confirmation for quote (read-only)', async () => {
    await execute({ operation: 'quote', projectId: 'proj-1' });
    expect(service.quoteVariant).toHaveBeenCalledWith('org-1', 'proj-1', expect.anything());
  });

  it('requires projectId for quote', async () => {
    await expect(execute({ operation: 'quote' })).rejects.toThrow(/projectId is required/);
  });

  it('dispatches localize with all required fields', async () => {
    await confirmedExecute({
      operation: 'localize',
      projectId: 'proj-1',
      variantId: 'var-1',
      targetLanguage: 'es',
    });
    expect(service.localizeVariant).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      'var-1',
      expect.objectContaining({ targetLanguage: 'es' })
    );
  });

  it('rejects localize when a required field is missing', async () => {
    await expect(
      confirmedExecute({ operation: 'localize', projectId: 'proj-1' })
    ).rejects.toThrow(/projectId, variantId and targetLanguage/);
  });

  it('refuses to run when the Creative Engine is disabled', async () => {
    process.env.CREATIVE_ENGINE_ENABLED = 'false';
    await expect(execute({ operation: 'quote', projectId: 'proj-1' })).rejects.toThrow(
      /Creative Engine is disabled/
    );
  });
});
