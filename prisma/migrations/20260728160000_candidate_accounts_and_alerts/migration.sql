-- Candidate authentication and verified, preference-based alert delivery.
-- Existing anonymous subscribers are paused deliberately; they must verify an
-- account before receiving further messages.

ALTER TABLE "User"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "emailVerified" TIMESTAMP(3),
  ADD COLUMN "image" TEXT,
  ALTER COLUMN "password" DROP NOT NULL;

CREATE TABLE "Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "JobAlertSubscriber"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "experienceLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "workArrangements" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "organisations" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "JobAlertSubscriber" SET "active" = false WHERE "userId" IS NULL;

CREATE TYPE "AlertDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "JobAlertDelivery" (
  "id" TEXT NOT NULL,
  "subscriberId" TEXT NOT NULL,
  "deduplicationKey" TEXT NOT NULL,
  "status" "AlertDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "jobIds" TEXT[],
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobAlertDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key"
  ON "Account"("provider", "providerAccountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key"
  ON "VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX "JobAlertSubscriber_userId_key"
  ON "JobAlertSubscriber"("userId");
CREATE UNIQUE INDEX "JobAlertDelivery_deduplicationKey_key"
  ON "JobAlertDelivery"("deduplicationKey");
CREATE INDEX "JobAlertDelivery_status_nextAttemptAt_idx"
  ON "JobAlertDelivery"("status", "nextAttemptAt");
CREATE INDEX "JobAlertDelivery_subscriberId_createdAt_idx"
  ON "JobAlertDelivery"("subscriberId", "createdAt");

ALTER TABLE "Account"
  ADD CONSTRAINT "Account_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session"
  ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobAlertSubscriber"
  ADD CONSTRAINT "JobAlertSubscriber_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobAlertDelivery"
  ADD CONSTRAINT "JobAlertDelivery_subscriberId_fkey"
  FOREIGN KEY ("subscriberId") REFERENCES "JobAlertSubscriber"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
