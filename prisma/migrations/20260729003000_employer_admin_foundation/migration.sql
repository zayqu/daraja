-- Additive employer/admin foundation. Existing imported and public jobs retain
-- their current visibility by defaulting to PUBLISHED.
CREATE TYPE "EmployerVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "JobModerationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

ALTER TABLE "Employer"
  ADD COLUMN "verificationStatus" "EmployerVerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "verificationNote" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Employer"
SET "verificationStatus" = CASE WHEN "verified" THEN 'VERIFIED'::"EmployerVerificationStatus" ELSE 'PENDING'::"EmployerVerificationStatus" END,
    "verifiedAt" = CASE WHEN "verified" THEN CURRENT_TIMESTAMP ELSE NULL END;

ALTER TABLE "Job"
  ADD COLUMN "moderationStatus" "JobModerationStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "moderationNote" TEXT,
  ADD COLUMN "submittedById" TEXT,
  ADD COLUMN "moderatedById" TEXT,
  ADD COLUMN "moderatedAt" TIMESTAMP(3);

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "employerId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Job_employerId_moderationStatus_updatedAt_idx" ON "Job"("employerId", "moderationStatus", "updatedAt");
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditEvent_employerId_createdAt_idx" ON "AuditEvent"("employerId", "createdAt");
CREATE INDEX "AuditEvent_actorUserId_createdAt_idx" ON "AuditEvent"("actorUserId", "createdAt");

ALTER TABLE "Job" ADD CONSTRAINT "Job_moderatedById_fkey"
  FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_employerId_fkey"
  FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
