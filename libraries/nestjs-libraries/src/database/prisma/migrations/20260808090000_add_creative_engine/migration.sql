CREATE TYPE "CreativeProjectStatus" AS ENUM ('DRAFT', 'BRIEF_READY', 'SCRIPT_READY', 'GENERATING', 'REVIEW', 'READY', 'FAILED', 'ARCHIVED');
CREATE TYPE "CreativeAssetType" AS ENUM ('PRODUCT', 'ACTOR', 'VOICE', 'LOGO', 'SCREENSHOT', 'VIDEO', 'AUDIO', 'IMAGE', 'BROLL', 'OTHER');
CREATE TYPE "CreativeAssetStatus" AS ENUM ('UPLOADING', 'SCANNING', 'READY', 'REJECTED', 'ARCHIVED');
CREATE TYPE "CreativeRightsStatus" AS ENUM ('UNKNOWN', 'PENDING', 'APPROVED', 'REVOKED', 'EXPIRED');
CREATE TYPE "CreativeJobStatus" AS ENUM ('QUEUED', 'RESERVED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'RETRYABLE', 'CANCELLED', 'REFUNDED');
CREATE TYPE "CreativeWorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "CreativeWorkflowRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PARTIAL', 'SUCCEEDED', 'FAILED', 'CANCELLED');

CREATE TABLE "CreativeProject" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "brandProfileId" TEXT,
  "name" TEXT NOT NULL,
  "objective" TEXT,
  "status" "CreativeProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "aspectRatio" TEXT NOT NULL DEFAULT '9:16',
  "maxDurationSec" INTEGER NOT NULL DEFAULT 60,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "CreativeProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeAsset" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "mediaId" TEXT,
  "type" "CreativeAssetType" NOT NULL,
  "status" "CreativeAssetStatus" NOT NULL DEFAULT 'UPLOADING',
  "rightsStatus" "CreativeRightsStatus" NOT NULL DEFAULT 'UNKNOWN',
  "name" TEXT NOT NULL,
  "url" TEXT,
  "thumbnailUrl" TEXT,
  "mimeType" TEXT,
  "fileSize" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "CreativeAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeProduct" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sku" TEXT,
  "assetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "CreativeProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeActor" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "name" TEXT NOT NULL,
  "provider" TEXT,
  "externalId" TEXT,
  "category" TEXT,
  "imageUrl" TEXT,
  "previewUrl" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "rightsStatus" "CreativeRightsStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "CreativeActor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeVoice" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT,
  "externalId" TEXT,
  "language" TEXT NOT NULL DEFAULT 'pt-BR',
  "gender" TEXT,
  "previewUrl" TEXT,
  "rightsStatus" "CreativeRightsStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "CreativeVoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeRightsGrant" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "status" "CreativeRightsStatus" NOT NULL DEFAULT 'PENDING',
  "consentReference" TEXT,
  "scope" JSONB,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreativeRightsGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeScript" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "name" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'pt-BR',
  "source" TEXT NOT NULL DEFAULT 'AI',
  "content" JSONB NOT NULL,
  "totalDurationSec" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreativeScript_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreativeScript_projectId_version_key" UNIQUE ("projectId", "version")
);

CREATE TABLE "CreativeScene" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "scriptId" TEXT NOT NULL,
  "sceneIndex" INTEGER NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'TALKING_ACTOR',
  "durationSec" DOUBLE PRECISION,
  "scriptText" TEXT,
  "visualPrompt" TEXT,
  "brollPrompt" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreativeScene_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreativeScene_scriptId_sceneIndex_key" UNIQUE ("scriptId", "sceneIndex")
);

CREATE TABLE "CreativeVariant" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "scriptId" TEXT,
  "actorId" TEXT,
  "voiceId" TEXT,
  "language" TEXT NOT NULL DEFAULT 'pt-BR',
  "format" TEXT NOT NULL DEFAULT '9:16',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "videoUrl" TEXT,
  "thumbnailUrl" TEXT,
  "captionsUrl" TEXT,
  "output" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreativeVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeJob" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "variantId" TEXT,
  "type" TEXT NOT NULL,
  "status" "CreativeJobStatus" NOT NULL DEFAULT 'QUEUED',
  "provider" TEXT,
  "model" TEXT,
  "input" JSONB NOT NULL,
  "output" JSONB,
  "error" TEXT,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "costEstimate" INTEGER,
  "costActual" INTEGER,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "CreativeJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreativeJob_idempotencyKey_key" UNIQUE ("idempotencyKey")
);

