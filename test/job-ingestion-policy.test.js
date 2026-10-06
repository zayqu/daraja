const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const {
  findExistingJob,
  isGenericJobTitle,
} = require("../scraper/lib/store");

test("editorial roundup titles are not treated as positions", () => {
  assert.equal(isGenericJobTitle("10 New Jobs at NMB Bank"), true);
  assert.equal(isGenericJobTitle("New Jobs at Example Company"), true);
  assert.equal(isGenericJobTitle("Multiple Job Positions at Example Group"), true);
  assert.equal(isGenericJobTitle("Relationship Manager"), false);
  assert.equal(isGenericJobTitle("Accountants & Assistant Accountants (10 Posts)"), false);
});

test("job detail uses Daraja's professional metadata format without recruiter promotion", async () => {
  const detail = await readFile(
    path.join(__dirname, "..", "app", "jobs", "[id]", "JobDetailPageClient.js"),
    "utf8"
  );

  assert.match(detail, /<dt>Position<\/dt>/);
  assert.match(detail, /<dt>Company \/ Institution<\/dt>/);
  assert.match(detail, /<dt>Location<\/dt>/);
  assert.match(detail, /<dt>Category<\/dt>/);
  assert.match(detail, /<dt>Job type<\/dt>/);
  assert.match(detail, /<dt>Deadline<\/dt>/);
  assert.doesNotMatch(detail, /<dt>Source<\/dt>/);
  assert.doesNotMatch(detail, /formatSource\(/);
});

test("homepage is always rendered from the current release and mobile bridge labels stay visible", async () => {
  const home = await readFile(
    path.join(__dirname, "..", "app", "page.js"),
    "utf8"
  );
  const bridge = await readFile(
    path.join(__dirname, "..", "components", "HomeHeroBridge.module.css"),
    "utf8"
  );

  assert.match(home, /export const dynamic = "force-dynamic"/);
  assert.match(home, /export const revalidate = 0/);
  assert.match(bridge, /aspect-ratio: 360 \/ 280/);
  assert.match(bridge, /\.labelStart[\s\S]*left: 8px/);
  assert.match(bridge, /\.labelEnd[\s\S]*right: 8px/);
});


test("source identity wins before legacy cross-source matching", async () => {
  const calls = [];
  const prisma = {
    job: {
      findFirst: async ({ where }) => {
        calls.push(where);
        if (
          where.source === "standardbank-tanzania" &&
          where.sourceId === "vacancy-42"
        ) {
          return { id: "exact-standardbank-row" };
        }
        return { id: "legacy-ajiraweb-row" };
      },
    },
  };

  const found = await findExistingJob(
    prisma,
    {
      sourceId: "vacancy-42",
      title: "Relationship Manager",
      company: "Stanbic Bank Tanzania",
      deadline: new Date("2026-10-31T23:59:59.000Z"),
    },
    "standardbank-tanzania"
  );

  assert.deepEqual(found, { id: "exact-standardbank-row" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].source, "standardbank-tanzania");
  assert.equal(calls[0].sourceId, "vacancy-42");
});

test("site metadata uses the centralized site origin", async () => {
  const layout = await readFile(
    path.join(__dirname, "..", "app", "layout.js"),
    "utf8"
  );
  const config = await readFile(
    path.join(__dirname, "..", "lib", "site-config.js"),
    "utf8"
  );

  assert.match(layout, /metadataBase: new URL\(SITE_ORIGIN\)/);
  assert.match(layout, /from "@\/lib\/site-config"/);
  assert.match(config, /NEXT_PUBLIC_SITE_ORIGIN/);
});
