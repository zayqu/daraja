const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("job detail API preserves original source URL and returns application media fields", async () => {
  const route = await read("app/api/jobs/[id]/route.js");
  const loader = await read("lib/public-job.js");

  assert.match(route, /findPublicJob\(id\)/);
  assert.match(route, /serializePublicJob\(job\)/);
  assert.match(loader, /sourceUrl:\s*true/);
  assert.match(loader, /applicationUrl:\s*true/);
  assert.match(loader, /companyLogo:\s*true/);
  assert.match(loader, /representativeImage:\s*true/);
  assert.doesNotMatch(loader, /sourceUrl\s*=\s*job\.sourceUrl/);
  assert.doesNotMatch(loader, /sourceUrl,[\s\S]*\/apply/);
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

test("apply route re-resolves trusted stored destinations from the live source", async () => {
  const route = await read("app/api/jobs/[id]/apply/route.js");

  assert.match(route, /isAllowedResolverUrl\(job\.source, job\.applicationUrl\)/);
  assert.match(route, /fetchAllowedApplicationPage/);
  assert.match(route, /extractFinalApplicationUrl/);
  assert.match(route, /finalTarget && finalTarget !== resolvedUrl/);
  assert.doesNotMatch(route, /AJIRA_LOGIN_URL/);
  assert.doesNotMatch(route, /portal\.ajira\.go\.tz\/auth/);
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
