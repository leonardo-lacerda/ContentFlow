CREATE TABLE "CreativeJobAttempt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "provider" TEXT,
    "model" TEXT,
    "error" TEXT,
    "output" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    CONSTRAINT "CreativeJobAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreativeJobAttempt_jobId_attempt_key" ON "CreativeJobAttempt"("jobId", "attempt");
CREATE INDEX "CreativeJobAttempt_jobId_idx" ON "CreativeJobAttempt"("jobId");
CREATE INDEX "CreativeJobAttempt_status_idx" ON "CreativeJobAttempt"("status");

ALTER TABLE "CreativeJobAttempt" ADD CONSTRAINT "CreativeJobAttempt_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "CreativeJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
