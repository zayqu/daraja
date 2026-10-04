CREATE TYPE "CandidateCvKind" AS ENUM ('MASTER', 'TAILORED');
CREATE TYPE "CandidateCvMode" AS ENUM ('GENERAL', 'PUBLIC_SERVICE');

CREATE TABLE "CandidateCv" (
  "id" TEXT NOT NULL,
  "jobSeekerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "CandidateCvKind" NOT NULL DEFAULT 'MASTER',
  "mode" "CandidateCvMode" NOT NULL DEFAULT 'GENERAL',
  "targetRole" TEXT,
  "targetJobId" TEXT,
  "language" TEXT NOT NULL DEFAULT 'en',
  "content" JSONB NOT NULL,
  "theme" JSONB NOT NULL,
  "atsScore" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CandidateCv_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CandidateCv_jobSeekerId_fkey"
    FOREIGN KEY ("jobSeekerId") REFERENCES "JobSeeker"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CandidateCv_jobSeekerId_updatedAt_idx"
  ON "CandidateCv"("jobSeekerId", "updatedAt");

CREATE INDEX "CandidateCv_targetJobId_idx"
  ON "CandidateCv"("targetJobId");
