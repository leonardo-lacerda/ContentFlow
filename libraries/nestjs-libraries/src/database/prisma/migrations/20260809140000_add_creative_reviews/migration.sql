CREATE TABLE "CreativeReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "projectId" TEXT,
    "variantId" TEXT,
    "approved" BOOLEAN NOT NULL,
    "score" INTEGER,
    "productFidelity" INTEGER,
    "lipSync" INTEGER,
    "captionAccuracy" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreativeReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreativeReview_organizationId_createdAt_idx" ON "CreativeReview"("organizationId", "createdAt");
CREATE INDEX "CreativeReview_jobId_idx" ON "CreativeReview"("jobId");
CREATE INDEX "CreativeReview_projectId_idx" ON "CreativeReview"("projectId");
CREATE INDEX "CreativeReview_variantId_idx" ON "CreativeReview"("variantId");
CREATE INDEX "CreativeReview_approved_idx" ON "CreativeReview"("approved");

ALTER TABLE "CreativeReview" ADD CONSTRAINT "CreativeReview_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreativeReview" ADD CONSTRAINT "CreativeReview_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "CreativeJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreativeReview" ADD CONSTRAINT "CreativeReview_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "CreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreativeReview" ADD CONSTRAINT "CreativeReview_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "CreativeVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
