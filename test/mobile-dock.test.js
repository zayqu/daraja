const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("root layout mounts the shared mobile dock with iPhone safe-area support", async () => {
  const layout = await read("app/layout.js");
  const dock = await read("components/ui/MobileDock.js");
  const styles = await read("components/ui/MobileDock.module.css");

  assert.match(layout, /MobileDock/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(dock, /aria-label="Mobile navigation"/);
  assert.match(dock, /Home/);
  assert.match(dock, /Jobs/);
  assert.doesNotMatch(dock, /\/account\/notifications/);
  assert.doesNotMatch(dock, /\/account\/profile/);
  assert.match(dock, /Internships/);
  assert.match(dock, /More/);
  assert.match(dock, /PRIVACY_SETTINGS_EVENT/);
  assert.match(dock, /Privacy choices/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /backdrop-filter:/);
  assert.match(styles, /--dock-item-count/);
  assert.doesNotMatch(styles, /linear-gradient|radial-gradient/);
});

test("mobile dock is the single primary mobile navigation across routes", async () => {
  const routeRules = await read("lib/mobile-navigation.js");
  const siteNav = await read("components/SiteNav.js");
  const siteNavStyles = await read("components/SiteNav.module.css");
  const dockStyles = await read("components/ui/MobileDock.module.css");
  const shellStyles = await read("components/dashboard/DashboardShell.module.css");

  assert.match(routeRules, /return true/);
  assert.match(siteNav, /mobileDockEnabledPath/);
  assert.match(siteNav, /styles\.dockManaged/);
  assert.match(siteNavStyles, /\.dockManaged \.toggle/);
  assert.match(siteNavStyles, /\.dockManaged \.links/);
  // The dashboard sidebar hides at the same width the dock appears, so every
  // screen size has exactly one menu (no second hamburger, D-027).
  assert.match(dockStyles, /@media \(max-width: 760px\)/);
  assert.match(shellStyles, /@media \(max-width: 760px\)[\s\S]*\.sidebar\s*\{\s*display:\s*none/);
  // A long role menu scrolls inside the sheet instead of running off screen.
  assert.match(dockStyles, /\.sheet \{[^}]*max-height:[^}]*overflow-y: auto/);
});

test("mobile dock uses centralized Daraja design tokens", async () => {
  const tokens = await read("styles/tokens.css");
  const styles = await read("components/ui/MobileDock.module.css");

  assert.match(tokens, /--mobile-dock-max:/);
  assert.match(tokens, /--mobile-dock-radius:/);
  assert.match(tokens, /--mobile-dock-height:/);
  assert.match(styles, /var\(--mobile-dock-max\)/);
  assert.match(styles, /var\(--mobile-dock-radius\)/);
  assert.match(styles, /var\(--mobile-dock-height\)/);
});

test("each role gets task-first phone tabs and a short menu without repeats", async () => {
  const { accountSheetSections, dashboardMenu } = await import("../lib/dashboard-navigation.js");
  const tabs = (menu) => [...menu.dock.map((item) => item.label), menu.accountTab.label];

  const candidate = dashboardMenu("JOB_SEEKER", { candidateCareer: true });
  const employer = dashboardMenu("EMPLOYER", { employerPortal: true });
  const admin = dashboardMenu("ADMIN");
  assert.deepEqual(tabs(candidate), ["Discover", "Saved", "Applications", "Profile"]);
  assert.deepEqual(tabs(employer), ["Overview", "Vacancies", "Post job", "Account"]);
  assert.deepEqual(tabs(admin), ["Overview", "Jobs", "Employers", "More"]);
  assert.deepEqual(tabs(dashboardMenu("JOB_SEEKER")), ["Discover", "Alerts", "Profile"]);

  // Posting is the employer's main action; admins see what waits for review.
  assert.equal(employer.dock.find((item) => item.primary).href, "/post-job");
  assert.deepEqual(admin.dock.filter((item) => item.count).map((item) => item.count), ["pendingJobs", "pendingEmployers"]);
  // No applicant tab until Daraja-managed applications exist for employers.
  assert.doesNotMatch(JSON.stringify(employer), /Applicants/);

  for (const menu of [candidate, employer, admin, dashboardMenu("JOB_SEEKER")]) {
    const dockHrefs = new Set(menu.dock.map((item) => item.href));
    const sheet = accountSheetSections(menu).flatMap((section) => section.items);
    assert.ok(menu.dock.length + 1 >= 3 && menu.dock.length + 1 <= 5, menu.role);
    // Nothing appears twice, and nothing from the desktop menu is lost.
    assert.ok(sheet.every((item) => !dockHrefs.has(item.href)), menu.role);
    for (const item of [...menu.main, ...menu.settings]) {
      assert.ok(dockHrefs.has(item.href) || sheet.includes(item), `${menu.role} ${item.href}`);
    }
  }
});

test("the phone menu is a short list with a quiet sign out", async () => {
  const dock = await read("components/ui/MobileDock.js");
  const styles = await read("components/ui/MobileDock.module.css");

  assert.match(styles, /max-height: min\(75dvh/);
  assert.match(styles, /\.sheetList \{/);
  assert.doesNotMatch(styles, /\.sheetMenu|\.sheetSignOut/);
  // Sign out sits beside the account name as plain text, not a coloured row.
  assert.match(dock, /className=\{styles\.headerActions\}[\s\S]*<form action=\{signOutAction\}>/);
  assert.match(styles, /\.signOut \{[^}]*background: none;/);
  // Admin tabs carry the review counts, counted once per request.
  assert.match(await read("app/layout.js"), /userRole === "ADMIN" \? await getAdminQueueCounts\(\)/);
  assert.match(await read("lib/admin-queue.js"), /export const getAdminQueueCounts = cache\(/);
  assert.match(await read("app/admin/page.js"), /getAdminQueueCounts\(\)/);
  assert.match(dock, /<span className="sr-only">, \{item\.badge\} waiting<\/span>/);
});
