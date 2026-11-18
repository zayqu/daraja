const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("employer portal is disabled unless explicitly configured", () => {
  const features = read("lib/features.js");
  assert.match(features, /EMPLOYER_PORTAL_ENABLED === "true"/);
  assert.match(read("app/api/employer/profile/route.js"), /status: 404/);
});

test("employer access is derived from the authenticated database user", () => {
  const access = read("lib/employer-access.js");
  assert.match(access, /const session = await auth\(\)/);
  assert.match(access, /where: \{ id: session\.user\.id \}/);
  assert.match(access, /actor\.role === "ADMIN"/);
  assert.match(access, /actor\.employer\?\.id === employerId/);
});

test("admin verification and moderation require RBAC and audit decisions", () => {
  const employer = read("app/api/admin/employers/[id]/route.js");
  const jobs = read("app/api/admin/jobs/[id]/moderate/route.js");
  assert.match(employer, /isAdmin\(actor\)/);
  assert.match(jobs, /isAdmin\(actor\)/);
  assert.match(employer, /EMPLOYER_VERIFICATION_REQUESTED|EMPLOYER_\$\{status\}/);
  assert.match(jobs, /JOB_\$\{status\}/);
  assert.match(jobs, /A rejection reason is required/);
});

test("employers can only list and edit their own reviewable vacancies", () => {
  const list = read("app/api/employer/jobs/route.js");
  const edit = read("app/api/employer/jobs/[id]/route.js");
  const rules = read("lib/employer-vacancy.js");
  assert.match(list, /employerId: actor\.employer\.id/);
  assert.match(edit, /canManageEmployer\(actor, existing\.employerId\)/);
  assert.match(rules, /EMPLOYER_EDITABLE_STATUSES = new Set\(\["DRAFT", "PENDING_REVIEW", "REJECTED"\]\)/);
  assert.match(edit, /actor\.role !== "ADMIN" && !EMPLOYER_EDITABLE_STATUSES\.has\(existing\.moderationStatus\)/);
  assert.match(edit, /JOB_SUBMITTED_FOR_REVIEW/);
  // Closing a vacancy takes it off the board and is audited.
  assert.match(edit, /body\.action === "withdraw"/);
  assert.match(edit, /data: \{ moderationStatus: "ARCHIVED", active: false \}/);
  assert.match(edit, /JOB_WITHDRAWN_BY_EMPLOYER/);
});

test("new employer vacancies use the authenticated employer and enter review", () => {
  const route = read("app/api/employer/jobs/route.js");
  const access = read("lib/employer-access.js");
  assert.match(route, /company: actor\.employer\.companyName/);
  assert.match(route, /moderationStatus: "PENDING_REVIEW"/);
  assert.match(route, /submittedById: actor\.id/);
  // Only verified employers an admin trusts skip review (one owner for the
  // rule), and their live vacancy refreshes the public job lists at once.
  assert.match(access, /return Boolean\(employer\?\.autoPublish && employer\.verificationStatus === "VERIFIED"\)/);
  assert.match(route, /\.\.\.\(publishesWithoutReview\(actor\.employer\)/);
  assert.match(route, /if \(job\.moderationStatus === "PUBLISHED"\) revalidateTag\(PUBLIC_JOBS_CACHE_TAG, "seconds"\)/);
  for (const page of ["app/employer/page.js", "app/employer/profile/page.js", "app/post-job/page.js"]) {
    assert.match(read(page), /publishesWithoutReview\((actor\.)?employer\)/, page);
  }
});

test("migration preserves current public jobs and creates indexed audit history", () => {
  const migration = read("prisma/migrations/20260729003000_employer_admin_foundation/migration.sql");
  assert.match(migration, /DEFAULT 'PUBLISHED'/);
  assert.match(migration, /AuditEvent_entityType_entityId_createdAt_idx/);
  assert.match(migration, /ON DELETE SET NULL/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM "Job"/);
});

test("audit metadata excludes common credential names", () => {
  const access = read("lib/employer-access.js");
  assert.match(access, /password\|secret\|token\|authorization\|cookie/i);
});
