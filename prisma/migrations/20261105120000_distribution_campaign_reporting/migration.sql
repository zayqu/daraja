-- Additive distribution-only campaign registry. No applicant data or automatic analytics claims.
CREATE TABLE "DistributionCampaign" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL,
  "employerId" TEXT NOT NULL,
  "jobId" TEXT,
  "vacancyTitle" TEXT NOT NULL,
  "partnerType" TEXT NOT NULL,
  "destinationMode" TEXT NOT NULL DEFAULT 'PARTNER_DIRECT',
  "destinationUrl" TEXT NOT NULL,
  "approvedByPartnerAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "whatsappPostUrl" TEXT,
  "publishedAt" TIMESTAMP(3),
  "views24h" INTEGER,
  "views7d" INTEGER,
  "viewsRecordedAt" TIMESTAMP(3),
  "ga4Sessions" INTEGER,
  "ga4ApplyClicks" INTEGER,
  "analyticsRecordedAt" TIMESTAMP(3),
  "reportedApplications" INTEGER,
  "reportedInterviews" INTEGER,
  "reportedHires" INTEGER,
  "outcomesRecordedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistributionCampaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DistributionCampaign_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DistributionCampaign_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DistributionCampaign_campaignKey_key" ON "DistributionCampaign"("campaignKey");
CREATE UNIQUE INDEX "DistributionCampaign_employerId_jobId_key" ON "DistributionCampaign"("employerId", "jobId");
CREATE INDEX "DistributionCampaign_employerId_createdAt_idx" ON "DistributionCampaign"("employerId", "createdAt");
CREATE INDEX "DistributionCampaign_status_createdAt_idx" ON "DistributionCampaign"("status", "createdAt");
