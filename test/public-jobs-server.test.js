const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("jobs page server-renders the initial public result set", async () => {
  const page = await read("app/jobs/page.js");
  const client = await read("app/jobs/JobsPageClient.js");

  assert.match(page, /export default async function JobsPage\(\{ searchParams \}\)/);
  assert.match(page, /normalizeJobsSearchParams\(await searchParams\)/);
  assert.match(page, /await readPublicJobs\(/);
  assert.match(page, /initialJobs=\{initialJobs\}/);
  assert.match(page, /initialPagination=\{initialPagination\}/);
  assert.match(page, /initialFilters=\{filters\}/);

  assert.match(client, /useState\(initialJobs\)/);
  assert.match(client, /useState\(initialPagination\)/);
  assert.match(client, /useState\(false\)/);
  assert.match(client, /skipInitialFetch = useRef\(true\)/);
  assert.match(client, /if \(skipInitialFetch\.current\)/);
  assert.doesNotMatch(client, /window\.location\.search/);
});

test("public jobs API and server page share one database read owner", async () => {
  const api = await read("app/api/jobs/route.js");
  const page = await read("app/jobs/page.js");
  const query = await read("lib/public-jobs.js");

  assert.match(api, /readPublicJobs\(/);
  assert.match(page, /readPublicJobs\(/);
  assert.doesNotMatch(api, /prisma\.job\.findMany/);
  assert.match(query, /prisma\.job\.findMany/);
  assert.match(query, /prisma\.job\.count/);
  assert.match(query, /Promise\.all/);
  assert.match(query, /featured: "desc"/);
  assert.match(query, /createdAt: "desc"/);
});
