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

test("candidate and employer navigation use one workspace tabs primitive", async () => {
  const candidate = await read("components/CandidateAccountTabs.js");
  const employer = await read("components/EmployerPortalTabs.js");
  const shared = await read("components/ui/WorkspaceTabs.js");

  assert.match(candidate, /WorkspaceTabs/);
  assert.match(employer, /WorkspaceTabs/);
  assert.match(shared, /aria-label=\{label\}/);

  await assert.rejects(
    access(path.join(__dirname, "..", "components", "CandidateAccountTabs.module.css")),
  );
  await assert.rejects(
    access(path.join(__dirname, "..", "components", "EmployerPortalTabs.module.css")),
  );
});

test("protected workspaces use shared hero and shell primitives", async () => {
  const pages = await Promise.all([
    read("app/account/career/page.js"),
    read("app/account/alerts/page.js"),
    read("app/account/privacy/page.js"),
    read("app/employer/page.js"),
    read("app/admin/page.js"),
    read("app/post-job/page.js"),
  ]);

  for (const page of pages) {
    assert.match(page, /PageHero/);
    assert.match(page, /WorkspaceShell/);
  }
});

test("shared surface cards own common card chrome", async () => {
  const card = await read("components/ui/SurfaceCard.module.css");
  const privacy = await read("app/account/privacy/page.js");
  const employer = await read("app/employer/page.js");
  const auth = await read("app/auth/signin/page.js");

  assert.match(card, /border: 1px solid var\(--color-border-strong\)/);
  assert.match(card, /border-radius: var\(--radius-card\)/);
  assert.match(privacy, /SurfaceCard/);
  assert.match(employer, /SurfaceCard/);
  assert.match(auth, /SurfaceCard/);
});