CREATE TABLE "CreativeWorkflow" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "CreativeWorkflowStatus" NOT NULL DEFAULT 'DRAFT',
  "definition" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "CreativeWorkflow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreativeWorkflow_organizationId_name_version_key" UNIQUE ("organizationId", "name", "version")
);

CREATE TABLE "CreativeWorkflowNode" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "nodeKey" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "position" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreativeWorkflowNode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreativeWorkflowNode_workflowId_nodeKey_key" UNIQUE ("workflowId", "nodeKey")
);

CREATE TABLE "CreativeWorkflowEdge" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "sourceNode" TEXT NOT NULL,
  "targetNode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreativeWorkflowEdge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreativeWorkflowEdge_workflowId_sourceNode_targetNode_key" UNIQUE ("workflowId", "sourceNode", "targetNode")
);

CREATE TABLE "CreativeWorkflowRun" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "projectId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "status" "CreativeWorkflowRunStatus" NOT NULL DEFAULT 'QUEUED',
  "input" JSONB NOT NULL,
  "output" JSONB,
  "error" TEXT,
  "estimatedCost" INTEGER,
  "actualCost" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "CreativeWorkflowRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeWorkflowRunItem" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "nodeKey" TEXT NOT NULL,
  "variantId" TEXT,
  "status" "CreativeJobStatus" NOT NULL DEFAULT 'QUEUED',
  "output" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreativeWorkflowRunItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreativeWorkflowRunItem_runId_nodeKey_variantId_key" UNIQUE ("runId", "nodeKey", "variantId")
);

CREATE TABLE "CreativeCreditLedgerEntry" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "jobId" TEXT,
  "workflowRunId" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "credits" INTEGER NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreativeCreditLedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreativeCreditLedgerEntry_idempotencyKey_key" UNIQUE ("idempotencyKey")
);

CREATE TABLE "CreativeProvenance" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "variantId" TEXT,
  "operation" TEXT NOT NULL,
  "provider" TEXT,
  "model" TEXT,
  "inputHash" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreativeProvenance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeWebhookSubscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "secret" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreativeWebhookSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeWebhookDelivery" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "responseStatus" INTEGER,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreativeWebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreativeMetricEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "jobId" TEXT,
  "workflowRunId" TEXT,
  "event" TEXT NOT NULL,
  "provider" TEXT,
  "model" TEXT,
  "value" DOUBLE PRECISION,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreativeMetricEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreativeProject_organizationId_idx" ON "CreativeProject"("organizationId");
