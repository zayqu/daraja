-- Add the column as nullable so existing rows can be backfilled safely.
ALTER TABLE "Job" ADD COLUMN "slug" TEXT;

-- Preserve a readable title and employer in every URL. The deterministic,
-- opaque suffix prevents collisions without exposing the database key.
WITH job_slug_bases AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(
        TRIM(
          BOTH '-' FROM REGEXP_REPLACE(
            LOWER("title" || '-at-' || "company"),
            '[^a-z0-9]+',
            '-',
            'g'
          )
        ),
        ''
      ),
      'job'
    ) AS base
  FROM "Job"
)
UPDATE "Job" AS job
SET "slug" =
  LEFT(job_slug_bases.base, 100)
  || '-'
  || SUBSTRING(MD5(job."id") FROM 1 FOR 12)
FROM job_slug_bases
WHERE job."id" = job_slug_bases."id";

ALTER TABLE "Job" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");
