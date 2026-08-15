-- CreateTable
CREATE TABLE "StudioCarouselImage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cardKey" TEXT NOT NULL,
    "slideId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioCarouselImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioCarouselImage_organizationId_cardKey_idx" ON "StudioCarouselImage"("organizationId", "cardKey");

-- CreateIndex
CREATE UNIQUE INDEX "StudioCarouselImage_organizationId_cardKey_slideId_key" ON "StudioCarouselImage"("organizationId", "cardKey", "slideId");

-- AddForeignKey
ALTER TABLE "StudioCarouselImage" ADD CONSTRAINT "StudioCarouselImage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
