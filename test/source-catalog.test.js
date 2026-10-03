const test = require("node:test");
const assert = require("node:assert/strict");

const catalog = require("../scraper/config/source-catalog.json");
const { assertRunHealth, getRequestedSources } = require("../scraper/run");

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
  assert.ok(enabled.length >= 2);
  assert.equal(enabled.every((source) => Boolean(source.adapter)), true);
});

test("getRequestedSources accepts comma-separated source IDs", () => {
  assert.deepEqual(
    [...getRequestedSources(["--dry-run", "--source=ajira,reliefweb"])],
    ["ajira", "reliefweb"]
  );
});

test("partial source failures remain visible after successful results are preserved", () => {
  assert.throws(
    () =>
      assertRunHealth(
        [{ source: "ajira", found: 12, created: 2, updated: 10 }],
        [{ source: "example", error: "HTTP 503" }]
      ),
    /1 successful source result\(s\) were preserved.*HTTP 503/
  );
});

test("a fully healthy source run completes normally", () => {
  assert.doesNotThrow(() =>
    assertRunHealth(
      [{ source: "ajira", found: 12, created: 2, updated: 10 }],
      []
    )
  );
});


test("verified recruitment sources are enabled only with bounded trust config", () => {
  const ids = [
    "empower-tanzania",
    "shugulika-tanzania",
    "career-options-africa-tanzania",
    "cvpeople-tanzania",
    "qsourcing-tanzania",
    "ekazi-exact-manpower",
  ];

  for (const id of ids) {
    const source = catalog.sources.find((entry) => entry.id === id);
    assert.ok(source, id);
    assert.equal(source.enabled, true, id);
    assert.equal(source.adapter, "verified-agency", id);
    assert.equal(source.countryFilter, "Tanzania", id);
    assert.equal(source.requireDeadline, true, id);
    assert.ok(source.discovery?.allowedHosts?.length, id);
    assert.ok(Number(source.discovery?.maxJobs) > 0, id);
  }

  for (const id of ["cvpeople-tanzania", "qsourcing-tanzania"]) {
    const source = catalog.sources.find((entry) => entry.id === id);
    assert.equal(source.discovery.mode, "google", id);
    assert.ok(source.discovery.maxGoogleResults <= 30, id);
  }
});
