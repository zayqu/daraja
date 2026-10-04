-- Stated job facts for the public job card.
-- Additive and reversible: three nullable columns, and "type" becomes nullable
-- so ingested vacancies that never state an employment type stop being shown
-- as Full-time. Existing rows keep their values; scraped rows are corrected on
-- their next source refresh.
ALTER TABLE "Job"
ADD COLUMN IF NOT EXISTS "experienceMinYears" INTEGER,
ADD COLUMN IF NOT EXISTS "experienceMaxYears" INTEGER,
ADD COLUMN IF NOT EXISTS "openings" INTEGER;

ALTER TABLE "Job" ALTER COLUMN "type" DROP NOT NULL;
