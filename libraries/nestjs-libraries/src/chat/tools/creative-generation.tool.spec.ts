import { CreativeGenerationTool } from './creative-generation.tool';

// Safety net for the C4 split (docs/studio-audit.md): creative.engine.tool.ts
// had zero test coverage before this, so a mis-copied case body when
// splitting it into 6 smaller tools could only have surfaced in production.
// This covers the highest-stakes of the six (every operation here consumes
// credits): required-field validation, the confirmation gate, and that each
// operation dispatches to the right service method with the right args.

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

describe('CreativeGenerationTool', () => {
  let service: Record<string, jest.Mock>;
  let moduleRef: { get: jest.Mock };
  let tool: ReturnType<CreativeGenerationTool['run']>;
  let previousEnabledFlag: string | undefined;

  beforeEach(() => {
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
    moduleRef = { get: jest.fn().mockReturnValue(service) };
    tool = new CreativeGenerationTool(moduleRef as any).run();
  });

  afterEach(() => {
    if (previousEnabledFlag === undefined) delete process.env.CREATIVE_ENGINE_ENABLED;
    else process.env.CREATIVE_ENGINE_ENABLED = previousEnabledFlag;
  });

  const execute = (input: Record<string, any>) => (tool as any).execute(input, buildContext());

  it('is registered under the expected tool id', () => {
    expect((tool as any).id).toBe('creativeGenerationTool');
  });

  it('rejects a credit-consuming operation without confirmed=true', async () => {
    await expect(
      execute({ operation: 'generate-image', prompt: 'a cat', confirmed: false })
    ).rejects.toThrow(/confirmac/i);
    expect(service.generateImage).not.toHaveBeenCalled();
  });

  it('rejects generate-image without a prompt', async () => {
    await expect(execute({ operation: 'generate-image', confirmed: true })).rejects.toThrow(
      /prompt is required/
    );
  });

  it('dispatches generate-image to the service with an existing project', async () => {
    const result = await execute({
      operation: 'generate-image',
      confirmed: true,
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
    await execute({ operation: 'generate-image', confirmed: true, prompt: 'a dog' });
    expect(service.createProject).toHaveBeenCalledWith('org-1', expect.objectContaining({ objective: 'a dog' }));
    expect(service.generateImage).toHaveBeenCalledWith('org-1', 'proj-auto', expect.anything());
  });

  it('rejects generate-carousel without slides', async () => {
    await expect(execute({ operation: 'generate-carousel', confirmed: true, designApproved: true })).rejects.toThrow(
      /slides are required/
    );
  });

  it('rejects generate-carousel without designApproved', async () => {
    await expect(
      execute({
        operation: 'generate-carousel',
        confirmed: true,
        slides: [{ imagePrompt: 'p' }],
      })
    ).rejects.toThrow(/designApproved=true/);
  });

  it('dispatches generate-carousel including the brief field (fidelity with the original tool)', async () => {
    await execute({
      operation: 'generate-carousel',
      confirmed: true,
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
    await execute({
      operation: 'generate-carousel',
      confirmed: true,
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
    await execute({
      operation: 'generate-carousel',
      confirmed: true,
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
    await expect(execute({ operation: 'run-preset', confirmed: true })).rejects.toThrow(
      /projectId and presetId are required/
    );
  });

  it('dispatches run-preset with the full option set', async () => {
    await execute({
      operation: 'run-preset',
      confirmed: true,
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
    await execute({
      operation: 'localize',
      confirmed: true,
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
      execute({ operation: 'localize', confirmed: true, projectId: 'proj-1' })
    ).rejects.toThrow(/projectId, variantId and targetLanguage/);
  });

  it('refuses to run when the Creative Engine is disabled', async () => {
    process.env.CREATIVE_ENGINE_ENABLED = 'false';
    await expect(execute({ operation: 'quote', projectId: 'proj-1' })).rejects.toThrow(
      /Creative Engine is disabled/
    );
  });
});
