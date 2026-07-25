ALTER TABLE "Job" ADD COLUMN "sourceId" TEXT;

CREATE UNIQUE INDEX "Job_source_sourceId_key" ON "Job"("source", "sourceId");
CREATE INDEX "Job_source_active_deadline_idx" ON "Job"("source", "active", "deadline");
