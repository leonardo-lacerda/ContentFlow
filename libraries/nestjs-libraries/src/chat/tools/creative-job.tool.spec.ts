import { CreativeJobTool } from './creative-job.tool';

// Safety net for the C4 split (docs/studio-audit.md) - see
// creative-generation.tool.spec.ts for the full rationale.

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

describe('CreativeJobTool', () => {
  let service: Record<string, jest.Mock>;
  let evaluationService: Record<string, jest.Mock>;
  let moduleRef: { get: jest.Mock };
  let tool: ReturnType<CreativeJobTool['run']>;

  beforeEach(() => {
    delete process.env.CREATIVE_ENGINE_ENABLED;
    service = { cancelJob: jest.fn().mockResolvedValue({ id: 'job-1', status: 'CANCELLED' }) };
    evaluationService = {
      preflight: jest.fn().mockResolvedValue({ passed: true }),
      review: jest.fn().mockResolvedValue({ id: 'review-1' }),
    };
    moduleRef = {
      get: jest.fn((token: any) => (token?.name === 'CreativeEvaluationService' ? evaluationService : service)),
    };
    tool = new CreativeJobTool(moduleRef as any).run();
  });

  const execute = (input: Record<string, any>) => (tool as any).execute(input, buildContext());

  it('is registered under the expected tool id', () => {
    expect((tool as any).id).toBe('creativeJobTool');
  });

  it('does not require confirmation for cancel-job (no confirmationRequired set on this tool)', async () => {
    await expect(execute({ operation: 'cancel-job' })).rejects.toThrow(/jobId is required/);
    await execute({ operation: 'cancel-job', jobId: 'job-1' });
    expect(service.cancelJob).toHaveBeenCalledWith('job-1', 'org-1');
  });

  it('requires jobId for evaluate', async () => {
    await expect(execute({ operation: 'evaluate' })).rejects.toThrow(/jobId is required/);
    await execute({ operation: 'evaluate', jobId: 'job-1' });
    expect(evaluationService.preflight).toHaveBeenCalledWith('org-1', 'job-1');
  });

  it('requires jobId and approved for review, and forwards the score fields', async () => {
    await expect(execute({ operation: 'review', jobId: 'job-1' })).rejects.toThrow(
      /jobId and approved are required/
    );
    await execute({ operation: 'review', jobId: 'job-1', approved: true, score: 9 });
    expect(evaluationService.review).toHaveBeenCalledWith(
      'org-1',
      'job-1',
      expect.objectContaining({ approved: true, score: 9 })
    );
  });

  it('treats approved=false as a valid, non-missing value', async () => {
    await execute({ operation: 'review', jobId: 'job-1', approved: false, notes: 'blurry' });
    expect(evaluationService.review).toHaveBeenCalledWith(
      'org-1',
      'job-1',
      expect.objectContaining({ approved: false, notes: 'blurry' })
    );
  });
});
