import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("protected feature-flag pages evaluate configuration at request time", () => {
  for (const path of [
    "app/admin/page.js",
    "app/employer/page.js",
    "app/employer/vacancies/page.js",
    "app/employer/vacancies/[id]/page.js",
    "app/employer/profile/page.js",
    "app/employer/profile/edit/page.js",
    "app/post-job/page.js",
    "app/account/page.js",
    "app/account/jobs/page.js",
    "app/account/profile/edit/page.js",
    "app/account/settings/page.js",
    "app/account/profile/page.js",
    "app/account/notifications/page.js",
  ]) {
    assert.match(read(path), /export const dynamic = "force-dynamic"/);
  }
});

test("runtime activation does not weaken account or role checks", () => {
  const admin = read("lib/admin-guard.js");
  const employer = read("app/employer/page.js");
  const postJob = read("app/post-job/page.js");
  const applications = read("app/account/jobs/page.js");
  const profile = read("app/account/profile/page.js");

  assert.match(admin, /if \(!isAdmin\(actor\)\) notFound\(\)/);
  assert.match(read("app/admin/employers/page.js"), /employerPortalEnabled\(\)/);
  assert.match(employer, /employerPortalEnabled\(\)/);
  for (const path of [
    "app/employer/vacancies/page.js",
    "app/employer/vacancies/[id]/page.js",
    "app/employer/profile/page.js",
    "app/employer/profile/edit/page.js",
  ]) {
    assert.match(read(path), /if \(!employerPortalEnabled\(\)\) notFound\(\)/, path);
  }
  assert.match(postJob, /if \(!actor\.employer\) redirect\("\/employer"\)/);
  assert.match(applications, /candidateCareerEnabled\(\)/);
  assert.match(profile, /candidateCareerEnabled\(\)/);
  assert.match(
    applications,
    /redirect\("\/auth\/signin\?callbackUrl=\/account\/jobs"\)/
  );
});
