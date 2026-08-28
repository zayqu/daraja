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

test("account deletion derives identity from the session and uses the protected mutation boundary", () => {
  const route = read("app/api/account/delete/route.js");
  assert.match(route, /const session = await auth\(\)/);
  assert.match(route, /const userId = session\?\.user\?\.id/);
  assert.match(route, /readProtectedJson\(request/);
  assert.match(route, /scope: "account-deletion"/);
  assert.match(route, /limit: 5/);
  assert.match(route, /maxBytes: 2_048/);
  assert.doesNotMatch(route, /body\.userId|searchParams|get\("userId"\)/);
});

test("account erasure removes active identity and private career state", () => {
  const source = read("lib/account-deletion.js");
  assert.match(source, /DELETE MY ACCOUNT/);
  assert.match(source, /tx\.session\.deleteMany/);
  assert.match(source, /tx\.account\.deleteMany/);
  assert.match(source, /tx\.verificationToken\.deleteMany/);
  assert.match(source, /tx\.jobAlertSubscriber\.deleteMany/);
  assert.match(source, /tx\.savedJob\.deleteMany/);
  assert.match(source, /tx\.application\.deleteMany/);
  assert.match(source, /tx\.candidateDocument\.deleteMany/);
  assert.match(source, /tx\.jobSeeker\.delete/);
  assert.match(source, /tx\.freelancer\.delete/);
  assert.match(source, /tx\.employer\.delete/);
  assert.match(source, /tx\.user\.delete/);
  assert.match(source, /stageCandidateDocumentDeletion/);
  assert.match(source, /restoreStagedCandidateDocument/);
  assert.match(source, /finalizeStagedCandidateDocumentDeletion/);
});

test("account erasure de-identifies retained business and financial evidence", () => {
  const source = read("lib/account-deletion.js");
  assert.match(source, /deleted-account:\$\{randomUUID\(\)\}/);
  assert.match(source, /where: \{ employerId: account\.employer\.id \}[\s\S]*data: \{ employerId: null \}/);
  assert.match(source, /where: \{ submittedById: userId \}[\s\S]*submittedById: null/);
  assert.match(source, /where: \{ moderatedById: userId \}[\s\S]*moderatedById: null/);
  assert.match(source, /tx\.payment\.updateMany[\s\S]*data: \{ userId: deletionReference \}/);
  assert.match(source, /tx\.subscription\.updateMany[\s\S]*data: \{ userId: deletionReference \}/);
  assert.match(source, /ACCOUNT_DELETED/);
  assert.match(source, /adminCount <= 1/);
  assert.match(source, /LAST_ADMIN/);
});

test("privacy center presents export before irreversible deletion", () => {
  const page = read("app/account/privacy/page.js");
  const form = read("app/account/privacy/AccountDeletionForm.js");
  assert.match(page, /Download my account data/);
  assert.match(page, /Delete my account permanently/);
  assert.match(page, /Download your account data first/);
  assert.match(page, /Public employer vacancy records may remain[\s\S]*detached/);
  assert.match(form, /DELETE MY ACCOUNT/);
  assert.match(form, /acknowledgeDataLoss/);
  assert.match(form, /cannot be undone/);
  assert.match(page, /callbackUrl=\/account\/privacy/);
  assert.doesNotMatch(page, /Deletion is not enabled yet/);
});
