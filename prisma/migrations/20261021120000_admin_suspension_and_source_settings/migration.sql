-- Additive only: admin account suspension, admin-edited vacancy protection and
-- admin-controlled scraper sources.
ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "suspendedReason" TEXT;
ALTER TABLE "Job" ADD COLUMN "adminEditedAt" TIMESTAMP(3);

CREATE TABLE "ScraperSourceSetting" (
  "sourceId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScraperSourceSetting_pkey" PRIMARY KEY ("sourceId")
);
