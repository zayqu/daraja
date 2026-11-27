-- Job page views per Tanzania calendar day (employer overview "Views").
CREATE TABLE "JobViewDay" (
    "jobId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobViewDay_pkey" PRIMARY KEY ("jobId","day")
);

CREATE INDEX "JobViewDay_day_idx" ON "JobViewDay"("day");

ALTER TABLE "JobViewDay" ADD CONSTRAINT "JobViewDay_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
