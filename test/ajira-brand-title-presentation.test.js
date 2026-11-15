const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const formatJobTitle = require("../lib/job-title.cjs");

test("uppercase government vacancies display in sentence-friendly title case", () => {
  assert.equal(
    formatJobTitle("MWANDISHI MWENDESHA OFISI DARAJA LA II (OFFICE MANAGEMENT SECRETARY GRADE II)", "ajira"),
    "Mwandishi Mwendesha Ofisi Daraja la II (Office Management Secretary Grade II)"
  );
  assert.equal(formatJobTitle("AFISA TEHAMA DARAJA II", "ajira"), "Afisa TEHAMA Daraja II");
  assert.equal(formatJobTitle("DEREVA DARAJA II (DRIVER II)", "ajira"), "Dereva Daraja II (Driver II)");
});

test("other employers and already-edited titles are never rewritten", () => {
  assert.equal(formatJobTitle("SENIOR ICT OFFICER", "nmb-bank-careers"), "SENIOR ICT OFFICER");
  assert.equal(formatJobTitle("Afisa Rasilimali Watu Daraja II", "ajira"), "Afisa Rasilimali Watu Daraja II");
  assert.equal(formatJobTitle("ICT Officer", "ajira"), "ICT Officer");
  assert.equal(formatJobTitle(null, "ajira"), null);
});

test("Browse by category icons all use the approved Ajira navy and mint", () => {
  const iconSource = fs.readFileSync(path.join(__dirname, "../components/CategoryIcon.js"), "utf8");
  const homeSource = fs.readFileSync(path.join(__dirname, "../app/page.js"), "utf8");
  assert.match(iconSource, /bg: "#1b2a3f", fg: "#01ffd4"/);
  assert.match(iconSource, /return CATEGORY_BRAND_TONE/);
  assert.match(homeSource, /background: var\(--tone-bg\)/);
  assert.match(homeSource, /color: var\(--tone-fg\)/);
});
