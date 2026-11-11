const test = require("node:test");
const assert = require("node:assert/strict");
const { auditPublicJobs } = require("../scripts/preflight-verified-jobs");

const now = new Date("2026-11-11T09:00:00Z");
const fixtures = [
  { id: "1", title: "Verified Vacancy", source: "crdb", deadline: "2026-11-18T23:59:59.000Z" },
  { id: "2", title: "Undated Vacancy", source: "ajira", deadline: null },
  { id: "3", title: "Expired Vacancy", source: "ajiraweb", deadline: "2026-11-01T23:59:59.000Z" },
];

function fakeFetch(jobs) {
  return async (url) => {
    const params = new URL(url).searchParams;
    const page = Number(params.get("page"));
    const limit = Number(params.get("limit"));
    return {
      ok: true,
      json: async () => ({
        jobs: jobs.slice((page - 1) * limit, page * limit),
        pagination: { total: jobs.length, page, limit },
      }),
    };
  };
}

test("read-only preflight blocks strict visibility when live listings would disappear", async () => {
  const result = await auditPublicJobs(fakeFetch(fixtures), now);
  assert.equal(result.currentVisibleJobs, 3);
  assert.equal(result.jobsWithFutureDeadlines, 1);
  assert.equal(result.wouldBecomeHidden, 2);
  assert.equal(result.affectedBySource.ajira, 1);
  assert.equal(result.affectedBySource.ajiraweb, 1);
  assert.equal(result.safeToEnableStrictVisibility, false);
});

test("read-only preflight passes if every currently open job has a future deadline", async () => {
  const result = await auditPublicJobs(fakeFetch(fixtures.slice(0, 1)), now);
  assert.equal(result.wouldBecomeHidden, 0);
  assert.equal(result.safeToEnableStrictVisibility, true);
});

test("preflight fails closed on inconsistent pagination or duplicate identities", async () => {
  await assert.rejects(
    auditPublicJobs(async () => ({
      ok: true,
      json: async () => ({ jobs: [fixtures[0]], pagination: { total: 2 } }),
    }), now),
    /Duplicate or missing vacancy identity/
  );
  await assert.rejects(
    auditPublicJobs(async () => ({ ok: false, status: 500 }), now),
    /HTTP 500/
  );
});
