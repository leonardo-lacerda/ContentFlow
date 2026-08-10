ALTER TABLE "CreativeWorkflow" ADD COLUMN "maxCredits" INTEGER;

ALTER TABLE "CreativeWorkflowNode" ADD COLUMN "inputSchema" JSONB;
ALTER TABLE "CreativeWorkflowNode" ADD COLUMN "outputSchema" JSONB;

ALTER TABLE "CreativeWorkflowRun" ADD COLUMN "inputHash" TEXT;
CREATE INDEX "CreativeWorkflowRun_inputHash_idx" ON "CreativeWorkflowRun"("inputHash");
