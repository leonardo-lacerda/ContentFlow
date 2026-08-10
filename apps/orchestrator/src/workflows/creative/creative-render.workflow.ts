import { proxyActivities } from '@temporalio/workflow';

interface CreativeActivities {
  executeCreativeJob(input: { jobId: string; organizationId: string }): Promise<unknown>;
}

const { executeCreativeJob } = proxyActivities<CreativeActivities>({
  startToCloseTimeout: '30 minutes',
  retry: { maximumAttempts: 3 },
});

export async function creativeRenderWorkflow(input: { jobId: string; organizationId: string }) {
  return executeCreativeJob(input);
}
