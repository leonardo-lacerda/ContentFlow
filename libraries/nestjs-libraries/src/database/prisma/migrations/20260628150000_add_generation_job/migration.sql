-- CreateGenerationJob
-- Migration: Adds GenerationJob model for persistent job tracking

-- Create enums
CREATE TYPE "GenerationJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'WAITING_PROVIDER', 'COMPLETED', 'FAILED', 'CANCELLED', 'PARTIAL');
CREATE TYPE "GenerationJobType" AS ENUM ('BRAND_DNA_EXTRACTION', 'IDEA_GENERATION', 'CAROUSEL_PLAN', 'IMAGE_GENERATION', 'CAPTION_GENERATION', 'BULK_GENERATION');

-- Create GenerationJob table
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandProfileId" TEXT,
    "carouselProjectId" TEXT,
    "type" "GenerationJobType" NOT NULL,
    "status" "GenerationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" JSONB,
    "result" JSONB,
    "error" TEXT,
    "model" TEXT,
    "provider" TEXT,
    "promptVersion" TEXT,
    "schemaVersion" TEXT,
    "usage" JSONB,
    "costEstimate" DOUBLE PRECISION,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "GenerationJob_organizationId_idx" ON "GenerationJob"("organizationId");
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");
CREATE INDEX "GenerationJob_type_idx" ON "GenerationJob"("type");
CREATE INDEX "GenerationJob_carouselProjectId_idx" ON "GenerationJob"("carouselProjectId");
CREATE UNIQUE INDEX "GenerationJob_idempotencyKey_key" ON "GenerationJob"("idempotencyKey");

-- Add foreign key
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
