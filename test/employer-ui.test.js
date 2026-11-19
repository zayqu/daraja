const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("employer, admin and post-job pages share the signed-in dashboard frame", async () => {
  const navigation = await read("lib/dashboard-navigation.js");
  const frame = await read("components/dashboard/DashboardFrame.js");

  assert.match(await read("app/employer/layout.js"), /<DashboardFrame>\{children\}<\/DashboardFrame>/);
  assert.match(await read("app/post-job/layout.js"), /<DashboardFrame>\{children\}<\/DashboardFrame>/);
  assert.match(await read("app/admin/layout.js"), /await requireAdminPage\(\);[\s\S]*const counts = await getAdminQueueCounts\(\);[\s\S]*<DashboardFrame counts=\{counts\}>/);

  // Each role gets its own menu; employers fall back to the candidate menu
  // while the employer portal is switched off, like roleHome().
  assert.match(navigation, /if \(role === "ADMIN"\) return adminMenu\(\);/);
  assert.match(navigation, /if \(role === "EMPLOYER" && employerPortal\) return employerMenu\(\);/);
  assert.match(navigation, /\{ href: "\/employer\/vacancies", label: "My vacancies", icon: "jobs" \}/);
  assert.match(navigation, /\{ href: postJobHref\("EMPLOYER"\), label: "Post a job", icon: "plus" \}/);
  assert.match(navigation, /\{ href: "\/employer\/profile", label: "Company profile", icon: "employer" \}/);
  assert.match(frame, /employerPortal=\{employerPortal\}/);
  assert.match(frame, /candidateCareer=\{candidateCareer\}/);
});

