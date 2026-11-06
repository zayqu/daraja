CREATE TABLE "LinkedInConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "displayName" TEXT,
  "profileImageUrl" TEXT,
  "accessTokenCiphertext" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "scope" TEXT NOT NULL,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LinkedInConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LinkedInConnection_userId_key"
  ON "LinkedInConnection"("userId");

CREATE INDEX "LinkedInConnection_memberId_idx"
  ON "LinkedInConnection"("memberId");

ALTER TABLE "LinkedInConnection"
  ADD CONSTRAINT "LinkedInConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
