const test = require("node:test");
const assert = require("node:assert/strict");

test("Open jobs contain only active, published, non-expired vacancies", async () => {
  const { buildPublicJobWhere } = await import("../lib/job-query.js");
  const now = new Date("2026-08-27T08:00:00.000Z");

  assert.deepEqual(buildPublicJobWhere("active", now), {
    moderationStatus: "PUBLISHED",
    active: true,
    OR: [{ deadline: null }, { deadline: { gte: new Date("2026-08-27T00:00:00.000Z") } }],
  });
  assert.deepEqual(buildPublicJobWhere("unexpected", now), {
    moderationStatus: "PUBLISHED",
    active: true,
    OR: [{ deadline: null }, { deadline: { gte: new Date("2026-08-27T00:00:00.000Z") } }],
  });
});

test("Expired and All views remain published-only", async () => {
  const { buildPublicJobWhere } = await import("../lib/job-query.js");
  const now = new Date("2026-08-27T08:00:00.000Z");

  assert.deepEqual(buildPublicJobWhere("expired", now), {
    moderationStatus: "PUBLISHED",
    OR: [{ active: false }, { deadline: { lt: new Date("2026-08-27T00:00:00.000Z") } }],
  });
  assert.deepEqual(buildPublicJobWhere("all", now), {
    moderationStatus: "PUBLISHED",
  });
});

test("Tanzania midnight closes yesterday's postings in both stored formats", async () => {
  const { buildPublicJobWhere } = await import("../lib/job-query.js");
  // 21:01 UTC is 00:01 the following day in Tanzania.
  const atLocalMidnight = new Date("2026-11-17T21:01:00.000Z");
  const filter = buildPublicJobWhere("active", atLocalMidnight);
  const cutoff = filter.OR[1].deadline.gte;
  assert.equal(cutoff.toISOString(), "2026-11-18T00:00:00.000Z");
  assert.equal(new Date("2026-11-17T20:59:59.000Z") >= cutoff, false);
  assert.equal(new Date("2026-11-17T23:59:59.000Z") >= cutoff, false);
  assert.equal(new Date("2026-11-18T20:59:59.000Z") >= cutoff, true);
  assert.equal(new Date("2026-11-18T23:59:59.000Z") >= cutoff, true);
});
