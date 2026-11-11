const test = require("node:test");
const assert = require("node:assert/strict");

test("Open jobs contain only active, published, non-expired vacancies", async () => {
  const { buildPublicJobWhere } = await import("../lib/job-query.js");
  const now = new Date("2026-08-27T08:00:00.000Z");

  assert.deepEqual(buildPublicJobWhere("active", now), {
    moderationStatus: "PUBLISHED",
    deadline: { gte: now },
    active: true,
  });
  assert.deepEqual(buildPublicJobWhere("unexpected", now), {
    moderationStatus: "PUBLISHED",
    deadline: { gte: now },
    active: true,
  });
});

test("Expired and All views remain published-only", async () => {
  const { buildPublicJobWhere } = await import("../lib/job-query.js");
  const now = new Date("2026-08-27T08:00:00.000Z");

  assert.deepEqual(buildPublicJobWhere("expired", now), {
    moderationStatus: "PUBLISHED",
    deadline: { not: null },
    OR: [{ active: false }, { deadline: { lt: now } }],
  });
  assert.deepEqual(buildPublicJobWhere("all", now), {
    moderationStatus: "PUBLISHED",
    deadline: { not: null },
  });
});

test("Open job, application and email-alert code require a current deadline", async () => {
  const { readFileSync } = require("node:fs");
  const { join } = require("node:path");
  const read = (name) => readFileSync(join(__dirname, "..", name), "utf8");
  const apply = read("app/api/jobs/[id]/apply/route.js");
  const alerts = read("scraper/lib/alerts.js");
  const candidate = read("app/api/candidate/applications/route.js");
  const detail = read("lib/public-job.js");
  assert.match(apply, /if \(!job\.deadline \|\| job\.deadline < new Date\(\)\)/);
  assert.match(alerts, /moderationStatus: "PUBLISHED"/);
  assert.match(alerts, /deadline: \{ gte: new Date\(\) \}/);
  assert.match(candidate, /deadline: \{ gte: new Date\(\) \}/);
  assert.match(detail, /deadline: \{ gte: new Date\(\) \}/);
});