CREATE INDEX "CreativeProject_brandProfileId_idx" ON "CreativeProject"("brandProfileId");
CREATE INDEX "CreativeProject_status_idx" ON "CreativeProject"("status");
CREATE INDEX "CreativeProject_createdAt_idx" ON "CreativeProject"("createdAt");
CREATE INDEX "CreativeAsset_organizationId_idx" ON "CreativeAsset"("organizationId");
CREATE INDEX "CreativeAsset_projectId_idx" ON "CreativeAsset"("projectId");
CREATE INDEX "CreativeAsset_type_idx" ON "CreativeAsset"("type");
CREATE INDEX "CreativeAsset_status_idx" ON "CreativeAsset"("status");
CREATE INDEX "CreativeAsset_rightsStatus_idx" ON "CreativeAsset"("rightsStatus");
CREATE INDEX "CreativeAsset_deletedAt_idx" ON "CreativeAsset"("deletedAt");
CREATE INDEX "CreativeProduct_organizationId_idx" ON "CreativeProduct"("organizationId");
CREATE INDEX "CreativeProduct_projectId_idx" ON "CreativeProduct"("projectId");
CREATE INDEX "CreativeProduct_status_idx" ON "CreativeProduct"("status");
CREATE INDEX "CreativeProduct_deletedAt_idx" ON "CreativeProduct"("deletedAt");
CREATE INDEX "CreativeActor_organizationId_idx" ON "CreativeActor"("organizationId");
CREATE INDEX "CreativeActor_projectId_idx" ON "CreativeActor"("projectId");
CREATE INDEX "CreativeActor_rightsStatus_idx" ON "CreativeActor"("rightsStatus");
CREATE INDEX "CreativeActor_category_idx" ON "CreativeActor"("category");
CREATE INDEX "CreativeActor_deletedAt_idx" ON "CreativeActor"("deletedAt");
CREATE INDEX "CreativeVoice_organizationId_idx" ON "CreativeVoice"("organizationId");
CREATE INDEX "CreativeVoice_language_idx" ON "CreativeVoice"("language");
CREATE INDEX "CreativeVoice_rightsStatus_idx" ON "CreativeVoice"("rightsStatus");
CREATE INDEX "CreativeVoice_deletedAt_idx" ON "CreativeVoice"("deletedAt");
CREATE INDEX "CreativeRightsGrant_organizationId_idx" ON "CreativeRightsGrant"("organizationId");
CREATE INDEX "CreativeRightsGrant_resourceType_resourceId_idx" ON "CreativeRightsGrant"("resourceType", "resourceId");
CREATE INDEX "CreativeRightsGrant_status_idx" ON "CreativeRightsGrant"("status");
CREATE INDEX "CreativeRightsGrant_expiresAt_idx" ON "CreativeRightsGrant"("expiresAt");
CREATE INDEX "CreativeScript_organizationId_idx" ON "CreativeScript"("organizationId");
CREATE INDEX "CreativeScript_projectId_idx" ON "CreativeScript"("projectId");
CREATE INDEX "CreativeScript_status_idx" ON "CreativeScript"("status");
CREATE INDEX "CreativeScene_organizationId_idx" ON "CreativeScene"("organizationId");
CREATE INDEX "CreativeScene_scriptId_idx" ON "CreativeScene"("scriptId");
CREATE INDEX "CreativeVariant_organizationId_idx" ON "CreativeVariant"("organizationId");
CREATE INDEX "CreativeVariant_projectId_idx" ON "CreativeVariant"("projectId");
CREATE INDEX "CreativeVariant_status_idx" ON "CreativeVariant"("status");
CREATE INDEX "CreativeVariant_createdAt_idx" ON "CreativeVariant"("createdAt");
CREATE INDEX "CreativeJob_organizationId_idx" ON "CreativeJob"("organizationId");
CREATE INDEX "CreativeJob_organizationId_status_idx" ON "CreativeJob"("organizationId", "status");
CREATE INDEX "CreativeJob_projectId_idx" ON "CreativeJob"("projectId");
CREATE INDEX "CreativeJob_status_idx" ON "CreativeJob"("status");
CREATE INDEX "CreativeJob_type_idx" ON "CreativeJob"("type");
CREATE INDEX "CreativeJob_createdAt_idx" ON "CreativeJob"("createdAt");
CREATE INDEX "CreativeWorkflow_organizationId_idx" ON "CreativeWorkflow"("organizationId");
CREATE INDEX "CreativeWorkflow_projectId_idx" ON "CreativeWorkflow"("projectId");
CREATE INDEX "CreativeWorkflow_status_idx" ON "CreativeWorkflow"("status");
CREATE INDEX "CreativeWorkflowNode_workflowId_idx" ON "CreativeWorkflowNode"("workflowId");
CREATE INDEX "CreativeWorkflowNode_type_idx" ON "CreativeWorkflowNode"("type");
CREATE INDEX "CreativeWorkflowEdge_workflowId_idx" ON "CreativeWorkflowEdge"("workflowId");
CREATE INDEX "CreativeWorkflowRun_organizationId_idx" ON "CreativeWorkflowRun"("organizationId");
CREATE INDEX "CreativeWorkflowRun_organizationId_status_idx" ON "CreativeWorkflowRun"("organizationId", "status");
CREATE INDEX "CreativeWorkflowRun_workflowId_idx" ON "CreativeWorkflowRun"("workflowId");
CREATE INDEX "CreativeWorkflowRun_projectId_idx" ON "CreativeWorkflowRun"("projectId");
CREATE INDEX "CreativeWorkflowRun_status_idx" ON "CreativeWorkflowRun"("status");
CREATE INDEX "CreativeWorkflowRunItem_runId_idx" ON "CreativeWorkflowRunItem"("runId");
CREATE INDEX "CreativeWorkflowRunItem_status_idx" ON "CreativeWorkflowRunItem"("status");
CREATE INDEX "CreativeCreditLedgerEntry_organizationId_idx" ON "CreativeCreditLedgerEntry"("organizationId");
CREATE INDEX "CreativeCreditLedgerEntry_organizationId_createdAt_idx" ON "CreativeCreditLedgerEntry"("organizationId", "createdAt");
CREATE INDEX "CreativeCreditLedgerEntry_projectId_idx" ON "CreativeCreditLedgerEntry"("projectId");
CREATE INDEX "CreativeCreditLedgerEntry_jobId_idx" ON "CreativeCreditLedgerEntry"("jobId");
CREATE INDEX "CreativeCreditLedgerEntry_workflowRunId_idx" ON "CreativeCreditLedgerEntry"("workflowRunId");
CREATE INDEX "CreativeCreditLedgerEntry_status_idx" ON "CreativeCreditLedgerEntry"("status");
CREATE INDEX "CreativeProvenance_organizationId_idx" ON "CreativeProvenance"("organizationId");
CREATE INDEX "CreativeProvenance_projectId_idx" ON "CreativeProvenance"("projectId");
CREATE INDEX "CreativeProvenance_variantId_idx" ON "CreativeProvenance"("variantId");
CREATE INDEX "CreativeProvenance_inputHash_idx" ON "CreativeProvenance"("inputHash");
CREATE INDEX "CreativeWebhookSubscription_organizationId_idx" ON "CreativeWebhookSubscription"("organizationId");
CREATE INDEX "CreativeWebhookSubscription_active_idx" ON "CreativeWebhookSubscription"("active");
CREATE INDEX "CreativeWebhookDelivery_subscriptionId_idx" ON "CreativeWebhookDelivery"("subscriptionId");
CREATE INDEX "CreativeWebhookDelivery_status_idx" ON "CreativeWebhookDelivery"("status");
CREATE INDEX "CreativeWebhookDelivery_createdAt_idx" ON "CreativeWebhookDelivery"("createdAt");
CREATE INDEX "CreativeMetricEvent_organizationId_createdAt_idx" ON "CreativeMetricEvent"("organizationId", "createdAt");
CREATE INDEX "CreativeMetricEvent_organizationId_event_idx" ON "CreativeMetricEvent"("organizationId", "event");
CREATE INDEX "CreativeMetricEvent_provider_model_idx" ON "CreativeMetricEvent"("provider", "model");
CREATE INDEX "CreativeMetricEvent_projectId_idx" ON "CreativeMetricEvent"("projectId");
CREATE INDEX "CreativeMetricEvent_jobId_idx" ON "CreativeMetricEvent"("jobId");
CREATE INDEX "CreativeMetricEvent_workflowRunId_idx" ON "CreativeMetricEvent"("workflowRunId");

