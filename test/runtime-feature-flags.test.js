import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("protected feature-flag pages evaluate configuration at request time", () => {
  for (const path of [
    "app/admin/page.js",
    "app/employer/page.js",
    "app/post-job/page.js",
    "app/account/career/page.js",
  ]) {
    assert.match(read(path), /export const dynamic = "force-dynamic"/);
  }
});

test("runtime activation does not weaken account or role checks", () => {
  const admin = read("app/admin/page.js");
  const employer = read("app/employer/page.js");
  const postJob = read("app/post-job/page.js");
  const career = read("app/account/career/page.js");

  assert.match(admin, /employerPortalEnabled\(\)/);
  assert.match(admin, /isAdmin\(actor\)/);
  assert.match(employer, /employerPortalEnabled\(\)/);
  assert.match(postJob, /if \(!actor\.employer\) redirect\("\/employer"\)/);
  assert.match(career, /candidateCareerEnabled\(\)/);
  assert.match(career, /redirect\("\/auth\/signin\?callbackUrl=\/account\/career"\)/);
});
