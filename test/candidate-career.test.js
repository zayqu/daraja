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

test("candidate profile does not accept or expose legacy CV storage URLs", () => {
  const route = read("app/api/candidate/profile/route.js");
  const documentsStart = route.indexOf("documents: {");
  const documentsEnd = route.indexOf("      },\n    },\n  });", documentsStart);
  const documentsSelection = route.slice(documentsStart, documentsEnd);

  assert.match(route, /Object\.prototype\.hasOwnProperty\.call\(body, "cvUrl"\)/);
  assert.match(route, /CV links are no longer accepted/);
  assert.match(route, /Candidate documents must use Daraja private storage/);
  assert.match(route, /Portfolio links must use HTTPS/);
  assert.match(route, /"Cache-Control": "private, no-store, max-age=0"/);
  assert.ok(documentsStart >= 0 && documentsEnd > documentsStart);
  assert.doesNotMatch(documentsSelection, /\burl:\s*true/);
  assert.doesNotMatch(route, /\bcvUrl:\s*true/);
  assert.doesNotMatch(route, /\bcvUrl,\s*$/m);
});

test("candidate document upload is private, bounded and scanner-gated", () => {
  const route = read("app/api/candidate/documents/route.js");
  const storage = read("lib/candidate-document-storage.js");

  assert.match(route, /candidateDocumentUploadsEnabled\(\)/);
  assert.match(route, /protectMutation\(request/);
  assert.match(route, /multipart\/form-data/);
  assert.match(route, /MAX_CANDIDATE_UPLOAD_REQUEST_BYTES/);
  assert.match(route, /validateCandidatePdf/);
  assert.match(route, /storeCandidatePdf/);
  assert.match(route, /url: locator/);
  assert.doesNotMatch(route, /public\//);

  assert.match(storage, /MAX_CANDIDATE_DOCUMENT_BYTES = 4 \* 1024 \* 1024/);
  assert.match(storage, /Buffer\.from\("%PDF-"/);
  assert.match(storage, /CANDIDATE_DOCUMENT_MALWARE_SCANNER !== "clamav"/);
  assert.match(storage, /execFileAsync\(executable/);
  assert.match(storage, /mode: 0o600/);
  assert.match(storage, /private-document:/);
  assert.match(storage, /\.daraja", "private-documents"/);
});

test("candidate document download and delete remain owner-scoped", () => {
  const route = read("app/api/candidate/documents/[id]/route.js");

  assert.match(route, /jobSeekerId: user\.jobSeeker\.id/);
  assert.match(route, /isPrivateCandidateDocumentLocator\(document\.url\)/);
  assert.match(route, /readCandidateDocument\(document\.url\)/);
  assert.match(route, /Content-Disposition/);
  assert.match(route, /"Cache-Control": "private, no-store, max-age=0"/);
  assert.match(route, /protectMutation\(request/);
  assert.match(route, /deleteCandidateDocument\(document\.url\)/);
  assert.match(route, /candidateDocument\.deleteMany/);
  assert.doesNotMatch(route, /redirect\(document\.url/);
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
