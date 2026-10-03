const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relative) {
  return readFile(path.join(__dirname, "..", relative), "utf8");
}

test("visitor period follows Tanzania calendar month and filters obvious bots", async () => {
  const {
    currentVisitorPeriod,
    isLikelyBot,
  } = await import("../lib/visitor-counter.js");

  assert.equal(
    currentVisitorPeriod(new Date("2026-10-31T22:30:00.000Z")),
    "2026-11"
  );
  assert.equal(isLikelyBot("Mozilla/5.0 Googlebot/2.1"), true);
  assert.equal(isLikelyBot("Mozilla/5.0 Chrome/154 Safari/537.36"), false);
});

test("visitor endpoint is consent-gated, rate-limited and monthly-cookie deduplicated", async () => {
  const route = await read("app/api/visitors/route.js");

  assert.match(route, /protectMutation/);
  assert.match(route, /scope: "visitor-counter"/);
  assert.match(route, /x-daraja-consent/);
  assert.match(route, /VISITOR_PERIOD_COOKIE/);
  assert.match(route, /httpOnly: true/);
  assert.match(route, /sameSite: "lax"/);
  assert.match(route, /uniqueVisitors: \{ increment: 1 \}/);
  assert.doesNotMatch(route, /fingerprint|deviceId|ipAddress/);
});

test("visitor counter only records after accepted privacy consent", async () => {
  const component = await read("components/VisitorCounter.js");
  const privacy = await read("app/privacy/page.js");

  assert.match(component, /CONSENT_STORAGE_KEY/);
  assert.match(component, /CONSENT_EVENT/);
  assert.match(component, /acceptedConsent\(\)/);
  assert.match(component, /x-daraja-consent/);
  assert.match(privacy, /count the browser once[\s\S]*calendar month/);
  assert.match(privacy, /rather than storing a persistent[\s\S]*visitor identifier/);
});

test("visitor metric is stored as aggregate monthly count only", async () => {
  const schema = await read("prisma/schema.prisma");
  const migration = await read(
    "prisma/migrations/20261003193500_add_visitor_counter/migration.sql"
  );
  const home = await read("app/page.js");
  const stats = await read("lib/home-stats.js");

  assert.match(schema, /model VisitorCounter[\s\S]*period\s+String\s+@id/);
  assert.match(schema, /uniqueVisitors\s+Int\s+@default\(0\)/);
  assert.match(migration, /CREATE TABLE "VisitorCounter"/);
  assert.match(home, /<VisitorCounter initialCount=\{stats\.visitorsThisMonth\}/);
  assert.match(stats, /prisma\.visitorCounter/);
  assert.match(stats, /visitorsThisMonth/);
});
