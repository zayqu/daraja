const test = require("node:test");
const assert = require("node:assert/strict");

const catalog = require("../scraper/config/source-catalog.json");
const { getRequestedSources } = require("../scraper/run");

test("source catalogue has unique IDs and excludes Daraja itself", () => {
  const ids = catalog.sources.map((source) => source.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(
    catalog.sources.some((source) =>
      new URL(source.url).hostname.endsWith("ajira.daraja.co.tz")
    ),
    false
  );
});

test("every enabled source has a named adapter", () => {
  const enabled = catalog.sources.filter((source) => source.enabled);
  assert.ok(enabled.length >= 1);
  assert.equal(enabled.every((source) => Boolean(source.adapter)), true);
});

test("getRequestedSources accepts comma-separated source IDs", () => {
  assert.deepEqual(
    [...getRequestedSources(["--dry-run", "--source=ajira,reliefweb"])],
    ["ajira", "reliefweb"]
  );
});
