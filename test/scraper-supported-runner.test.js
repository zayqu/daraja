const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

test("Ajira scraper uses an LTS runner compatible with pinned Playwright Chromium", () => {
  const workflow = readFileSync(
    path.join(__dirname, "../.github/workflows/job-source-scrapers.yml"),
    "utf8"
  );
  assert.match(workflow, /runs-on:\s*ubuntu-24\.04/);
  assert.doesNotMatch(workflow, /runs-on:\s*ubuntu-latest/);
  assert.match(workflow, /npx playwright install --with-deps chromium/);
  assert.match(workflow, /npm run scrape/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /cron:\s*"17 3-21\/3 \* \* \*"/);
});
