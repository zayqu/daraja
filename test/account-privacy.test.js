const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("account export requires the authenticated server-side identity", () => {
  const route = read("app/api/account/export/route.js");
  assert.match(route, /const session = await auth\(\)/);
  assert.match(route, /const userId = session\?\.user\?\.id/);
  assert.match(route, /status: 401/);
  assert.doesNotMatch(route, /searchParams|get\("userId"\)|body\.userId/);
});

test("account export is private, non-cacheable and downloaded as JSON", () => {
  const route = read("app/api/account/export/route.js");
  assert.match(route, /private, no-store, max-age=0/);
  assert.match(route, /daraja-account-data\.json/);
  assert.match(route, /application\/json; charset=utf-8/);
  assert.match(route, /X-Content-Type-Options/);
});

test("account export excludes authentication secrets and private storage locators", () => {
  const source = read("lib/account-data-export.js");
  assert.match(source, /provider: true/);
  assert.match(source, /providerAccountId: true/);
  assert.doesNotMatch(source, /password:\s*true/);
  assert.doesNotMatch(source, /refresh_token:\s*true/);
  assert.doesNotMatch(source, /access_token:\s*true/);
  assert.doesNotMatch(source, /id_token:\s*true/);
  assert.doesNotMatch(source, /sessionToken:\s*true/);

  const documentsStart = source.indexOf("documents: {");
  const applicationsStart = source.indexOf("applications: {", documentsStart);
  const documentSelection = source.slice(documentsStart, applicationsStart);
  assert.ok(documentsStart >= 0 && applicationsStart > documentsStart);
  assert.doesNotMatch(documentSelection, /\burl:\s*true/);
  assert.match(source, /privateDocumentStorageLocatorsExcluded: true/);
});

test("privacy center does not pretend deactivation is account deletion", () => {
  const page = read("app/account/privacy/page.js");
  assert.match(page, /Download my account data/);
  assert.match(page, /Delete my account/);
  assert.match(page, /Daraja will not label simple deactivation as[\s\S]*deletion/);
  assert.match(page, /Deletion is not enabled yet/);
  assert.match(page, /callbackUrl=\/account\/privacy/);
});
