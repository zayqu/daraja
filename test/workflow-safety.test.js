const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const scraperWorkflowPath = join(
  __dirname,
  "..",
  ".github",
  "workflows",
  "job-source-scrapers.yml"
);
const scraperWorkflow = readFileSync(scraperWorkflowPath, "utf8");

const releaseWorkflowPath = join(
  __dirname,
  "..",
  ".github",
  "workflows",
  "cpanel-staging-build.yml"
);
const releaseWorkflow = readFileSync(releaseWorkflowPath, "utf8");

const deployScriptPath = join(
  __dirname,
  "..",
  "ops",
  "cpanel",
  "deploy.sh"
);
const deployScript = readFileSync(deployScriptPath, "utf8");

test("scheduled scraping never mutates the production database schema", () => {
  assert.doesNotMatch(scraperWorkflow, /\bprisma\s+migrate\b/i);
  assert.doesNotMatch(scraperWorkflow, /\bmigrate\s+(?:deploy|resolve|reset)\b/i);
});

test("scraper workflow remains hourly, bounded and least privilege", () => {
  assert.match(scraperWorkflow, /cron:\s*"17 \* \* \* \*"/);
  assert.match(scraperWorkflow, /timeout-minutes:\s*15/);
  assert.match(scraperWorkflow, /permissions:\s*\n\s+contents:\s*read/);
  assert.match(scraperWorkflow, /run:\s*npm run scrape/);
  assert.match(scraperWorkflow, /SCRAPER_HEALTH_REPORT:\s*scraper-health\.json/);
  assert.match(scraperWorkflow, /if:\s*always\(\)/);
  assert.match(scraperWorkflow, /uses:\s*actions\/upload-artifact@v4/);
  assert.match(scraperWorkflow, /retention-days:\s*30/);
});

test("cPanel releases fail before build when production dependencies have high severity vulnerabilities", () => {
  assert.match(releaseWorkflow, /name:\s*Audit production dependencies/);
  assert.match(
    releaseWorkflow,
    /npm audit --omit=dev --audit-level=high/
  );
  assert.ok(
    releaseWorkflow.indexOf("Audit production dependencies") <
      releaseWorkflow.indexOf("Build production bundle")
  );
});


test("cPanel stale-worker recovery scopes next-server processes to the Daraja runtime", () => {
  assert.match(deployScript, /\[n\]ext-server/);
  assert.match(deployScript, /runtime_prefix/);
  assert.match(deployScript, /worker_cwd/);
  assert.match(deployScript, /terminate_app_scoped_node_workers/);
  assert.match(deployScript, /previous_runtime_worker_pids/);
  assert.match(deployScript, /terminate_previous_runtime_workers/);
  assert.match(deployScript, /runtime\.previous/);
  assert.ok(
    deployScript.indexOf("terminate_previous_runtime_workers") <
      deployScript.lastIndexOf("HEALTHCHECK_FAILED=0")
  );
  assert.doesNotMatch(deployScript, /pkill[^\n]+\[n\]ext-server/);
});
