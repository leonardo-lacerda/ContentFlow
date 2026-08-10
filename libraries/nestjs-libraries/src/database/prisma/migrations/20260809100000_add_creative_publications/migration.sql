CREATE TABLE "CreativePublication" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "postIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativePublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreativePublication_idempotencyKey_key" ON "CreativePublication"("idempotencyKey");
CREATE INDEX "CreativePublication_organizationId_createdAt_idx" ON "CreativePublication"("organizationId", "createdAt");
CREATE INDEX "CreativePublication_projectId_idx" ON "CreativePublication"("projectId");
CREATE INDEX "CreativePublication_variantId_idx" ON "CreativePublication"("variantId");
CREATE INDEX "CreativePublication_status_idx" ON "CreativePublication"("status");

ALTER TABLE "CreativePublication" ADD CONSTRAINT "CreativePublication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativePublication" ADD CONSTRAINT "CreativePublication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CreativeProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreativePublication" ADD CONSTRAINT "CreativePublication_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "CreativeVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
