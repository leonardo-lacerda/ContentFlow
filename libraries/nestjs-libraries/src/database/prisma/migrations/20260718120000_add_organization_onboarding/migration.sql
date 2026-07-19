-- AlterTable
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "onboardingProgress" JSONB;
