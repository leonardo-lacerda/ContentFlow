-- CreateEditorialPlan
-- Migration: Adds EditorialPlan and EditorialSlot models for editorial calendar management

-- Create enum
CREATE TYPE "EditorialSlotStatus" AS ENUM ('PLANNED', 'IDEAS_GENERATED', 'APPROVED', 'REJECTED', 'CAROUSEL_CREATED', 'SCHEDULED', 'PUBLISHED');

-- Create EditorialPlan table
CREATE TABLE "EditorialPlan" (
    "id" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequencyPerWeek" INTEGER NOT NULL DEFAULT 3,
    "platforms" TEXT[] NOT NULL DEFAULT ARRAY['instagram']::TEXT[],
    "pillars" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "objectives" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] NOT NULL DEFAULT ARRAY['pt-BR']::TEXT[],
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "blackoutDates" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "autoGenerate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorialPlan_pkey" PRIMARY KEY ("id")
);

-- Create EditorialSlot table
CREATE TABLE "EditorialSlot" (
    "id" TEXT NOT NULL,
    "editorialPlanId" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "pillar" TEXT,
    "objective" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'instagram',
    "status" "EditorialSlotStatus" NOT NULL DEFAULT 'PLANNED',
    "contentIdeaId" TEXT,
    "carouselProjectId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorialSlot_pkey" PRIMARY KEY ("id")
);

-- Create indexes for EditorialPlan
CREATE INDEX "EditorialPlan_brandProfileId_idx" ON "EditorialPlan"("brandProfileId");
CREATE INDEX "EditorialPlan_organizationId_idx" ON "EditorialPlan"("organizationId");

-- Create indexes for EditorialSlot
CREATE INDEX "EditorialSlot_editorialPlanId_idx" ON "EditorialSlot"("editorialPlanId");
CREATE INDEX "EditorialSlot_brandProfileId_idx" ON "EditorialSlot"("brandProfileId");
CREATE INDEX "EditorialSlot_organizationId_idx" ON "EditorialSlot"("organizationId");
CREATE INDEX "EditorialSlot_scheduledDate_idx" ON "EditorialSlot"("scheduledDate");
CREATE INDEX "EditorialSlot_status_idx" ON "EditorialSlot"("status");

-- Add foreign keys for EditorialPlan
ALTER TABLE "EditorialPlan" ADD CONSTRAINT "EditorialPlan_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign keys for EditorialSlot
ALTER TABLE "EditorialSlot" ADD CONSTRAINT "EditorialSlot_editorialPlanId_fkey" FOREIGN KEY ("editorialPlanId") REFERENCES "EditorialPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EditorialSlot" ADD CONSTRAINT "EditorialSlot_contentIdeaId_fkey" FOREIGN KEY ("contentIdeaId") REFERENCES "ContentIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EditorialSlot" ADD CONSTRAINT "EditorialSlot_carouselProjectId_fkey" FOREIGN KEY ("carouselProjectId") REFERENCES "CarouselProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
