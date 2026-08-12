CREATE TABLE IF NOT EXISTS "AdminSecurityAlert" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'WARNING',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "adminUserId" TEXT,
  "resourceId" TEXT,
  "payload" JSONB,
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminSecurityAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminSecurityAlert_severity_createdAt_idx" ON "AdminSecurityAlert"("severity", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminSecurityAlert_type_createdAt_idx" ON "AdminSecurityAlert"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminSecurityAlert_acknowledgedAt_idx" ON "AdminSecurityAlert"("acknowledgedAt");

CREATE TABLE IF NOT EXISTS "AdminAnomalyEvent" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "threshold" DOUBLE PRECISION NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "adminUserId" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAnomalyEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminAnomalyEvent_kind_createdAt_idx" ON "AdminAnomalyEvent"("kind", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminAnomalyEvent_windowStart_windowEnd_idx" ON "AdminAnomalyEvent"("windowStart", "windowEnd");
