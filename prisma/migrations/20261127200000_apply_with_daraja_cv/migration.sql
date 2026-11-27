-- Apply with Daraja CV: the CV sent with an application, a copy as sent, and
-- its scores for the job at that moment. Additive only.
ALTER TABLE "Application" ADD COLUMN "cvId" TEXT;
ALTER TABLE "Application" ADD COLUMN "cvSnapshot" JSONB;
ALTER TABLE "Application" ADD COLUMN "atsScore" INTEGER;
ALTER TABLE "Application" ADD COLUMN "matchScore" INTEGER;

ALTER TABLE "Application" ADD CONSTRAINT "Application_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "CandidateCv"("id") ON DELETE SET NULL ON UPDATE CASCADE;
