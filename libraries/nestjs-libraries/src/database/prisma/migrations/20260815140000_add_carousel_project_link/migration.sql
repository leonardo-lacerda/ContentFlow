-- AlterTable: additive only - carouselProjectId is nullable, cardKey stays
-- required and unchanged. No existing rows are modified or backfilled.
ALTER TABLE "StudioCarouselImage" ADD COLUMN "carouselProjectId" TEXT;

-- CreateIndex
CREATE INDEX "StudioCarouselImage_organizationId_carouselProjectId_idx" ON "StudioCarouselImage"("organizationId", "carouselProjectId");

-- CreateIndex
-- Postgres treats each NULL as distinct in a unique index, so this is a
-- no-op for every row that has no carouselProjectId yet (the common case).
CREATE UNIQUE INDEX "StudioCarouselImage_organizationId_carouselProjectId_slideId_key" ON "StudioCarouselImage"("organizationId", "carouselProjectId", "slideId");

-- AddForeignKey
ALTER TABLE "StudioCarouselImage" ADD CONSTRAINT "StudioCarouselImage_carouselProjectId_fkey" FOREIGN KEY ("carouselProjectId") REFERENCES "CarouselProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
