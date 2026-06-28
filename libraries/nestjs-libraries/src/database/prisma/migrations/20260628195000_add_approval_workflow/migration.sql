-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "CarouselProject" ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "CarouselProject" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "CarouselProject" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "CarouselProject" ADD COLUMN "rejectionReason" TEXT;
