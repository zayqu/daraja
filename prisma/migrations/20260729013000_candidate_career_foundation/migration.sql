-- Additive candidate career workspace. Existing applications and public jobs
-- remain unchanged.
ALTER TYPE "AppStatus" ADD VALUE IF NOT EXISTS 'OFFERED';
ALTER TYPE "AppStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';

ALTER TABLE "JobSeeker"
  ADD COLUMN "headline" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "experienceLevel" TEXT,
  ADD COLUMN "workArrangement" TEXT,
  ADD COLUMN "portfolioUrl" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Application"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "applicationKey" TEXT;

-- Preserve every historical application. Existing rows use their own ID;
-- authenticated future submissions use candidate:job as the stable key.
UPDATE "Application" SET "applicationKey" = "id";

CREATE TYPE "CandidateDocumentKind" AS ENUM ('CV', 'COVER_LETTER', 'CERTIFICATE', 'PORTFOLIO', 'OTHER');

CREATE TABLE "CandidateDocument" (
  "id" TEXT NOT NULL,
  "jobSeekerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "CandidateDocumentKind" NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandidateDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedJob" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Application_applicationKey_key" ON "Application"("applicationKey");
CREATE INDEX "Application_jobSeekerId_createdAt_idx" ON "Application"("jobSeekerId", "createdAt");
CREATE INDEX "Application_jobId_status_idx" ON "Application"("jobId", "status");
CREATE INDEX "CandidateDocument_jobSeekerId_createdAt_idx" ON "CandidateDocument"("jobSeekerId", "createdAt");
CREATE UNIQUE INDEX "SavedJob_userId_jobId_key" ON "SavedJob"("userId", "jobId");
CREATE INDEX "SavedJob_userId_createdAt_idx" ON "SavedJob"("userId", "createdAt");

ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_jobSeekerId_fkey"
  FOREIGN KEY ("jobSeekerId") REFERENCES "JobSeeker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
