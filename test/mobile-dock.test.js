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
  const menuList = await read("components/ui/MenuList.js");
  assert.match(menuList, /PRIVACY_SETTINGS_EVENT/);
  assert.match(menuList, /Privacy choices/);
  assert.match(dock, /<DarajaLinks/);
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

test("each role gets task-first phone tabs and nothing twice", async () => {
  const { dashboardMenu, secondaryMenuSections } = await import("../lib/dashboard-navigation.js");
  const tabs = (menu) => [...menu.dock.map((item) => item.label), menu.accountTab.label];

  const candidate = dashboardMenu("JOB_SEEKER", { candidateCareer: true });
  const employer = dashboardMenu("EMPLOYER", { employerPortal: true });
  const admin = dashboardMenu("ADMIN");
  assert.deepEqual(tabs(candidate), ["Discover", "My jobs", "CV", "Profile"]);
  assert.deepEqual(tabs(employer), ["Overview", "Vacancies", "Post job", "Account"]);
  assert.deepEqual(tabs(admin), ["Overview", "Jobs", "Employers", "More"]);
  assert.deepEqual(tabs(dashboardMenu("JOB_SEEKER")), ["Discover", "Alerts", "Profile"]);

  // Profile and Account are real pages; only More (admins) opens a menu.
  assert.equal(candidate.accountTab.href, "/account/profile");
  assert.equal(employer.accountTab.href, "/employer/profile");
  assert.equal(admin.accountTab.href, undefined);
  // Posting is the employer's main action; admins see what waits for review.
  assert.equal(employer.dock.find((item) => item.primary).href, "/post-job");
  assert.deepEqual(admin.dock.filter((item) => item.count).map((item) => item.count), ["pendingJobs", "pendingEmployers"]);
  // No applicant tab until Daraja-managed applications exist for employers.
  assert.doesNotMatch(JSON.stringify(employer), /Applicants/);

  for (const menu of [candidate, employer, admin, dashboardMenu("JOB_SEEKER")]) {
    const shown = new Set([...menu.dock.map((item) => item.href), menu.accountTab.href]);
    const rest = secondaryMenuSections(menu).flatMap((section) => section.items);
    assert.ok(menu.dock.length + 1 >= 3 && menu.dock.length + 1 <= 5, menu.role);
    // Nothing appears twice, and nothing from the desktop menu is lost.
    assert.ok(rest.every((item) => !shown.has(item.href)), menu.role);
    for (const item of [...menu.main, ...menu.settings]) {
      assert.ok(shown.has(item.href) || rest.includes(item), `${menu.role} ${item.href}`);
    }
  }
});

test("only More opens a menu, and Sign out sits at the bottom", async () => {
  const dock = await read("components/ui/MobileDock.js");
  const list = await read("components/ui/MenuList.js");
  const styles = await read("components/ui/MobileDock.module.css");

  assert.match(dock, /const hasMore = !menu \|\| !menu\.accountTab\.href;/);
  assert.match(dock, /\{hasMore && sheetOpen && \(/);
  assert.match(dock, /if \(menu\.accountTab\.href\) tabs\.push/);
  assert.match(styles, /max-height: min\(75dvh/);
  assert.doesNotMatch(styles, /\.sheetMenu|\.sheetSignOut|\.headerActions/);
  // Sign out comes last: after the Daraja links in More, and at the bottom of
  // Account settings, which the Profile/Account page's gear menu opens.
  assert.match(dock, /<DarajaLinks onNavigate=\{close\} \/>\s*<SignOutButton \/>/);
  assert.match(await read("app/account/settings/page.js"), /<MenuRows items=\{rows\} \/>\s*<SignOutButton \/>/);
  for (const page of ["app/account/profile/page.js", "app/employer/profile/page.js"]) {
    assert.match(await read(page), /<ProfileMenu[\s\S]*href: "\/account\/settings", label: "Account settings"/, page);
  }
  // Clear labels, and visitors learn that job alerts need an account.
  assert.match(list, />About Daraja</);
  assert.match(list, /WhatsApp Channel/);
  assert.match(dock, /href: "\/auth\/signin\?callbackUrl=\/account\/alerts"[\s\S]*hint: "Free account needed"/);
  // Admin tabs carry the review counts, counted once per request.
  assert.match(await read("app/layout.js"), /userRole === "ADMIN" \? await getAdminQueueCounts\(\)/);
  assert.match(await read("lib/admin-queue.js"), /export const getAdminQueueCounts = cache\(/);
  assert.match(await read("app/admin/page.js"), /getAdminQueueCounts\(\)/);
  assert.match(dock, /<span className="sr-only">, \{item\.badge\} waiting<\/span>/);
});
