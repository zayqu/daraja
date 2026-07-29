const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const {
  createHealthReport,
  renderHealthSummary,
  sanitizeError,
  writeHealthReport,
} = require("../scraper/lib/health");
const { archiveExpiredJobs } = require("../scraper/lib/store");

test("expired vacancies are archived independently of source availability", async () => {
  const calls = [];
  const prisma = {
    job: {
      updateMany: async (query) => {
        calls.push(query);
        return { count: 3 };
      },
    },
  };
  const now = new Date("2026-07-28T20:00:00.000Z");

  assert.equal(await archiveExpiredJobs(prisma, now), 3);
  assert.deepEqual(calls[0], {
    where: { active: true, deadline: { lt: now } },
    data: { active: false },
  });
});

test("health reports expose partial failure without leaking credentials", () => {
  const report = createHealthReport({
    startedAt: new Date("2026-07-28T20:00:00.000Z"),
    finishedAt: new Date("2026-07-28T20:00:02.500Z"),
    lifecycle: { archivedExpired: 2 },
    summaries: [{ source: "ajira", found: 14, durationMs: 120 }],
    failures: [{
      source: "ajiraweb",
      error: "postgresql://admin:secret@db.example/daraja failed",
    }],
    warnings: [{
      source: "ajiraweb",
      warning: "1 of 3 links could not be resolved",
    }],
    alerts: { sent: 1, skipped: false },
  });

  assert.equal(report.status, "degraded");
  assert.equal(report.durationMs, 2500);
  assert.doesNotMatch(report.failures[0].error, /admin:secret/);
  assert.match(renderHealthSummary(report), /Daraja scraper health: degraded/);
  assert.match(renderHealthSummary(report), /Expired vacancies archived: 2/);
  assert.match(renderHealthSummary(report), /1 of 3 links could not be resolved/);
});

test("a total source outage is reported as failed", () => {
  const report = createHealthReport({
    startedAt: new Date(),
    failures: [{ source: "ajira", error: "HTTP 503" }],
  });
  assert.equal(report.status, "failed");
});

test("unresolved vacancy links produce a degraded report without a hard failure", () => {
  const report = createHealthReport({
    startedAt: new Date(),
    summaries: [{ source: "ajiraweb", found: 2 }],
    warnings: [{
      source: "ajiraweb",
      warning: "1 of 3 discovered links could not be resolved",
    }],
  });
  assert.equal(report.status, "degraded");
  assert.equal(report.failures.length, 0);
});

test("health reports are written as JSON and GitHub markdown", () => {
  const directory = mkdtempSync(join(tmpdir(), "daraja-health-"));
  const jsonPath = join(directory, "health.json");
  const summaryPath = join(directory, "summary.md");
  const report = createHealthReport({
    startedAt: new Date("2026-07-28T20:00:00.000Z"),
    finishedAt: new Date("2026-07-28T20:00:01.000Z"),
    summaries: [{
      source: "ajira",
      found: 10,
      classification: {
        total: 10,
        distribution: { Government: 9, General: 1 },
        needsReview: 1,
        review: [],
      },
    }],
  });

  writeHealthReport(report, { jsonPath, summaryPath });

  assert.equal(JSON.parse(readFileSync(jsonPath, "utf8")).status, "healthy");
  assert.match(readFileSync(summaryPath, "utf8"), /scraper health: healthy/);
  assert.match(readFileSync(summaryPath, "utf8"), /Classification quality/);
  assert.match(readFileSync(summaryPath, "utf8"), /\| ajira \| 10 \| 1 \|/);
});

test("error sanitization removes bearer tokens", () => {
  assert.equal(
    sanitizeError("Request failed with Bearer abc.def.ghi"),
    "Request failed with Bearer [redacted]"
  );
});
