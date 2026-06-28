-- CreateEnum
CREATE TYPE "BrandProfileStatus" AS ENUM ('DRAFT', 'ANALYZING', 'NEEDS_REVIEW', 'ACTIVE', 'FAILED');

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "status" "BrandProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandDnaSnapshot" (
    "id" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "summary" JSONB NOT NULL,
    "voice" JSONB NOT NULL,
    "audience" JSONB NOT NULL,
    "offer" JSONB NOT NULL,
    "visual" JSONB NOT NULL,
    "constraints" JSONB NOT NULL,
    "confidence" JSONB,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandDnaSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "mediaId" TEXT,
    "type" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "metadata" JSONB,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandProfile_organizationId_idx" ON "BrandProfile"("organizationId");

-- CreateIndex
CREATE INDEX "BrandProfile_status_idx" ON "BrandProfile"("status");

-- CreateIndex
CREATE INDEX "BrandProfile_deletedAt_idx" ON "BrandProfile"("deletedAt");

-- CreateIndex
CREATE INDEX "BrandProfile_organizationId_selected_idx" ON "BrandProfile"("organizationId", "selected");

-- CreateIndex
CREATE INDEX "BrandDnaSnapshot_brandProfileId_idx" ON "BrandDnaSnapshot"("brandProfileId");

-- CreateIndex
CREATE INDEX "BrandDnaSnapshot_brandProfileId_version_idx" ON "BrandDnaSnapshot"("brandProfileId", "version");

-- CreateIndex
CREATE INDEX "BrandAsset_brandProfileId_idx" ON "BrandAsset"("brandProfileId");

-- CreateIndex
CREATE INDEX "BrandAsset_type_idx" ON "BrandAsset"("type");

-- CreateIndex
CREATE INDEX "BrandAsset_deletedAt_idx" ON "BrandAsset"("deletedAt");

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandDnaSnapshot" ADD CONSTRAINT "BrandDnaSnapshot_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
