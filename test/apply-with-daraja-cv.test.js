const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const read = (file) => readFileSync(path.join(__dirname, "..", file), "utf8");

test("Apply with Daraja CV keeps the CV as sent and only for Daraja-posted jobs", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20261127200000_apply_with_daraja_cv/migration.sql");
  const route = read("app/api/candidate/applications/route.js");
  const options = read("app/api/candidate/apply/route.js");

  assert.match(schema, /cvSnapshot\s+Json\?/);
  assert.match(schema, /onDelete: SetNull/);
  assert.match(migration, /ADD COLUMN "cvSnapshot" JSONB/);
  assert.doesNotMatch(migration, /DROP|DELETE FROM/);
  // Withdrawn applications can be sent again; others are never duplicated.
  assert.match(route, /existing && existing\.status !== "WITHDRAWN"/);
  assert.match(options, /bestCvId\(scored\)/);
  assert.match(options, /"Cache-Control": "private, no-store, max-age=0"/);
});

test("candidate extras stay free until the owner switches charging on", () => {
  const features = read("lib/features.js");
  const rules = read("lib/apply-with-cv.js");
  const sheet = read("components/ApplySheet.js");
  assert.match(features, /"candidate\.paidExtras": \{[\s\S]*?env: \(\) => false/);
  assert.match(rules, /tailorPrice: on \?/);
  assert.match(sheet, /Tailor a copy for this job \(free\)/);
  assert.match(sheet, /Written by you for this job · Free/);
  assert.match(sheet, /payment coming soon/);
  assert.match(read("app/admin/settings/page.js"), /candidate\.paidExtras/);
});

test("employers see applicants only for their own vacancies", () => {
  const page = read("app/employer/vacancies/[id]/applicants/page.js");
  const api = read("app/api/employer/applications/[id]/route.js");
  assert.match(page, /where: \{ id, employerId: actor\.employer\.id \}/);
  assert.match(page, /<CvPreview cv=\{snapshot\} \/>/);
  assert.match(api, /canManageEmployer\(actor, application\.job\.employerId\)/);
  assert.match(api, /new Set\(\["REVIEWED", "SHORTLISTED", "OFFERED", "REJECTED"\]\)/);
  assert.match(api, /application\.status === "WITHDRAWN"/);
});

test("the job page offers Apply with Daraja CV and keeps the official route", () => {
  const detail = read("app/jobs/[id]/JobDetailPageClient.js");
  assert.match(detail, /job\?\.postedOnDaraja/);
  assert.match(detail, /Apply on their website instead/);
  assert.match(read("lib/public-job.js"), /postedOnDaraja: Boolean\(employerId\)/);
});