test("dashboard menus mark exactly one page as current", async () => {
  const shell = await read("components/dashboard/DashboardShell.js");
  const dock = await read("components/ui/MobileDock.js");
  const { activeMenuHref, dashboardMenu } = await import("../lib/dashboard-navigation.js");
  const items = (menu) => [...menu.main, ...menu.settings];

  assert.match(shell, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(shell, /activeMenuHref\(\[\.\.\.menu\.main, \.\.\.menu\.settings\], pathname\)/);
  assert.match(dock, /activeHref = activeMenuHref\(/);

  const employer = items(dashboardMenu("EMPLOYER", { employerPortal: true }));
  assert.equal(activeMenuHref(employer, "/employer"), "/employer");
  assert.equal(activeMenuHref(employer, "/employer/vacancies/abc123"), "/employer/vacancies");
  assert.equal(activeMenuHref(employer, "/post-job"), "/post-job");

  const admin = items(dashboardMenu("ADMIN"));
  assert.equal(activeMenuHref(admin, "/admin"), "/admin");
  assert.equal(activeMenuHref(admin, "/admin/jobs/abc123"), "/admin/jobs");
  assert.equal(activeMenuHref(admin, "/admin/jobs/new"), "/admin/jobs/new");

  const candidate = items(dashboardMenu("JOB_SEEKER", { candidateCareer: true }));
  assert.equal(activeMenuHref(candidate, "/account"), "/account");
  assert.equal(activeMenuHref(candidate, "/account/settings"), "/account/settings");
  assert.equal(activeMenuHref(candidate, "/jobs/some-job"), null);

  // Without the employer portal an employer account uses the candidate menu.
  assert.equal(dashboardMenu("EMPLOYER").role, "JOB_SEEKER");
  assert.ok(!items(dashboardMenu("JOB_SEEKER")).some((item) => item.href === "/account/applications"));
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
  assert.match(postJob, /<EmployerVacancyForm\s+companyName=\{actor\.employer\.companyName\}/);
});

test("admins are sent to the admin job form, never the employer profile form", async () => {
  const employer = await read("app/employer/page.js");
  const profile = await read("app/employer/profile/page.js");
  const vacancies = await read("app/employer/vacancies/page.js");
  const siteNav = await read("components/SiteNav.js");
  const navigation = await read("lib/dashboard-navigation.js");
  const profileRoute = await read("app/api/employer/profile/route.js");

  // The profile API refuses admin accounts, so the pages must not offer them the form.
  assert.match(profileRoute, /actor\.role !== "JOB_SEEKER" && actor\.role !== "EMPLOYER"/);
  assert.match(employer, /if \(isAdmin\(actor\) && !actor\.employer\) redirect\("\/admin"\);/);
  assert.match(profile, /if \(isAdmin\(actor\) && !actor\.employer\) redirect\("\/account\/settings"\);/);
  assert.match(vacancies, /if \(isAdmin\(actor\) && !actor\.employer\) redirect\("\/admin\/jobs"\);/);
  assert.match(siteNav, /href=\{postJobHref\(account\?\.role\)\}/);
  assert.match(navigation, /\{ href: postJobHref\("ADMIN"\), label: "Post a job", icon: "plus" \}/);
});

test("each employer verification state has its own guidance", async () => {
  const employer = await read("app/employer/page.js");
  const notice = await read("components/EmployerVerificationNotice.js");
  const profile = await read("app/employer/profile/edit/page.js");
  const access = await read("lib/employer-access.js");

  // No profile yet: the company details form and how posting works.
  assert.match(employer, /if \(!actor\.employer\) return <EmployerSetup \/>;/);
  assert.match(employer, /<EmployerVerificationNotice employer=\{employer\} \/>/);
  for (const state of ["PENDING", "REJECTED", "SUSPENDED"]) {
    assert.match(notice, new RegExp(`status === "${state}"`));
  }
  assert.match(notice, /Daraja's note: \$\{employer\.verificationNote\}/);
  // Rejected employers correct and resend the details Daraja already holds.
  assert.match(profile, /initial=\{employer\}/);
  assert.match(profile, /employer\.verificationStatus === "REJECTED" \? "Send updated details" : "Save changes"/);
  // Only an administrator lifts a suspension, so suspended employers cannot edit.
  assert.match(profile, /if \(isSuspendedEmployer\(actor\)\) redirect\("\/employer\/profile"\)/);
  assert.match(access, /verificationNote: true/);
  assert.match(access, /industry: true/);
  assert.match(access, /website: true/);
});

test("suspended employers cannot reset their verification or send vacancies", async () => {
  const access = await read("lib/employer-access.js");
  assert.match(access, /verificationStatus === "SUSPENDED"/);
  // ...and are not offered the paid "feature a vacancy" card meanwhile.
  assert.match(await read("components/dashboard/DashboardFrame.js"), /showPromo=\{user\.employer\?\.verificationStatus !== "SUSPENDED"\}/);

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
  assert.match(employer, /<PageHeader/);
  assert.match(employer, /className=\{portal\.formScope\}/);
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
  const vacancies = await read("app/employer/vacancies/page.js");
  const edit = await read("app/employer/vacancies/[id]/page.js");
  const rules = await read("lib/employer-vacancy.js");
  const dashboardStyles = await read("components/dashboard/dashboard.module.css");

  assert.doesNotMatch(await read("app/portal.module.css"), /text-transform: capitalize/);
  assert.doesNotMatch(dashboardStyles, /text-transform: capitalize/);
  assert.match(vacancies, /`Daraja's note: \$\{job\.moderationNote\}`/);
  assert.match(edit, /job\.moderationNote/);
  for (const label of ["Live", "Closed", "In review", "Not approved", "Draft"]) {
    assert.match(rules, new RegExp(`label: "${label}"`));
  }
  // Closing dates that have passed read "Closed", never "Closes".
  assert.match(await read("components/dashboard/DashboardUi.js"), /`Closed \$\{formatDate\(date\)\}`/);
});

test("employers can edit, resend and close their own vacancies", async () => {
  const vacancies = await read("app/employer/vacancies/page.js");
  const edit = await read("app/employer/vacancies/[id]/page.js");
  const form = await read("components/EmployerVacancyForm.js");
  const close = await read("components/WithdrawVacancyButton.js");

  assert.match(edit, /where: \{ id, employerId: actor\.employer\.id \}/);
  assert.match(edit, /EMPLOYER_EDITABLE_STATUSES\.has\(job\.moderationStatus\)/);
  assert.match(edit, /<EmployerVacancyForm[\s\S]*vacancyId=\{job\.id\}[\s\S]*initialValues=\{vacancyFormValues\(job\)\}/);
  assert.match(form, /fetch\(editing \? `\/api\/employer\/jobs\/\$\{vacancyId\}` : "\/api\/employer\/jobs"/);
  assert.match(form, /method: editing \? "PATCH" : "POST"/);
  assert.match(vacancies, /<WithdrawVacancyButton/);
  assert.match(close, /JSON\.stringify\(\{ action: "withdraw" \}\)/);
});
