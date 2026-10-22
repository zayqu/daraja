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
  "app/admin/settings/page.js",
];

const ADMIN_WRITE_ROUTES = [
  "app/api/admin/jobs/route.js",
  "app/api/admin/jobs/[id]/route.js",
  "app/api/admin/jobs/[id]/moderate/route.js",
  "app/api/admin/users/[id]/route.js",
  "app/api/admin/employers/route.js",
  "app/api/admin/employers/[id]/route.js",
  "app/api/admin/categories/route.js",
  "app/api/admin/sources/route.js",
  "app/api/admin/sources/[id]/route.js",
  "app/api/admin/settings/route.js",
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

test("admins can add configurable sources; unsafe or duplicate ones are refused", () => {
  const { parseSourceInput } = require("../scraper/lib/source-settings.js");
  const ok = parseSourceInput(
    { name: "Acme Careers", url: "https://careers.acme.co.tz/jobs", detailPathPattern: "^/jobs/" },
    { isNew: true, existingIds: [] }
  );
  assert.equal(ok.row.sourceId, "acme-careers");
  assert.equal(ok.row.adapter, "verified-agency");
  assert.deepEqual(ok.row.config.discovery.allowedHosts, ["careers.acme.co.tz"]);
  assert.match(parseSourceInput({ name: "Local", url: "https://127.0.0.1/jobs" }, { isNew: true }).error, /public https/);
  assert.match(parseSourceInput({ name: "Acme Careers", url: "https://acme.co.tz" }, { isNew: true, existingIds: ["acme-careers"] }).error, /already exists/);
  assert.match(parseSourceInput({ name: "Bad", url: "https://bad.co.tz", detailPathPattern: "([" }, { isNew: true }).error, /pattern/);
  const create = read("app/api/admin/sources/route.js");
  assert.match(create, /enabled: false, autoPublish: false/);
});

test("admin-added sources join the catalogue and removed ones disappear", () => {
  const added = { sourceId: "acme-careers", name: "Acme", url: "https://acme.co.tz/jobs", adapter: "verified-agency", enabled: true, config: { discovery: { mode: "listing" } } };
  const catalog = getSourceCatalog();
  const first = catalog.find((source) => source.adapter);
  const result = applySourceSettings(catalog, [added, { sourceId: first.id, enabled: false, deletedAt: new Date() }]);
  assert.ok(result.find((source) => source.id === "acme-careers" && source.addedByAdmin));
  assert.equal(result.find((source) => source.id === first.id), undefined);
});

test("categories follow the admin list: renamed categories keep their rules, new keywords sort jobs", () => {
  const { configureCategories, categorizeJob } = require("../scraper/lib/categories.js");
  try {
    configureCategories([
      { name: "Finance & Accounts", slug: "accounting-and-audit", keywords: [], active: true },
      { name: "Aviation", slug: "aviation", keywords: ["pilot", "cabin crew"], active: true },
      { name: "Other", slug: "general", isFallback: true, active: true },
    ]);
    assert.equal(categorizeJob({ title: "Senior Accountant" }), "Finance & Accounts");
    assert.equal(categorizeJob({ title: "First Officer Pilot" }), "Aviation");
    assert.equal(categorizeJob({ title: "Cleaner" }), "Other");
  } finally {
    configureCategories([]);
  }
  assert.equal(categorizeJob({ title: "Senior Accountant" }), "Accounting & Audit");
  const route = read("app/api/admin/categories/route.js");
  assert.match(route, /array_replace\("categories"/);
  assert.match(route, /The fallback category cannot be deleted/);
});

test("admin review phrases block or hold scraped vacancies on top of built-in rules", () => {
  const { configurePolicy, decidePublication } = require("../scraper/lib/job-policy.js");
  try {
    configurePolicy({ blockPhrases: ["send your passport"], holdPhrases: ["night shift"] });
    assert.equal(decidePublication({ title: "Driver", description: "Please send your passport copy" }, "ajira").status, "REJECTED");
    const held = decidePublication({ title: "Guard", description: "Night shift role" }, "ajira");
    assert.equal(held.status, "PENDING_REVIEW");
    assert.match(held.note, /night shift/);
  } finally {
    configurePolicy({});
  }
  assert.equal(decidePublication({ title: "Guard", description: "Night shift role" }, "ajira").status, "PUBLISHED");
});

test("site settings are admin-only, whitelisted and fall back to the server environment", () => {
  const route = read("app/api/admin/settings/route.js");
  assert.match(route, /SITE_SETTINGS\[key\]/);
  assert.match(route, /Unknown setting/);
  assert.match(route, /isAdmin\(actor\)/);
  const features = read("lib/features.js");
  assert.match(features, /process\.env\.EMPLOYER_PORTAL_ENABLED === "true"/);
  assert.doesNotMatch(features, /RESEND_API_KEY|DATABASE_URL|AUTH_SECRET/);
});

test("trusted verified employers publish without review", () => {
  const route = read("app/api/employer/jobs/route.js");
  assert.match(route, /actor\.employer\.autoPublish && actor\.employer\.verificationStatus === "VERIFIED"/);
});
