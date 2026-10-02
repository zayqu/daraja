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

test("public job reads use a short shared cache without changing lifecycle ownership", async () => {
  const query = await read("lib/public-jobs.js");
  const moderation = await read("app/api/admin/jobs/[id]/moderate/route.js");

  assert.match(query, /unstable_cache/);
  assert.match(query, /PUBLIC_JOBS_CACHE_SECONDS = 30/);
  assert.match(query, /revalidate: PUBLIC_JOBS_CACHE_SECONDS/);
  assert.match(query, /tags: \[PUBLIC_JOBS_CACHE_TAG\]/);
  assert.match(query, /buildPublicJobWhere/);
  assert.match(moderation, /revalidateTag\(PUBLIC_JOBS_CACHE_TAG, "seconds"\)/);
});


test("mobile jobs discovery keeps filters out of the primary page flow", async () => {
  const client = await read("app/jobs/JobsPageClient.js");

  assert.match(client, /filtersOpen/);
  assert.match(client, /className="mobile-filter-btn"/);
  assert.match(client, /className="filters-backdrop"/);
  assert.match(client, /filters-open/);
  assert.match(client, /Show \{pagination\.total \|\| 0\} opportunities/);
  assert.match(client, /position: fixed;/);
  assert.match(client, /top:\s*50%/);
  assert.match(client, /left:\s*50%/);
  assert.match(client, /translate\(-50%, -50%\)/);
  assert.match(client, /document\.body/);
  assert.match(client, /body\.style\.overflow = "hidden"/);
  assert.match(client, /JobBrandMedia/);
});
