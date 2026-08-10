import { proxyActivities } from '@temporalio/workflow';

interface CreativeWorkflowActivities {
  executeCreativeWorkflowRun(input: { runId: string; organizationId: string }): Promise<unknown>;
}

const { executeCreativeWorkflowRun } = proxyActivities<CreativeWorkflowActivities>({
  startToCloseTimeout: '30 minutes',
  retry: { maximumAttempts: 2 },
});

export async function creativeWorkflowRunWorkflow(input: { runId: string; organizationId: string }) {
  return executeCreativeWorkflowRun(input);
}
