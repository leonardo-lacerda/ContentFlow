ALTER TABLE "OAuthApp" ADD COLUMN "clientSecretHash" TEXT;
ALTER TABLE "OAuthAuthorization" ADD COLUMN "accessTokenHash" TEXT;
ALTER TABLE "OAuthAuthorization" ADD COLUMN "authorizationCodeHash" TEXT;

CREATE INDEX "OAuthApp_clientSecretHash_idx" ON "OAuthApp"("clientSecretHash");
CREATE INDEX "OAuthAuthorization_accessTokenHash_idx" ON "OAuthAuthorization"("accessTokenHash");
CREATE INDEX "OAuthAuthorization_authorizationCodeHash_idx" ON "OAuthAuthorization"("authorizationCodeHash");
