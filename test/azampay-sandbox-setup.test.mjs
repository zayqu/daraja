import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  SANDBOX_DATABASE_NAME, existingDataProblem, sandboxTargetProblem,
} from "../scripts/azampay-sandbox-setup.mjs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("only a database named daraja_sandbox is accepted", () => {
  assert.equal(SANDBOX_DATABASE_NAME, "daraja_sandbox");
  assert.equal(sandboxTargetProblem("postgresql://u:p@ep-x.neon.tech/daraja_sandbox?sslmode=require"), null);
  assert.equal(sandboxTargetProblem("postgres://u:p@localhost:5432/daraja_sandbox"), null);
  for (const url of [
    "", undefined, "not a url", "mysql://u:p@host/daraja_sandbox",
    "postgresql://u:p@ep-x.neon.tech/neondb?sslmode=require",
    "postgresql://u:p@ep-x.neon.tech/daraja_sandbox_copy",
    "postgresql://u:p@ep-x.neon.tech/",
  ]) {
    assert.ok(sandboxTargetProblem(url), String(url));
  }
});

test("a database that already holds real data is refused", () => {
  assert.equal(existingDataProblem({}), null);
  assert.equal(existingDataProblem({ User: 2, Job: 1 }), null);
  assert.match(existingDataProblem({ User: 4200, Job: 1 }), /4200 User rows/);
  assert.match(existingDataProblem({ Job: 26 }), /not the empty test database/);
});

test("the setup workflow is owner-triggered, read-only and never sees the live database", () => {
  const workflow = read(".github/workflows/azampay-sandbox-setup.yml");
  assert.match(workflow, /types: \[labeled\]/);
  assert.match(workflow, /github\.event\.label\.name == 'azampay-sandbox-setup'/);
  assert.match(workflow, /head\.ref == 'feature\/azampay-production-readiness'/);
  assert.match(workflow, /head\.repo\.full_name == github\.repository/);
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.match(workflow, /DATABASE_URL: \$\{\{ secrets\.SANDBOX_DATABASE_URL \}\}/);
  assert.doesNotMatch(workflow, /secrets\.DATABASE_URL/);
  // The guard runs before any migration touches the database.
  assert.ok(workflow.indexOf("setup.mjs check") < workflow.indexOf("prisma migrate deploy"));
  const script = read("scripts/azampay-sandbox-setup.mjs");
  assert.match(script, /async function seed[\s\S]*await check\(connectionString\)/);
  // Secrets are never interpolated into, or passed to, console output.
  assert.doesNotMatch(script, /console\.(log|error)\([^)]*\$\{\s*(connectionString|password|passwordHash|process\.env)/);
  assert.doesNotMatch(script, /console\.(log|error)\(\s*(connectionString|password|passwordHash)\b/);
});
