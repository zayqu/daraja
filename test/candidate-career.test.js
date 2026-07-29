const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("candidate career tools are disabled unless explicitly enabled", () => {
  assert.match(read("lib/candidate-access.js"), /CANDIDATE_CAREER_ENABLED === "true"/);
  assert.match(read("app/api/candidate/profile/route.js"), /status: 404/);
});

test("candidate identity always comes from the authenticated session", () => {
  const access = read("lib/candidate-access.js");
  assert.match(access, /const session = await auth\(\)/);
  assert.match(access, /where: \{ id: session\.user\.id \}/);
  assert.doesNotMatch(read("app/api/candidate/profile/route.js"), /body\.userId/);
});

test("profile document references require HTTPS and never accept raw uploads", () => {
  const access = read("lib/candidate-access.js");
  const route = read("app/api/candidate/profile/route.js");
  assert.match(access, /url\.protocol === "https:"/);
  assert.match(route, /Document and portfolio links must use HTTPS/);
  assert.doesNotMatch(route, /FormData|arrayBuffer|Buffer\.from/);
});

test("saved jobs are scoped to the signed-in candidate", () => {
  const route = read("app/api/candidate/saved-jobs/route.js");
  assert.match(route, /where: \{ userId: user\.id \}/);
  assert.match(route, /userId_jobId/);
  assert.match(route, /active: true/);
});

test("applications preserve official external application destinations", () => {
  const route = read("app/api/candidate/applications/route.js");
  assert.match(route, /Apply through the official employer destination/);
  assert.match(route, /applyUrl: job\.sourceUrl/);
  assert.match(route, /deadline: \{ gte: new Date\(\) \}/);
});

test("candidates can only withdraw their own pending or reviewed application", () => {
  const route = read("app/api/candidate/applications/[id]/route.js");
  assert.match(route, /jobSeekerId: user\.jobSeeker\.id/);
  assert.match(route, /status: \{ in: \["PENDING", "REVIEWED"\] \}/);
  assert.match(route, /status !== "WITHDRAWN"/);
});

test("candidate migration is additive and prevents duplicate applications", () => {
  const migration = read("prisma/migrations/20260729013000_candidate_career_foundation/migration.sql");
  assert.match(migration, /Application_applicationKey_key/);
  assert.match(migration, /UPDATE "Application" SET "applicationKey" = "id"/);
  assert.match(migration, /SavedJob_userId_jobId_key/);
  assert.match(migration, /ON DELETE CASCADE/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM/);
});
