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

test("traffic endpoint counts aggregate visits without storing visitor identity", async () => {
  const route = await read("app/api/visitors/route.js");

  assert.match(route, /protectMutation/);
  assert.match(route, /scope: "visitor-counter"/);
  assert.match(route, /VISITOR_SESSION_COOKIE/);
  assert.match(route, /VISITOR_SEEN_COOKIE/);
  assert.match(route, /VISITOR_PERIOD_COOKIE/);
  assert.match(route, /totalVisits/);
  assert.match(route, /newVisitors/);
  assert.match(route, /returningVisitors/);
  assert.match(route, /pageViews/);
  assert.match(route, /httpOnly: true/);
  assert.match(route, /sameSite: "lax"/);
  assert.doesNotMatch(route, /x-daraja-consent/);
  assert.doesNotMatch(route, /fingerprint|deviceId|ipAddress/);
});

test("global tracker records route views across the site", async () => {
  const tracker = await read("components/TrafficTracker.js");
  const layout = await read("app/layout.js");

  assert.match(tracker, /usePathname/);
  assert.match(tracker, /useSearchParams/);
  assert.match(tracker, /fetch\("\/api\/visitors"/);
  assert.match(tracker, /keepalive: true/);
  assert.match(layout, /<TrafficTracker \/>/);
  assert.match(layout, /<Suspense fallback=\{null\}>[\s\S]*<TrafficTracker/);
});

test("traffic metrics are stored as monthly aggregate counts only", async () => {
  const schema = await read("prisma/schema.prisma");
  const migration = await read(
    "prisma/migrations/20261004163000_expand_visitor_counter/migration.sql"
  );
  const footer = await read("components/SiteFooter.js");
  const stats = await read("lib/home-stats.js");

  assert.match(schema, /model VisitorCounter[\s\S]*period\s+String\s+@id/);
  assert.match(schema, /totalVisits\s+Int\s+@default\(0\)/);
  assert.match(schema, /newVisitors\s+Int\s+@default\(0\)/);
  assert.match(schema, /returningVisitors\s+Int\s+@default\(0\)/);
  assert.match(schema, /pageViews\s+Int\s+@default\(0\)/);
  assert.match(migration, /ADD COLUMN "totalVisits"/);
  assert.match(footer, /traffic\.totalVisits/);
  assert.match(footer, /traffic\.newVisitors/);
  assert.match(footer, /traffic\.returningVisitors/);
  assert.match(footer, /traffic\.pageViews/);
  assert.match(stats, /prisma\.visitorCounter/);
  assert.match(stats, /traffic:/);
});
