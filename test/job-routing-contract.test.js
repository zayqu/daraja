const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("job detail API preserves original source URL and returns application media fields", async () => {
  const route = await read("app/api/jobs/[id]/route.js");

  assert.match(route, /sourceUrl:\s*true/);
  assert.match(route, /applicationUrl:\s*true/);
  assert.match(route, /companyLogo:\s*true/);
  assert.match(route, /representativeImage:\s*true/);
  assert.doesNotMatch(route, /sourceUrl\s*=\s*job\.sourceUrl/);
  assert.doesNotMatch(route, /sourceUrl,[\s\S]*\/apply/);
});

test("apply route prefers stored applicationUrl before legacy source-page resolution", async () => {
  const route = await read("app/api/jobs/[id]/apply/route.js");

  const storedTarget = route.indexOf("if (job.applicationUrl)");
  const legacyTarget = route.indexOf("Compatibility path for records created before applicationUrl existed");

  assert.ok(storedTarget >= 0);
  assert.ok(legacyTarget > storedTarget);
  assert.match(route, /Location:\s*job\.applicationUrl/);
  assert.match(route, /return redirectTo\(job\.applicationUrl\)/);
});

test("job scraper schema keeps source page and application destination separate", async () => {
  const schema = await read("prisma/schema.prisma");
  const jobs = await read("scraper/lib/jobs.js");

  assert.match(schema, /sourceUrl\s+String\?/);
  assert.match(schema, /applicationUrl\s+String\?/);
  assert.match(schema, /companyLogo\s+String\?/);
  assert.match(schema, /representativeImage\s+String\?/);

  assert.match(jobs, /rawJob\.sourceJobUrl \|\| rawJob\.sourceUrl/);
  assert.match(jobs, /rawJob\.applicationUrl/);
});
