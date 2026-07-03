-- Fase 7.3: Affiliate Program

CREATE TYPE "AffiliateStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED');
CREATE TYPE "ReferralStatus" AS ENUM ('CLICKED', 'SIGNED_UP', 'CONVERTED', 'COMMISSION_PAID', 'CANCELLED');

CREATE TABLE "Affiliate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "AffiliateStatus" NOT NULL DEFAULT 'PENDING',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Affiliate_code_key" ON "Affiliate"("code");
CREATE INDEX "Affiliate_organizationId_idx" ON "Affiliate"("organizationId");
CREATE INDEX "Affiliate_status_idx" ON "Affiliate"("status");
CREATE INDEX "Affiliate_deletedAt_idx" ON "Affiliate"("deletedAt");

CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "visitorIp" TEXT,
    "userAgent" TEXT,
    "referredOrgId" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'CLICKED',
    "commissionAmount" DOUBLE PRECISION,
    "convertedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Referral_affiliateId_idx" ON "Referral"("affiliateId");
CREATE INDEX "Referral_referralCode_idx" ON "Referral"("referralCode");
CREATE INDEX "Referral_status_idx" ON "Referral"("status");
CREATE INDEX "Referral_referredOrgId_idx" ON "Referral"("referredOrgId");
CREATE INDEX "Referral_createdAt_idx" ON "Referral"("createdAt");

ALTER TABLE "Affiliate" ADD CONSTRAINT "Affiliate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
