const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const read = (file) => readFileSync(path.join(__dirname, "..", file), "utf8");

test("job page views are counted per day without storing visitor data", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20261127120000_job_view_days/migration.sql");
  const route = read("app/api/jobs/[id]/view/route.js");
  const beacon = read("components/JobViewBeacon.js");
  const lib = read("lib/job-views.js");

  assert.match(schema, /model JobViewDay \{/);
  assert.match(schema, /@@id\(\[jobId, day\]\)/);
  assert.match(schema, /onDelete: Cascade/);
  assert.match(migration, /CREATE TABLE "JobViewDay"/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM/);

  // Only published jobs, bots skipped, nothing about the visitor kept.
  assert.match(route, /moderationStatus: "PUBLISHED"/);
  assert.match(route, /isLikelyBot/);
  assert.doesNotMatch(route, /x-forwarded-for|cookies\(|ip/i);
  assert.match(lib, /views: \{ increment: 1 \}/);

  // Once per browser per job per day, and storage failures never block.
  assert.match(beacon, /localStorage\.getItem\(key\) === today/);
  assert.match(beacon, /catch \{/);
  assert.match(read("app/jobs/[id]/JobDetailPageClient.js"), /<JobViewBeacon jobId=\{job\.id\} \/>/);
});

test("employers see views on their overview and vacancy list", () => {
  const overview = read("app/employer/page.js");
  const vacancies = read("app/employer/vacancies/page.js");

  assert.match(overview, /weeklyViews\(\{ employerId: actor\.employer\.id \}/);
  assert.match(overview, /label="Views this week"/);
  assert.match(overview, /<th>Views<\/th>/);
  assert.match(vacancies, /viewTotalsByJob/);
});
