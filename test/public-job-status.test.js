const test = require("node:test");
const assert = require("node:assert/strict");

test("Open jobs contain only active, published, non-expired vacancies", async () => {
  const { buildPublicJobWhere } = await import("../lib/job-query.js");
  const now = new Date("2026-08-27T08:00:00.000Z");

  assert.deepEqual(buildPublicJobWhere("active", now), {
    moderationStatus: "PUBLISHED",
    active: true,
    OR: [{ deadline: null }, { deadline: { gte: now } }],
  });
  assert.deepEqual(buildPublicJobWhere("unexpected", now), {
    moderationStatus: "PUBLISHED",
    active: true,
    OR: [{ deadline: null }, { deadline: { gte: now } }],
  });
});

test("Expired and All views remain published-only", async () => {
  const { buildPublicJobWhere } = await import("../lib/job-query.js");
  const now = new Date("2026-08-27T08:00:00.000Z");

  assert.deepEqual(buildPublicJobWhere("expired", now), {
    moderationStatus: "PUBLISHED",
    OR: [{ active: false }, { deadline: { lt: now } }],
  });
  assert.deepEqual(buildPublicJobWhere("all", now), {
    moderationStatus: "PUBLISHED",
  });
});
