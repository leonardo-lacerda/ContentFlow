-- Allow short video projects from content ideas without a carousel
ALTER TABLE "ShortVideoProject" ALTER COLUMN "carouselProjectId" DROP NOT NULL;
