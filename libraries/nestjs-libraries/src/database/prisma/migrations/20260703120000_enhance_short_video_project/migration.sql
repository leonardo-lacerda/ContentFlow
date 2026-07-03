-- Fase 6.7.4: Enhance ShortVideoProject with cost tracking and relations

-- Add new columns to ShortVideoProject
ALTER TABLE "ShortVideoProject" ADD COLUMN "totalDurationSec" DOUBLE PRECISION;
ALTER TABLE "ShortVideoProject" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "ShortVideoProject" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "ShortVideoProject" ADD COLUMN "renderProvider" TEXT;
ALTER TABLE "ShortVideoProject" ADD COLUMN "scriptCostEstimate" DOUBLE PRECISION;
ALTER TABLE "ShortVideoProject" ADD COLUMN "renderCostEstimate" DOUBLE PRECISION;
ALTER TABLE "ShortVideoProject" ADD COLUMN "totalCostEstimate" DOUBLE PRECISION;
ALTER TABLE "ShortVideoProject" ADD COLUMN "renderCostActual" DOUBLE PRECISION;

-- Add foreign key constraints for carouselProject and contentIdea
ALTER TABLE "ShortVideoProject" ADD CONSTRAINT "ShortVideoProject_carouselProjectId_fkey"
  FOREIGN KEY ("carouselProjectId") REFERENCES "CarouselProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShortVideoProject" ADD CONSTRAINT "ShortVideoProject_contentIdeaId_fkey"
  FOREIGN KEY ("contentIdeaId") REFERENCES "ContentIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
