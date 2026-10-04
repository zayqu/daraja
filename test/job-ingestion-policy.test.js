const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const { isGenericJobTitle } = require("../scraper/lib/store");

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
