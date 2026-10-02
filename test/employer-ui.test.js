const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("employer and admin pages share protected workspace navigation", async () => {
  const tabs = await read("components/EmployerPortalTabs.js");
  const employer = await read("app/employer/page.js");
  const admin = await read("app/admin/page.js");
  const postJob = await read("app/post-job/page.js");

  assert.match(tabs, /\/employer/);
  assert.match(tabs, /\/post-job/);
  assert.match(tabs, /showAdmin/);
  assert.match(employer, /<EmployerPortalTabs showAdmin=\{isAdmin\(actor\)\} \/>/);
  assert.match(admin, /<EmployerPortalTabs showAdmin \/>/);
  assert.match(postJob, /<EmployerPortalTabs showAdmin=\{isAdmin\(actor\)\} \/>/);
});

test("workspace UI preserves employer and admin access boundaries", async () => {
  const employer = await read("app/employer/page.js");
  const admin = await read("app/admin/page.js");
  const postJob = await read("app/post-job/page.js");

  assert.match(employer, /if \(!employerPortalEnabled\(\)\) notFound\(\)/);
  assert.match(employer, /redirect\("\/auth\/signin\?callbackUrl=\/employer"\)/);
  assert.match(admin, /if \(!isAdmin\(actor\)\) notFound\(\)/);
  assert.match(postJob, /if \(!actor\.employer\) redirect\("\/employer"\)/);
  assert.match(postJob, /EmployerVacancyForm companyName=\{actor\.employer\.companyName\}/);
});

test("employer portal keeps candidate privacy messaging and responsive form styling", async () => {
  const employer = await read("app/employer/page.js");
  const styles = await read("app/portal.module.css");

  assert.match(employer, /does not grant unrestricted access to[\s\S]*candidate CVs/);
  assert.match(employer, /PageHero/);
  assert.match(styles, /\.summaryStrip/);
  assert.match(styles, /\.formScope :global\(\.portal-form\)/);
  assert.match(styles, /@media \(max-width: 700px\)/);
});
