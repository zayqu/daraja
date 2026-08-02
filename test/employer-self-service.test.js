import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public job collection is read-only", () => {
  const route = read("app/api/jobs/route.js");
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function POST/);
  assert.doesNotMatch(route, /createJobWithPositionSlug/);
});

test("vacancy form is protected by account and employer checks", () => {
  const page = read("app/post-job/page.js");
  assert.match(page, /employerPortalEnabled/);
  assert.match(page, /redirect\("\/auth\/signin\?callbackUrl=\/post-job"\)/);
  assert.match(page, /if \(!actor\.employer\) redirect\("\/employer"\)/);
  assert.match(page, /EmployerVacancyForm/);
});

test("employer identity is server owned and vacancy values are controlled", () => {
  const route = read("app/api/employer/jobs/route.js");
  const form = read("components/EmployerVacancyForm.js");
  assert.match(route, /company: actor\.employer\.companyName/);
  assert.match(route, /JOB_CATEGORIES\.includes\(data\.category\)/);
  assert.match(route, /JOB_TYPES\.has\(data\.type\)/);
  assert.doesNotMatch(form, /name="company"/);
});

test("employer profile form uses the authenticated profile endpoint", () => {
  const form = read("components/EmployerProfileForm.js");
  assert.match(form, /fetch\("\/api\/employer\/profile"/);
  assert.match(form, /method: "POST"/);
});
