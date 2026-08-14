ALTER TABLE "Organization" ADD COLUMN "apiKeyHash" TEXT;

CREATE INDEX "Organization_apiKeyHash_idx" ON "Organization"("apiKeyHash");
