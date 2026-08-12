-- Completion migration for environments that already applied the initial
-- admin foundation migration.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authSessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "AdminRefreshToken" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminRefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdminRefreshToken_tokenHash_key" ON "AdminRefreshToken"("tokenHash");
ALTER TABLE "AdminRefreshToken" ADD COLUMN IF NOT EXISTS "ip" TEXT;
ALTER TABLE "AdminRefreshToken" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
CREATE INDEX IF NOT EXISTS "AdminRefreshToken_adminUserId_idx" ON "AdminRefreshToken"("adminUserId");
CREATE INDEX IF NOT EXISTS "AdminRefreshToken_expiresAt_idx" ON "AdminRefreshToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "AdminRefreshToken_revokedAt_idx" ON "AdminRefreshToken"("revokedAt");
DO $$ BEGIN
  ALTER TABLE "AdminRefreshToken" ADD CONSTRAINT "AdminRefreshToken_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION prevent_admin_audit_log_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AdminAuditLog is immutable';
END;
$$;
DROP TRIGGER IF EXISTS admin_audit_log_immutable ON "AdminAuditLog";
CREATE TRIGGER admin_audit_log_immutable
BEFORE UPDATE OR DELETE ON "AdminAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_log_mutation();
