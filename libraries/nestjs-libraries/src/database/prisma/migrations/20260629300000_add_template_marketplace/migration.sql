-- Fase 8.2: Template Marketplace

CREATE TYPE "TemplateSource" AS ENUM ('OFFICIAL', 'COMMUNITY', 'PRIVATE');
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');

CREATE TABLE "MarketplaceTemplate" (
    "id" TEXT NOT NULL,
    "creatorOrgId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" "TemplateSource" NOT NULL DEFAULT 'COMMUNITY',
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "templateData" JSONB NOT NULL,
    "previewImageUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MarketplaceTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketplaceTemplate_source_idx" ON "MarketplaceTemplate"("source");
CREATE INDEX "MarketplaceTemplate_status_idx" ON "MarketplaceTemplate"("status");
CREATE INDEX "MarketplaceTemplate_category_idx" ON "MarketplaceTemplate"("category");
CREATE INDEX "MarketplaceTemplate_creatorOrgId_idx" ON "MarketplaceTemplate"("creatorOrgId");
CREATE INDEX "MarketplaceTemplate_deletedAt_idx" ON "MarketplaceTemplate"("deletedAt");

CREATE TABLE "TemplateInstallation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "installedVersion" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateInstallation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TemplateInstallation_org_template_key" ON "TemplateInstallation"("organizationId", "templateId");
CREATE INDEX "TemplateInstallation_organizationId_idx" ON "TemplateInstallation"("organizationId");
CREATE INDEX "TemplateInstallation_templateId_idx" ON "TemplateInstallation"("templateId");

ALTER TABLE "TemplateInstallation" ADD CONSTRAINT "TemplateInstallation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MarketplaceTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
