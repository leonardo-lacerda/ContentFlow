ALTER TABLE "CreativeWorkflowRun"
  ADD COLUMN "idempotencyKey" TEXT;

ALTER TABLE "CreativeWorkflowRunItem"
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "model" TEXT,
  ADD COLUMN "costEstimate" INTEGER,
  ADD COLUMN "costActual" INTEGER;

CREATE UNIQUE INDEX "CreativeWorkflowRun_idempotencyKey_key"
  ON "CreativeWorkflowRun"("idempotencyKey");

UPDATE "CreativeWorkflowRun"
SET "idempotencyKey" = 'legacy-workflow-run:' || "id"
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "CreativeWorkflowRun"
  ALTER COLUMN "idempotencyKey" SET NOT NULL;
