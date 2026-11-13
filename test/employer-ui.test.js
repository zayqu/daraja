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
  const postJob = await read("app/post-job/page.js");

  assert.match(tabs, /\/employer/);
  assert.match(tabs, /\/post-job/);
  assert.match(tabs, /showAdmin/);
  assert.match(tabs, /showCreateVacancy \?/);
  assert.match(
    employer,
    /<EmployerPortalTabs showAdmin=\{isAdmin\(actor\)\} showCreateVacancy=\{canCreateVacancy\} \/>/
  );
  assert.match(postJob, /<EmployerPortalTabs showAdmin=\{isAdmin\(actor\)\} showCreateVacancy \/>/);
});

test("workspace tabs mark the page the visitor is on", async () => {
  const tabs = await read("components/ui/WorkspaceTabs.js");
  const styles = await read("components/ui/WorkspaceTabs.module.css");

  assert.match(tabs, /usePathname\(\)/);
  assert.match(tabs, /aria-current=\{link\.href === current \? "page" : undefined\}/);
  assert.match(styles, /\.tabs a\.current \{/);
});

test("workspace UI preserves employer and admin access boundaries", async () => {
  const employer = await read("app/employer/page.js");
  const admin = await read("lib/admin-guard.js");
  const postJob = await read("app/post-job/page.js");

  assert.match(employer, /if \(!employerPortalEnabled\(\)\) notFound\(\)/);
  assert.match(employer, /redirect\("\/auth\/signin\?callbackUrl=\/employer"\)/);
  assert.match(admin, /if \(!isAdmin\(actor\)\) notFound\(\)/);
  assert.match(postJob, /if \(!actor\.employer && isAdmin\(actor\)\) redirect\(postJobHref\(actor\.role\)\)/);
  assert.match(postJob, /if \(!actor\.employer\) redirect\("\/employer"\)/);
  assert.match(postJob, /if \(isSuspendedEmployer\(actor\)\) redirect\("\/employer"\)/);
  assert.match(postJob, /EmployerVacancyForm companyName=\{actor\.employer\.companyName\}/);
});

test("admins are sent to the admin job form, never the employer profile form", async () => {
  const employer = await read("app/employer/page.js");
  const siteNav = await read("components/SiteNav.js");
  const dock = await read("components/ui/MobileDock.js");
  const profileRoute = await read("app/api/employer/profile/route.js");

  // The profile API refuses admin accounts, so the page must not offer them the form.
  assert.match(profileRoute, /actor\.role !== "JOB_SEEKER" && actor\.role !== "EMPLOYER"/);
  assert.match(employer, /const adminView = isAdmin\(actor\) && !actor\.employer;/);
  assert.match(employer, /\{adminView \? \(\s*<AdminShortcuts \/>/);
  assert.match(employer, /href=\{postJobHref\("ADMIN"\)\}/);
  assert.match(siteNav, /href=\{postJobHref\(account\?\.role\)\}/);
  assert.match(dock, /href=\{postJobHref\(userRole\)\}/);
});

test("each employer verification state has its own guidance", async () => {
  const employer = await read("app/employer/page.js");
  const access = await read("lib/employer-access.js");

  for (const state of ["NOT_STARTED", "PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]) {
    assert.match(employer, new RegExp(`status === "${state}"`));
  }
  // Rejected employers correct and resend the details Daraja already holds.
  assert.match(employer, /<EmployerProfileForm initial=\{employer\} submitLabel="Send updated details" \/>/);
  assert.match(access, /verificationNote: true/);
  assert.match(access, /industry: true/);
  assert.match(access, /website: true/);
});

test("suspended employers cannot reset their verification or send vacancies", async () => {
  const access = await read("lib/employer-access.js");
  assert.match(access, /verificationStatus === "SUSPENDED"/);

  for (const route of [
    "app/api/employer/profile/route.js",
    "app/api/employer/jobs/route.js",
    "app/api/employer/jobs/[id]/route.js",
  ]) {
    const source = await read(route);
    assert.match(source, /isSuspendedEmployer\(actor\)/, route);
    assert.match(source, /This employer account is suspended/, route);
  }
});

test("employer portal keeps candidate privacy messaging and responsive form styling", async () => {
  const employer = await read("app/employer/page.js");
  const styles = await read("app/portal.module.css");

  assert.match(employer, /do not get open access to candidate CVs/);
  assert.match(employer, /PageHero/);
  assert.match(styles, /\.summaryStrip/);
  assert.match(styles, /\.formScope :global\(\.portal-form\)/);
  assert.match(styles, /@media \(max-width: 700px\)/);
});

test("employer forms keep buttons and choices out of the text-field grid", async () => {
  const profileForm = await read("components/EmployerProfileForm.js");
  const vacancyForm = await read("components/EmployerVacancyForm.js");
  const styles = await read("app/portal.module.css");

  // A submit button placed straight into the two-column grid stretches into a
  // large block; it belongs in the full-width actions row.
  assert.match(profileForm, /<div className="portal-actions">\s*<button className="portal-submit"/);
  assert.match(vacancyForm, /<div className="portal-actions">\s*<button className="portal-submit"/);
  assert.match(vacancyForm, /className="portal-field portal-choices"/);
  assert.match(vacancyForm, /className="portal-choice-row"/);
  assert.match(styles, /:global\(\.portal-choice-row input\[type="radio"\]\)/);
});

test("vacancy statuses and Daraja notes are shown as written", async () => {
  const employer = await read("app/employer/page.js");
  const styles = await read("app/portal.module.css");

  assert.doesNotMatch(styles, /text-transform: capitalize/);
  assert.match(employer, /Daraja&apos;s note: \{job\.moderationNote\}/);
  assert.match(employer, /label: "In review"/);
  assert.match(employer, /label: "Live"/);
  assert.match(styles, /\.vacancyList li \{/);
  assert.match(styles, /\.portalCard ul \{[^}]*list-style: disc;/);
});
