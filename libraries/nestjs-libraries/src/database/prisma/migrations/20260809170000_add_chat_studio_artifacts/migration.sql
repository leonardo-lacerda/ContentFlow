CREATE TABLE "StudioArtifact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "threadId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "source" TEXT,
    "brandProfileId" TEXT,
    "metadata" JSONB,
    "approvedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudioArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioArtifactVersion" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "changeSummary" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudioArtifactVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioArtifactEvent" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudioArtifactEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioAttachment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "artifactId" TEXT,
    "threadId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'FILE',
    "filename" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "storageUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "StudioAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioArtifact_organizationId_updatedAt_idx" ON "StudioArtifact"("organizationId", "updatedAt");
CREATE INDEX "StudioArtifact_organizationId_threadId_idx" ON "StudioArtifact"("organizationId", "threadId");
CREATE INDEX "StudioArtifact_organizationId_type_status_idx" ON "StudioArtifact"("organizationId", "type", "status");
CREATE INDEX "StudioArtifact_brandProfileId_idx" ON "StudioArtifact"("brandProfileId");
CREATE UNIQUE INDEX "StudioArtifactVersion_artifactId_version_key" ON "StudioArtifactVersion"("artifactId", "version");
CREATE INDEX "StudioArtifactVersion_artifactId_createdAt_idx" ON "StudioArtifactVersion"("artifactId", "createdAt");
CREATE INDEX "StudioArtifactEvent_artifactId_createdAt_idx" ON "StudioArtifactEvent"("artifactId", "createdAt");
CREATE INDEX "StudioArtifactEvent_event_idx" ON "StudioArtifactEvent"("event");
CREATE INDEX "StudioAttachment_organizationId_createdAt_idx" ON "StudioAttachment"("organizationId", "createdAt");
CREATE INDEX "StudioAttachment_organizationId_threadId_idx" ON "StudioAttachment"("organizationId", "threadId");
CREATE INDEX "StudioAttachment_artifactId_idx" ON "StudioAttachment"("artifactId");
CREATE INDEX "StudioAttachment_status_idx" ON "StudioAttachment"("status");

ALTER TABLE "StudioArtifact" ADD CONSTRAINT "StudioArtifact_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioArtifactVersion" ADD CONSTRAINT "StudioArtifactVersion_artifactId_fkey"
  FOREIGN KEY ("artifactId") REFERENCES "StudioArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioArtifactEvent" ADD CONSTRAINT "StudioArtifactEvent_artifactId_fkey"
  FOREIGN KEY ("artifactId") REFERENCES "StudioArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioAttachment" ADD CONSTRAINT "StudioAttachment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioAttachment" ADD CONSTRAINT "StudioAttachment_artifactId_fkey"
  FOREIGN KEY ("artifactId") REFERENCES "StudioArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
