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
