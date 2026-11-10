-- Paid featured listings: when a job stops being featured.
ALTER TABLE "Job" ADD COLUMN "featuredUntil" TIMESTAMP(3);
