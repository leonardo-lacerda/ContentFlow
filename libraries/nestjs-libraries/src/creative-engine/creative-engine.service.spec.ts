import { CreativeJobStatus } from '@prisma/client';
import { CreativeEngineService } from './creative-engine.service';

describe('CreativeEngineService carousel retryable redrive', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const buildService = () => {
    const service = new CreativeEngineService(
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, {} as any, {} as any,
    );
    return service;
  };

  it('re-executes a RETRYABLE job with backoff until it settles', async () => {
    const service = buildService();
    const statuses = [CreativeJobStatus.RETRYABLE, CreativeJobStatus.RETRYABLE, CreativeJobStatus.SUCCEEDED];
    let getJobCalls = 0;
    const getJob = jest.fn(async () => ({ status: statuses[Math.min(getJobCalls++, statuses.length - 1)] }));
    const executeJob = jest.fn(async () => null);
    (service as any).getJob = getJob;
    (service as any).executeJob = executeJob;

    const pending = (service as any).redriveRetryableJob('job-1', 'org-1');
    await jest.advanceTimersByTimeAsync(2_000);
    await jest.advanceTimersByTimeAsync(4_000);
    await pending;

    expect(getJob).toHaveBeenCalledTimes(3);
    expect(executeJob).toHaveBeenCalledTimes(2);
  });

  it('leaves a job that already settled alone', async () => {
    const service = buildService();
    const getJob = jest.fn(async () => ({ status: CreativeJobStatus.FAILED }));
    const executeJob = jest.fn(async () => null);
    (service as any).getJob = getJob;
    (service as any).executeJob = executeJob;

    await (service as any).redriveRetryableJob('job-1', 'org-1');

    expect(getJob).toHaveBeenCalledTimes(1);
    expect(executeJob).not.toHaveBeenCalled();
  });
});

// Covers the MCP-only per-slide styleOverride passthrough (see
// carousel-default-design-spec.ts's buildSlideStyleOverride and the
// generate-carousel operation in creative-generation.tool.ts): the compiled
// prompt actually differs for the overridden slide, and the id/index
// requirement is enforced before any provider work starts.
describe('CreativeEngineService generateCarouselImages slideOverrides', () => {
  const buildService = () => {
    const service = new CreativeEngineService(
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, {} as any, {} as any,
    );
    return service;
  };

  it('rejects a styleOverride on a slide with neither id nor index', async () => {
    const service = buildService();
    await expect(
      service.generateCarouselImages('org-1', {
        projectId: 'proj-1',
        slides: [{ imagePrompt: 'a slide', styleOverride: { paletteId: 'mono-ink' } }],
      })
    ).rejects.toThrow(/must also set id or index/);
  });

  it('applies the per-slide override only to the targeted slide\'s compiled prompt', async () => {
    const service = buildService();
    const prepared: Array<{ prompt: string }> = [];
    (service as any).prepareImageJob = jest.fn(async (_org: string, _proj: string, jobInput: { prompt: string }) => {
      prepared.push({ prompt: jobInput.prompt });
      return { job: { id: `job-${prepared.length}` } };
    });

    await service.generateCarouselImages('org-1', {
      projectId: 'proj-1',
      stylePresetId: 'photo-clean',
      slides: [
        { id: 'slide-1', imagePrompt: 'a calm product shot' },
        { id: 'slide-2', imagePrompt: 'a bold CTA', styleOverride: { paletteId: 'sunset-pop' } },
      ],
    });

    expect(prepared).toHaveLength(2);
    // Slide 1 keeps the carousel-wide default palette (cobalt-cream)...
    expect(prepared[0].prompt).toContain('Azul & creme');
    expect(prepared[0].prompt).not.toContain('Sunset vibrante');
    // ...slide 2's override palette shows up instead, without losing the
    // shared style block (still photo-clean's art direction elsewhere).
    expect(prepared[1].prompt).toContain('Sunset vibrante');
  });
});
