-- CreateContentIdeaAndCarouselProject
-- Migration: Adds ContentIdea and CarouselProject models for Phase 2

-- Create enums
CREATE TYPE "ContentIdeaStatus" AS ENUM ('NEW', 'APPROVED', 'REJECTED', 'SAVED', 'USED', 'ARCHIVED');
CREATE TYPE "CarouselProjectStatus" AS ENUM ('DRAFT', 'GENERATING', 'REVIEW', 'READY', 'PUBLISHED', 'FAILED');

-- Create ContentIdea table
CREATE TABLE "ContentIdea" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "templateSuggestion" TEXT,
    "platformSuggestion" TEXT,
    "score" DOUBLE PRECISION,
    "status" "ContentIdeaStatus" NOT NULL DEFAULT 'NEW',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentIdea_pkey" PRIMARY KEY ("id")
);

-- Create CarouselProject table
CREATE TABLE "CarouselProject" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "contentIdeaId" TEXT,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "CarouselProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "slides" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarouselProject_pkey" PRIMARY KEY ("id")
);

-- Create indexes for ContentIdea
CREATE INDEX "ContentIdea_organizationId_idx" ON "ContentIdea"("organizationId");
CREATE INDEX "ContentIdea_brandProfileId_idx" ON "ContentIdea"("brandProfileId");
CREATE INDEX "ContentIdea_status_idx" ON "ContentIdea"("status");
CREATE INDEX "ContentIdea_brandProfileId_status_idx" ON "ContentIdea"("brandProfileId", "status");

-- Create indexes for CarouselProject
CREATE INDEX "CarouselProject_organizationId_idx" ON "CarouselProject"("organizationId");
CREATE INDEX "CarouselProject_brandProfileId_idx" ON "CarouselProject"("brandProfileId");
CREATE INDEX "CarouselProject_status_idx" ON "CarouselProject"("status");
CREATE UNIQUE INDEX "CarouselProject_contentIdeaId_key" ON "CarouselProject"("contentIdeaId");

-- Add foreign key constraints
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CarouselProject" ADD CONSTRAINT "CarouselProject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarouselProject" ADD CONSTRAINT "CarouselProject_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarouselProject" ADD CONSTRAINT "CarouselProject_contentIdeaId_fkey" FOREIGN KEY ("contentIdeaId") REFERENCES "ContentIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
