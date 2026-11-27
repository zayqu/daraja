const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile, access } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("Daraja design tokens have one shared source", async () => {
  const globals = await read("app/globals.css");
  const tokens = await read("styles/tokens.css");

  assert.match(globals, /@import "\.\.\/styles\/tokens\.css"/);
  assert.match(tokens, /--font-daraja:/);
  assert.match(tokens, /--color-navy:/);
  assert.match(tokens, /--color-teal:/);
  assert.match(tokens, /--radius-card:/);
  assert.match(tokens, /--workspace-card-padding:/);
  assert.doesNotMatch(globals, /--color-navy:\s*#1b2a3f/);
});

test("every signed-in role uses one dashboard shell and one menu owner", async () => {
  const shell = await read("components/dashboard/DashboardShell.js");
  const frame = await read("components/dashboard/DashboardFrame.js");
  const dock = await read("components/ui/MobileDock.js");

  assert.match(frame, /<DashboardShell/);
  assert.match(shell, /dashboardMenu\(role, \{ employerPortal, candidateCareer \}\)/);
  assert.match(dock, /dashboardMenu\(userRole/);
  assert.match(shell, /<form action=\{signOutAction\}>/);
  assert.match(dock, /<SignOutButton \/>/);
  assert.match(await read("components/ui/MenuList.js"), /<form action=\{signOutAction\}/);

  // The old per-role tab bars and the separate admin shell are gone.
  for (const removed of [
    "components/CandidateAccountTabs.js",
    "components/EmployerPortalTabs.js",
    "components/ui/WorkspaceTabs.js",
    "components/admin/AdminShell.js",
  ]) {
    await assert.rejects(access(path.join(__dirname, "..", removed)), removed);
  }
});

test("protected workspaces use the shared dashboard page kit", async () => {
  for (const page of [
    "app/account/page.js",
    "app/account/alerts/page.js",
    "app/account/privacy/page.js",
    "app/employer/page.js",
    "app/employer/vacancies/page.js",
    "app/employer/profile/page.js",
    "app/post-job/page.js",
    "app/admin/page.js",
  ]) {
    const source = await read(page);
    assert.match(source, /from "@\/components\/dashboard\/DashboardUi"/, page);
    assert.match(source, /<PageHeader/, page);
    assert.doesNotMatch(source, /PageHero|WorkspaceShell|PublicSiteNav/, page);
  }
});

test("shared surface cards own common card chrome", async () => {
  const card = await read("components/ui/SurfaceCard.module.css");
  const privacy = await read("app/account/privacy/page.js");
  const dashboard = await read("components/dashboard/dashboard.module.css");

  assert.match(card, /border: 1px solid var\(--color-border-strong\)/);
  assert.match(card, /border-radius: var\(--radius-card\)/);
  assert.match(privacy, /SurfaceCard/);
  // Dashboard cards use the same card radius token.
  assert.match(dashboard, /\.card \{[^}]*border-radius: var\(--radius-card\)/);
});
