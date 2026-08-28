const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("candidate alerts require authentication and never trust a submitted email", () => {
  const route = read("app/api/job-alerts/route.js");
  assert.match(route, /const user = await getSessionUser\(\)/);
  assert.match(route, /status: 401/);
  assert.doesNotMatch(route, /body\.email/);
  assert.match(route, /user\.email\.toLowerCase\(\)/);
});

test("candidate preferences use the controlled category catalogue", () => {
  const route = read("app/api/job-alerts/route.js");
  const form = read("components/AlertPreferencesForm.js");
  assert.match(route, /normalizeList\(body\.categories, JOB_CATEGORIES\)/);
  assert.match(form, /JOB_CATEGORIES\.map/);
  assert.match(form, /Alerts use these exact categories/);
  assert.match(form, /Can’t find your professional field/);
  assert.match(form, /setCategories\(\[\]\)/);
  assert.match(form, /setConsent\(false\)/);
  assert.match(form, /aggregate\s+candidate demand/);
});

test("only fully configured sign-in providers are presented with bounded database sessions", () => {
  const auth = read("auth.js");
  assert.match(auth, /AUTH_GOOGLE_ID && process\.env\.AUTH_GOOGLE_SECRET/);
  assert.match(auth, /RESEND_API_KEY && process\.env\.JOB_ALERTS_FROM_EMAIL/);
  assert.match(auth, /strategy: "database"/);
  assert.match(auth, /SESSION_MAX_AGE_SECONDS = 7 \* 24 \* 60 \* 60/);
  assert.match(auth, /SESSION_UPDATE_AGE_SECONDS = 24 \* 60 \* 60/);
  assert.match(auth, /maxAge: SESSION_MAX_AGE_SECONDS/);
  assert.match(auth, /updateAge: SESSION_UPDATE_AGE_SECONDS/);
});

test("candidate account migration pauses anonymous alerts and adds delivery deduplication", () => {
  const migration = read(
    "prisma/migrations/20260728160000_candidate_accounts_and_alerts/migration.sql"
  );
  assert.match(migration, /SET "active" = false WHERE "userId" IS NULL/);
  assert.match(migration, /JobAlertDelivery_deduplicationKey_key/);
  assert.match(migration, /ON DELETE CASCADE/);
});
