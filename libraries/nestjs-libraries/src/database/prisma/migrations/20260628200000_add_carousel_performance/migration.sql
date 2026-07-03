-- CreateTable
CREATE TABLE "CarouselPerformance" (
    "id" TEXT NOT NULL,
    "carouselProjectId" TEXT NOT NULL,
    "postId" TEXT,
    "organizationId" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reachRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "normalizedScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rawMetrics" JSONB,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarouselPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarouselPerformance_carouselProjectId_idx" ON "CarouselPerformance"("carouselProjectId");

-- CreateIndex
CREATE INDEX "CarouselPerformance_organizationId_idx" ON "CarouselPerformance"("organizationId");

-- CreateIndex
CREATE INDEX "CarouselPerformance_brandProfileId_idx" ON "CarouselPerformance"("brandProfileId");

-- CreateIndex
CREATE INDEX "CarouselPerformance_platform_idx" ON "CarouselPerformance"("platform");

-- CreateIndex
CREATE INDEX "CarouselPerformance_collectedAt_idx" ON "CarouselPerformance"("collectedAt");

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "carouselProjectId" TEXT;

-- CreateIndex
CREATE INDEX "Post_carouselProjectId_idx" ON "Post"("carouselProjectId");

-- AddForeignKey
ALTER TABLE "CarouselPerformance" ADD CONSTRAINT "CarouselPerformance_carouselProjectId_fkey" FOREIGN KEY ("carouselProjectId") REFERENCES "CarouselProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