ALTER TABLE "CreativeProject" ADD CONSTRAINT "CreativeProject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeAsset" ADD CONSTRAINT "CreativeAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeAsset" ADD CONSTRAINT "CreativeAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreativeProduct" ADD CONSTRAINT "CreativeProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeProduct" ADD CONSTRAINT "CreativeProduct_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreativeActor" ADD CONSTRAINT "CreativeActor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeActor" ADD CONSTRAINT "CreativeActor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreativeVoice" ADD CONSTRAINT "CreativeVoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeRightsGrant" ADD CONSTRAINT "CreativeRightsGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeScript" ADD CONSTRAINT "CreativeScript_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeScript" ADD CONSTRAINT "CreativeScript_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CreativeProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeScene" ADD CONSTRAINT "CreativeScene_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeScene" ADD CONSTRAINT "CreativeScene_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "CreativeScript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeVariant" ADD CONSTRAINT "CreativeVariant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeVariant" ADD CONSTRAINT "CreativeVariant_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CreativeProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeJob" ADD CONSTRAINT "CreativeJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeJob" ADD CONSTRAINT "CreativeJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreativeWorkflow" ADD CONSTRAINT "CreativeWorkflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeWorkflow" ADD CONSTRAINT "CreativeWorkflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreativeWorkflowNode" ADD CONSTRAINT "CreativeWorkflowNode_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "CreativeWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeWorkflowEdge" ADD CONSTRAINT "CreativeWorkflowEdge_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "CreativeWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeWorkflowRun" ADD CONSTRAINT "CreativeWorkflowRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeWorkflowRun" ADD CONSTRAINT "CreativeWorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "CreativeWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeWorkflowRun" ADD CONSTRAINT "CreativeWorkflowRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreativeWorkflowRunItem" ADD CONSTRAINT "CreativeWorkflowRunItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CreativeWorkflowRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeCreditLedgerEntry" ADD CONSTRAINT "CreativeCreditLedgerEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeCreditLedgerEntry" ADD CONSTRAINT "CreativeCreditLedgerEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreativeProvenance" ADD CONSTRAINT "CreativeProvenance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeProvenance" ADD CONSTRAINT "CreativeProvenance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreativeWebhookSubscription" ADD CONSTRAINT "CreativeWebhookSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeWebhookDelivery" ADD CONSTRAINT "CreativeWebhookDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CreativeWebhookSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeMetricEvent" ADD CONSTRAINT "CreativeMetricEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativeMetricEvent" ADD CONSTRAINT "CreativeMetricEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
