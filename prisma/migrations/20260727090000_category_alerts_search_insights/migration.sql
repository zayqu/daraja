ALTER TABLE "JobAlertSubscriber"
ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "JobAlertSubscriber"
SET "categories" = ARRAY(
  SELECT interest
  FROM unnest("interests") AS interest
  WHERE interest = ANY(ARRAY[
    'Government',
    'NGO & Development',
    'Banking & Finance',
    'Technology',
    'Health',
    'Education',
    'Engineering',
    'Sales & Marketing',
    'Accounting & Audit',
    'HR & Administration',
    'Legal',
    'Logistics & Transport',
    'Hospitality & Tourism',
    'Agriculture',
    'Mining, Energy, Oil & Gas',
    'Manufacturing',
    'Internships & Graduate Programs',
    'General'
  ]::TEXT[])
);

ALTER TABLE "JobAlertSubscriber" DROP COLUMN "interests";

CREATE TABLE "JobSearchInsight" (
  "id" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "normalizedQuery" TEXT NOT NULL,
  "category" TEXT,
  "resultCount" INTEGER NOT NULL,
  "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobSearchInsight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobSearchInsight_normalizedQuery_searchedAt_idx"
ON "JobSearchInsight"("normalizedQuery", "searchedAt");

CREATE INDEX "JobSearchInsight_resultCount_searchedAt_idx"
ON "JobSearchInsight"("resultCount", "searchedAt");
