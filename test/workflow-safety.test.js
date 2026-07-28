const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const workflowPath = join(
  __dirname,
  "..",
  ".github",
  "workflows",
  "job-source-scrapers.yml"
);
const workflow = readFileSync(workflowPath, "utf8");

test("scheduled scraping never mutates the production database schema", () => {
  assert.doesNotMatch(workflow, /\bprisma\s+migrate\b/i);
  assert.doesNotMatch(workflow, /\bmigrate\s+(?:deploy|resolve|reset)\b/i);
});

test("scraper workflow remains hourly, bounded and least privilege", () => {
  assert.match(workflow, /cron:\s*"17 \* \* \* \*"/);
  assert.match(workflow, /timeout-minutes:\s*15/);
  assert.match(workflow, /permissions:\s*\n\s+contents:\s*read/);
  assert.match(workflow, /run:\s*npm run scrape/);
  assert.match(workflow, /SCRAPER_HEALTH_REPORT:\s*scraper-health\.json/);
  assert.match(workflow, /if:\s*always\(\)/);
  assert.match(workflow, /uses:\s*actions\/upload-artifact@v4/);
  assert.match(workflow, /retention-days:\s*30/);
});
