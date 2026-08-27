const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

test("job search URLs use the parameter consumed by the jobs page", async () => {
  const { buildJobsUrl } = await import("../lib/job-search.js");

  assert.equal(
    buildJobsUrl({ search: "  data analyst  " }),
    "/jobs?search=data+analyst"
  );
  assert.equal(buildJobsUrl({ search: "" }), "/jobs");
});

test("legacy q links remain searchable and normalize to canonical state", async () => {
  const {
    buildJobsUrl,
    normalizeJobsSearchParams,
  } = await import("../lib/job-search.js");
  const state = normalizeJobsSearchParams("q=driver&page=2");

  assert.deepEqual(state, {
    search: "driver",
    category: "",
    status: "active",
    page: 2,
  });
  assert.equal(buildJobsUrl(state), "/jobs?search=driver&page=2");
});

test("job search state rejects unsupported filters and invalid pages", async () => {
  const {
    MAX_JOB_SEARCH_LENGTH,
    normalizeJobsSearchParams,
  } = await import("../lib/job-search.js");

  assert.deepEqual(
    normalizeJobsSearchParams(
      "category=Unsupported&status=hidden&page=-5&search=%20engineer%20"
    ),
    { search: "engineer", category: "", status: "active", page: 1 }
  );
  assert.equal(
    normalizeJobsSearchParams(`search=${"x".repeat(500)}`).search.length,
    MAX_JOB_SEARCH_LENGTH
  );
});

test("the public filter uses every controlled category", async () => {
  const { JOB_CATEGORIES } = await import("../lib/job-categories.js");
  const { normalizeJobsSearchParams } = await import("../lib/job-search.js");

  for (const category of JOB_CATEGORIES) {
    const params = new URLSearchParams({ category });
    assert.equal(normalizeJobsSearchParams(params).category, category);
  }

  for (const category of [
    "Creative, Design & Media",
    "Construction & Real Estate",
    "Security & Protective Services",
  ]) {
    assert.ok(JOB_CATEGORIES.includes(category));
  }
});

test("navigation and results share canonical search helpers", async () => {
  const nav = await readFile(
    path.join(__dirname, "..", "components", "SiteNav.js"),
    "utf8"
  );
  const jobs = await readFile(
    path.join(__dirname, "..", "app", "jobs", "JobsPageClient.js"),
    "utf8"
  );

  assert.match(nav, /router\.push\(buildJobsUrl\(\{ search: query \}\)\)/);
  assert.doesNotMatch(nav, /\/jobs\?q=/);
  assert.match(jobs, /normalizeJobsSearchParams\(window\.location\.search\)/);
  assert.match(jobs, /JOB_CATEGORIES\.map/);
  assert.doesNotMatch(jobs, /const CATEGORIES =/);
});
