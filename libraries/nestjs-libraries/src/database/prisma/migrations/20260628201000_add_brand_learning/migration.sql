-- CreateEnum
CREATE TYPE "BrandLearningStatus" AS ENUM ('SUGGESTED', 'APPROVED', 'REJECTED', 'APPLIED');

-- CreateEnum
CREATE TYPE "BrandLearningType" AS ENUM ('HOOK', 'CTA', 'THEME', 'STYLE_RULE', 'TEMPLATE_PERFORMANCE', 'BEST_TIME', 'BEST_CHANNEL');

-- CreateTable
CREATE TABLE "BrandLearning" (
    "id" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "BrandLearningType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "BrandLearningStatus" NOT NULL DEFAULT 'SUGGESTED',
    "appliedAt" TIMESTAMP(3),
    "appliedVersion" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandLearning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandLearning_brandProfileId_idx" ON "BrandLearning"("brandProfileId");

-- CreateIndex
CREATE INDEX "BrandLearning_organizationId_idx" ON "BrandLearning"("organizationId");

-- CreateIndex
CREATE INDEX "BrandLearning_type_idx" ON "BrandLearning"("type");

-- CreateIndex
CREATE INDEX "BrandLearning_status_idx" ON "BrandLearning"("status");

-- CreateIndex
CREATE INDEX "BrandLearning_brandProfileId_status_idx" ON "BrandLearning"("brandProfileId", "status");

-- AddForeignKey
ALTER TABLE "BrandLearning" ADD CONSTRAINT "BrandLearning_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
