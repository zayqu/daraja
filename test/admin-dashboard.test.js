import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { applySourceSettings, getSourceCatalog } = require("../scraper/lib/source-settings.js");
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const ADMIN_PAGES = [
  "app/admin/page.js",
  "app/admin/jobs/page.js",
  "app/admin/jobs/new/page.js",
  "app/admin/jobs/[id]/page.js",
  "app/admin/users/page.js",
  "app/admin/employers/page.js",
  "app/admin/employers/new/page.js",
  "app/admin/employers/[id]/page.js",
  "app/admin/categories/page.js",
  "app/admin/sources/page.js",
];

const ADMIN_WRITE_ROUTES = [
  "app/api/admin/jobs/route.js",
  "app/api/admin/jobs/[id]/route.js",
  "app/api/admin/jobs/[id]/moderate/route.js",
  "app/api/admin/users/[id]/route.js",
  "app/api/admin/employers/route.js",
  "app/api/admin/employers/[id]/route.js",
  "app/api/admin/categories/route.js",
  "app/api/admin/sources/[id]/route.js",
];

test("every admin page checks for an administrator itself", () => {
  const layout = read("app/admin/layout.js");
  assert.match(layout, /requireAdminPage\(\)/);
  for (const page of ADMIN_PAGES) {
    assert.match(read(page), /await requireAdminPage\(/, page);
    assert.match(read(page), /export const dynamic = "force-dynamic"/, page);
  }
  const guard = read("lib/admin-guard.js");
  assert.match(guard, /redirect\(`\/auth\/signin\?callbackUrl=/);
  assert.match(guard, /if \(!isAdmin\(actor\)\) notFound\(\)/);
});

test("every admin write is admin-only, same-origin, throttled and audited", () => {
  for (const route of ADMIN_WRITE_ROUTES) {
    const source = read(route);
    assert.match(source, /isAdmin\(actor\)/, route);
    assert.match(source, /requireOrigin: true/, route);
    assert.match(source, /rateIdentity: actor\.id/, route);
    assert.match(source, /auditEvent\.create/, route);
    assert.doesNotMatch(source, /await request\.json\(\)/, route);
  }
});

test("admin edits survive scrapes and deletes keep candidate records", () => {
  const edit = read("app/api/admin/jobs/[id]/route.js");
  assert.match(edit, /adminEditedAt: now/);
  assert.match(edit, /job\._count\.applications > 0/);
  assert.match(edit, /status: 409/);
  const store = read("scraper/lib/store.js");
  assert.match(store, /if \(existing\.adminEditedAt\)/);
});

test("users: no self or owner changes, suspension signs out, deletion reuses account erasure", () => {
  const route = read("app/api/admin/users/[id]/route.js");
  assert.match(route, /id === actor\.id/);
  assert.match(route, /isOwnerEmail\(target\.email\)/);
  assert.match(route, /session\.deleteMany\(\{ where: \{ userId: target\.id \} \}\)/);
  assert.match(route, /A reason is required to suspend an account/);
  assert.match(route, /eraseAccount\(/);
  const login = read("app/api/account/login/route.js");
  assert.match(login, /user\.suspendedAt/);
});

test("employers can be added only for existing non-admin accounts", () => {
  const route = read("app/api/admin/employers/route.js");
  assert.match(route, /No Daraja account uses that email/);
  assert.match(route, /Admin accounts cannot own a company profile/);
  assert.match(route, /data: \{ role: "EMPLOYER" \}/);
});

test("source switches only apply to sources with a scraper", () => {
  const catalog = getSourceCatalog();
  const runnable = catalog.find((source) => source.adapter);
  const planned = catalog.find((source) => !source.adapter);
  const result = applySourceSettings(catalog, [
    { sourceId: runnable.id, enabled: !runnable.enabled },
    { sourceId: planned.id, enabled: true },
  ]);
  assert.equal(result.find((source) => source.id === runnable.id).enabled, !runnable.enabled);
  assert.equal(result.find((source) => source.id === planned.id).enabled, planned.enabled);
  const route = read("app/api/admin/sources/[id]/route.js");
  assert.match(route, /if \(!source\.adapter\)/);
  const run = read("scraper/run.js");
  assert.match(run, /applySourceSettings\(getSourceCatalog\(\), settings\)/);
});

test("schema changes for the admin dashboard are additive", () => {
  const migration = read("prisma/migrations/20261021120000_admin_suspension_and_source_settings/migration.sql");
  assert.doesNotMatch(migration, /DROP|DELETE|TRUNCATE|ALTER COLUMN/i);
  assert.match(migration, /ADD COLUMN "suspendedAt"/);
  assert.match(migration, /ADD COLUMN "adminEditedAt"/);
  assert.match(migration, /CREATE TABLE "ScraperSourceSetting"/);
});
