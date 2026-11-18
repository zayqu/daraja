const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("candidate pages share the candidate dashboard menu", async () => {
  const navigation = await read("lib/dashboard-navigation.js");
  const layout = await read("app/account/layout.js");
  const account = await read("app/account/page.js");
  const profile = await read("app/account/profile/edit/page.js");
  const notifications = await read("app/account/notifications/page.js");

  // One menu owner (D-038): the sidebar and the phone "More" sheet read it.
  for (const href of [
    "/account/jobs",
    "/account/career/cv",
    "/account/alerts",
    "/account/profile",
    "/account/notifications",
    "/account/settings",
  ]) {
    assert.match(navigation, new RegExp(`href: "${href.replace(/\//g, "\\/")}"`), href);
  }
  assert.match(layout, /<DashboardFrame>\{children\}<\/DashboardFrame>/);

  for (const page of [
    "app/account/page.js",
    "app/account/jobs/page.js",
    "app/account/settings/page.js",
    "app/account/alerts/page.js",
    "app/account/privacy/page.js",
    "app/account/profile/page.js",
    "app/account/profile/edit/page.js",
    "app/account/notifications/page.js",
    "app/account/career/cv/page.js",
  ]) {
    const source = await read(page);
    assert.match(source, /<PageHeader/, page);
    assert.doesNotMatch(source, /CandidateAccountTabs|PublicSiteNav|<PageHero/, page);
  }

  assert.match(account, /title="Dashboard"/);
  assert.match(account, /title="Recent applications"/);
  assert.match(account, /title="Saved jobs"/);
  assert.match(account, /title="CV Builder"/);
  assert.match(account, /title="Job alerts"/);
  assert.match(account, /callbackUrl=\/account/);
  // Admins and employers are sent to their own dashboards.
  assert.match(account, /if \(home !== "\/account"\) redirect\(home\)/);
  assert.match(profile, /CandidateProfileForm/);
  assert.match(profile, /candidateProfileSelect/);
  assert.match(notifications, /You are all caught up/);
  assert.match(notifications, /will not show fake unread/);
});

test("candidate career and privacy UI keep protected feature boundaries visible", async () => {
  const career = await read("app/account/career/page.js");
  const privacy = await read("app/account/privacy/page.js");

  // The old career workspace is now the candidate dashboard itself, and the
  // old Saved jobs and Applications pages are tabs of My jobs.
  assert.match(career, /permanentRedirect\("\/account"\)/);
  assert.match(await read("app/account/saved/page.js"), /permanentRedirect\("\/account\/jobs\?tab=saved"\)/);
  assert.match(await read("app/account/applications/page.js"), /permanentRedirect\("\/account\/jobs\?tab=applied"\)/);
  for (const page of [
    "app/account/jobs/page.js",
    "app/account/profile/page.js",
    "app/account/profile/edit/page.js",
    "app/account/career/cv/page.js",
  ]) {
    assert.match(await read(page), /if \(!candidateCareerEnabled\(\)\) notFound\(\)/, page);
  }
  assert.match(privacy, /redirect\("\/auth\/signin\?callbackUrl=\/account\/privacy"\)/);
  assert.match(privacy, /AccountDeletionForm/);

  // Settings (every role) checks sign-in itself and never loads the password hash.
  const settings = await read("app/account/settings/page.js");
  assert.match(settings, /redirect\("\/auth\/signin\?callbackUrl=\/account\/settings"\)/);
  assert.match(settings, /password: \{ not: null \}/);
  assert.doesNotMatch(settings, /password: true/);
  // Account settings is a short list that ends with Sign out (D-038).
  assert.match(settings, /<MenuRows items=\{rows\} \/>\s*<SignOutButton \/>/);
});

test("shared job-alert styling uses an explicit CSS module", async () => {
  const alerts = await read("components/JobAlerts.js");
  const styles = await read("components/JobAlerts.module.css");

  assert.match(alerts, /import styles from "\.\/JobAlerts\.module\.css"/);
  assert.doesNotMatch(alerts, /<style jsx>/);
  assert.match(alerts, /styles\.whatsappCard/);
  assert.match(styles, /\.alerts/);
  assert.match(styles, /\.whatsappCard/);
  assert.match(styles, /@media \(max-width: 640px\)/);
});

test("My jobs keeps saved jobs and applications in Saved, Applied and Closed tabs", async () => {
  const page = await read("app/account/jobs/page.js");

  assert.match(page, /\["saved", "Saved"\],\s*\["applied", "Applied"\],\s*\["closed", "Closed"\]/);
  assert.match(page, /const ENDED = new Set\(\["REJECTED", "WITHDRAWN"\]\)/);
  // Only the signed-in candidate's own records, with a search box.
  assert.match(page, /where: \{ userId: user\.id \}/);
  assert.match(page, /where: \{ jobSeekerId: user\.jobSeeker\.id \}/);
  assert.match(page, /name="q"/);
});

test("the Profile tab shows experience, skills and CVs from the candidate's own CVs", async () => {
  const page = await read("app/account/profile/page.js");

  assert.match(page, /\["experience", "Experience"\],\s*\["skills", "Skills"\],\s*\["cvs", "CVs"\]/);
  assert.match(page, /where: \{ jobSeekerId: profile\.id \}/);
  assert.match(page, /normalizeCvContent\(master\.content\)/);
  assert.match(page, /href: "\/account\/profile\/edit", label: "Edit profile"/);
});
