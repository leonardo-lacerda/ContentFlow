import { ContentStudioTool } from './content.studio.tool';

// This tool is the central write path across 3 of the 4 persistence silos the
// Studio robustness audit (docs/studio-robustness-audit.md, R6) found
// fragmented: it creates/updates ContentIdea and CarouselProject rows, mirrors
// them into StudioArtifact (durable drafts/versions), and links both into the
// Mastra thread's own metadata - and had zero tests before this file, despite
// being the exact kind of "many silos, no shared identity" code that keeps
// causing regressions elsewhere in the Studio. These tests lock down its
// current, real behavior so a future change here has to break a test first.

const buildContext = (
  organizationId = 'org-1',
  overrides: Partial<{ threadId: string; mastra: any }> = {}
) => {
  const store = new Map<string, string>([
    ['organization', JSON.stringify({ id: organizationId })],
  ]);
  return {
    requestContext: {
      get: (key: string) => store.get(key),
      set: (key: string, value: string) => store.set(key, value),
    },
    agent: overrides.threadId ? { threadId: overrides.threadId } : undefined,
    mastra: overrides.mastra,
  };
};

describe('ContentStudioTool', () => {
  let contentIdeaService: Record<string, jest.Mock>;
  let carouselProjectService: Record<string, jest.Mock>;
  let brandProfileService: Record<string, jest.Mock>;
  let studioArtifactService: Record<string, jest.Mock>;
  let moduleRef: { get: jest.Mock };
  let tool: ReturnType<ContentStudioTool['run']>;

  beforeEach(() => {
    contentIdeaService = {
      getIdeas: jest.fn().mockResolvedValue([{ id: 'idea-1' }]),
      createIdea: jest.fn().mockResolvedValue({ id: 'idea-1', title: 'Ideia' }),
    };
    carouselProjectService = {
      getProjects: jest.fn().mockResolvedValue([{ id: 'car-1' }]),
      createProject: jest.fn().mockResolvedValue({ id: 'car-1', title: 'Carrossel' }),
      updateProject: jest.fn().mockResolvedValue({ id: 'car-1', title: 'Carrossel atualizado' }),
    };
    brandProfileService = {
      getBrand: jest.fn().mockResolvedValue({ id: 'brand-explicit' }),
      getSelectedBrand: jest.fn().mockResolvedValue({ id: 'brand-selected' }),
      getBrands: jest.fn().mockResolvedValue([{ id: 'brand-first' }]),
    };
    studioArtifactService = {
      create: jest.fn().mockResolvedValue({ id: 'artifact-1' }),
      list: jest.fn().mockResolvedValue([]),
      createVersion: jest.fn().mockResolvedValue({ id: 'artifact-1', version: 2 }),
    };
    moduleRef = {
      get: jest.fn((token: any) => {
        const name = token?.name;
        if (name === 'ContentIdeaService') return contentIdeaService;
        if (name === 'CarouselProjectService') return carouselProjectService;
        if (name === 'BrandProfileService') return brandProfileService;
        if (name === 'StudioArtifactService') return studioArtifactService;
        return null;
      }),
    };
    tool = new ContentStudioTool(moduleRef as any).run();
  });

  const execute = (input: Record<string, any>, context: any = buildContext()) =>
    (tool as any).execute(input, context);

  describe('list-ideas / list-carousels', () => {
    it('passes through the ideas list for the caller\'s organization', async () => {
      const out = await execute({ operation: 'list-ideas' }, buildContext('org-42'));
      expect(contentIdeaService.getIdeas).toHaveBeenCalledWith('org-42');
      expect(out.result).toEqual({ type: 'IDEA_LIST', ideas: [{ id: 'idea-1' }] });
    });

    it('passes through the carousel library for the caller\'s organization', async () => {
      const out = await execute({ operation: 'list-carousels' }, buildContext('org-42'));
      expect(carouselProjectService.getProjects).toHaveBeenCalledWith('org-42');
      expect(out.result).toEqual({ type: 'CAROUSEL_LIBRARY', carousels: [{ id: 'car-1' }] });
    });
  });

  describe('save-idea', () => {
    const validIdea = { operation: 'save-idea', title: 'T', hook: 'H', goal: 'G', angle: 'A' };

    it('throws when a required field is missing', async () => {
      await expect(execute({ operation: 'save-idea', title: 'T' })).rejects.toThrow(
        /title, hook, goal e angle são obrigatórios/
      );
    });

    it('resolves the brand by explicit brandProfileId first', async () => {
      await execute({ ...validIdea, brandProfileId: 'b-x' });
      expect(brandProfileService.getBrand).toHaveBeenCalledWith('b-x', 'org-1');
      expect(contentIdeaService.createIdea).toHaveBeenCalledWith(
        expect.objectContaining({ brandProfileId: 'brand-explicit' })
      );
    });

    it('falls back to the selected brand, then the first brand, then throws', async () => {
      brandProfileService.getBrand.mockResolvedValue(null);
      await execute(validIdea);
      expect(contentIdeaService.createIdea).toHaveBeenCalledWith(
        expect.objectContaining({ brandProfileId: 'brand-selected' })
      );

      brandProfileService.getSelectedBrand.mockResolvedValue(null);
      await execute(validIdea);
      expect(contentIdeaService.createIdea).toHaveBeenLastCalledWith(
        expect.objectContaining({ brandProfileId: 'brand-first' })
      );

      brandProfileService.getBrands.mockResolvedValue([]);
      await expect(execute(validIdea)).rejects.toThrow(/Configure uma marca/);
    });

    it('scales a 0-10 score to 0-100, but leaves an already-0-100 score untouched', async () => {
      await execute({ ...validIdea, score: 8 });
      expect(contentIdeaService.createIdea).toHaveBeenLastCalledWith(
        expect.objectContaining({ score: 80 })
      );

      await execute({ ...validIdea, score: 85 });
      expect(contentIdeaService.createIdea).toHaveBeenLastCalledWith(
        expect.objectContaining({ score: 85 })
      );
    });

    it('mirrors the created idea into StudioArtifact and returns both', async () => {
      const out = await execute(validIdea);
      expect(studioArtifactService.create).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          type: 'IDEA',
          metadata: expect.objectContaining({ sourceId: 'idea-1' }),
        })
      );
      expect(out.result).toEqual({
        type: 'IDEA',
        artifact: { id: 'idea-1', title: 'Ideia' },
        studioArtifact: { id: 'artifact-1' },
      });
    });

    it('still saves the idea even if StudioArtifact mirroring is unavailable', async () => {
      moduleRef.get.mockImplementation((token: any) => {
        const name = token?.name;
        if (name === 'ContentIdeaService') return contentIdeaService;
        if (name === 'CarouselProjectService') return carouselProjectService;
        if (name === 'BrandProfileService') return brandProfileService;
        return null; // StudioArtifactService unavailable
      });
      const out = await execute(validIdea);
      expect(out.result.artifact).toEqual({ id: 'idea-1', title: 'Ideia' });
      expect(out.result.studioArtifact).toBeNull();
    });
  });

  describe('save-carousel', () => {
    const validCarousel = {
      operation: 'save-carousel',
      title: 'T',
      slides: [{ headline: 'H1', body: 'B1' }, { headline: 'H2', body: 'B2' }],
    };

    it('throws when title or slides are missing', async () => {
      await expect(execute({ operation: 'save-carousel', title: 'T' })).rejects.toThrow(
        /title e slides são obrigatórios/
      );
    });

    it('defaults each slide\'s index to its array position when not provided', async () => {
      await execute(validCarousel);
      expect(carouselProjectService.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          slides: [
            expect.objectContaining({ headline: 'H1', index: 0 }),
            expect.objectContaining({ headline: 'H2', index: 1 }),
          ],
        })
      );
    });

    it('preserves an explicit slide index instead of overwriting it', async () => {
      await execute({
        ...validCarousel,
        slides: [{ headline: 'H1', body: 'B1', index: 7 }],
      });
      expect(carouselProjectService.createProject).toHaveBeenCalledWith(
        expect.objectContaining({ slides: [expect.objectContaining({ index: 7 })] })
      );
    });

    it('mirrors the created carousel into StudioArtifact and returns both', async () => {
      const out = await execute(validCarousel);
      expect(studioArtifactService.create).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          type: 'CAROUSEL',
          metadata: expect.objectContaining({ sourceId: 'car-1' }),
        })
      );
      expect(out.result.type).toBe('CAROUSEL');
      expect(out.result.artifact).toEqual({ id: 'car-1', title: 'Carrossel' });
    });
  });

  describe('update-carousel', () => {
    it('throws without carouselProjectId', async () => {
      await expect(execute({ operation: 'update-carousel', title: 'T' })).rejects.toThrow(
        /carouselProjectId e obrigatorio/
      );
    });

    it('throws when no updatable field is provided', async () => {
      await expect(
        execute({ operation: 'update-carousel', carouselProjectId: 'car-1' })
      ).rejects.toThrow(/Informe ao menos um campo/);
    });

    it('creates a new StudioArtifact version when a prior mirrored artifact exists for this carousel', async () => {
      studioArtifactService.list.mockResolvedValue([
        { id: 'artifact-1', metadata: { sourceId: 'car-1' } },
      ]);
      const out = await execute({
        operation: 'update-carousel',
        carouselProjectId: 'car-1',
        title: 'Novo título',
      }, buildContext('org-1', { threadId: 'thread-1' }));
      expect(studioArtifactService.createVersion).toHaveBeenCalledWith(
        'artifact-1',
        'org-1',
        expect.objectContaining({ changeSummary: 'Revisado pelo chat' })
      );
      expect(out.result.type).toBe('CAROUSEL_UPDATED');
    });

    it('creates a fresh StudioArtifact when no prior mirrored artifact matches this carousel', async () => {
      studioArtifactService.list.mockResolvedValue([]);
      await execute({
        operation: 'update-carousel',
        carouselProjectId: 'car-1',
        title: 'Novo título',
      }, buildContext('org-1', { threadId: 'thread-1' }));
      expect(studioArtifactService.create).toHaveBeenCalled();
      expect(studioArtifactService.createVersion).not.toHaveBeenCalled();
    });

    it('only forwards the fields actually provided to updateProject', async () => {
      await execute({ operation: 'update-carousel', carouselProjectId: 'car-1', caption: 'Nova legenda' });
      expect(carouselProjectService.updateProject).toHaveBeenCalledWith(
        'car-1',
        'org-1',
        { caption: 'Nova legenda' }
      );
    });
  });

  describe('approve-carousel', () => {
    it('throws without carouselProjectId', async () => {
      await expect(execute({ operation: 'approve-carousel' })).rejects.toThrow(
        /carouselProjectId e obrigatorio/
      );
    });

    it('marks the project READY and approved', async () => {
      const out = await execute({ operation: 'approve-carousel', carouselProjectId: 'car-1' });
      expect(carouselProjectService.updateProject).toHaveBeenCalledWith(
        'car-1',
        'org-1',
        expect.objectContaining({ status: 'READY', approvalStatus: 'APPROVED' })
      );
      expect(out.result.type).toBe('CAROUSEL_APPROVED');
    });
  });

  describe('thread linking (best-effort, must never fail the save)', () => {
    it('does not throw and still returns the saved artifact when there is no threadId', async () => {
      const out = await execute(
        { operation: 'save-idea', title: 'T', hook: 'H', goal: 'G', angle: 'A' },
        buildContext('org-1') // no threadId, no mastra
      );
      expect(out.result.artifact).toBeTruthy();
    });

    it('does not throw and still returns the saved artifact when the thread lookup itself throws', async () => {
      const mastra = {
        getAgent: jest.fn().mockReturnValue({
          getMemory: jest.fn().mockResolvedValue({
            getThreadById: jest.fn().mockRejectedValue(new Error('db down')),
          }),
        }),
      };
      const out = await execute(
        { operation: 'save-idea', title: 'T', hook: 'H', goal: 'G', angle: 'A' },
        buildContext('org-1', { threadId: 'thread-1', mastra })
      );
      expect(out.result.artifact).toBeTruthy();
    });

    it('merges the new artifact into existing thread metadata without dropping prior entries', async () => {
      const updateThread = jest.fn().mockResolvedValue(undefined);
      const mastra = {
        getAgent: jest.fn().mockReturnValue({
          getMemory: jest.fn().mockResolvedValue({
            getThreadById: jest.fn().mockResolvedValue({
              title: 'Conversa',
              metadata: { studioArtifacts: [{ id: 'old-artifact', type: 'IDEA', title: 'Antiga' }] },
            }),
            updateThread,
          }),
        }),
      };
      await execute(
        { operation: 'save-idea', title: 'T', hook: 'H', goal: 'G', angle: 'A' },
        buildContext('org-1', { threadId: 'thread-1', mastra })
      );
      expect(updateThread).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'thread-1',
          metadata: expect.objectContaining({
            studioArtifacts: expect.arrayContaining([
              expect.objectContaining({ id: 'old-artifact' }),
              expect.objectContaining({ id: 'artifact-1', type: 'IDEA' }),
            ]),
          }),
        })
      );
    });
  });
});
