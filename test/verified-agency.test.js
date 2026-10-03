const test = require("node:test");
const assert = require("node:assert/strict");

const {
  collectVerifiedAgencyJobs,
  discoverGoogleLinks,
  discoverListingLinks,
  extractDeadlineText,
  pageIsClosed,
  parseAgencyDetail,
  relativeDeadline,
} = require("../scraper/sources/verified-agency");

const LISTING_SOURCE = {
  id: "example-agency",
  name: "Example Agency Tanzania",
  url: "https://jobs.example.co.tz/jobs",
  recruiterName: "Example Agency Tanzania",
  countryFilter: "Tanzania",
  requireDeadline: true,
  detailPageIsApplication: true,
  defaultLocation: "Tanzania",
  discovery: {
    mode: "listing",
    allowedHosts: ["jobs.example.co.tz"],
    detailPathPattern: "^/jobs/\\d+$",
    maxJobs: 20,
    concurrency: 2,
  },
};

test("listing discovery keeps only configured official vacancy links", () => {
  const jobs = discoverListingLinks(
    [
      '<a href="/jobs/42">Finance Manager</a>',
      '<a href="/about">About</a>',
      '<a href="https://evil.example/jobs/99">Copied vacancy</a>',
    ].join(""),
    LISTING_SOURCE.url,
    LISTING_SOURCE
  );

  assert.deepEqual(jobs.map((job) => job.sourceUrl), [
    "https://jobs.example.co.tz/jobs/42",
  ]);
});

test("Google discovery accepts only configured official job hosts", () => {
  const source = {
    ...LISTING_SOURCE,
    url: "https://example.zohorecruit.com/jobs/Careers",
    discovery: {
      mode: "google",
      allowedHosts: ["example.zohorecruit.com"],
      detailPathPattern: "^/jobs/Careers/\\d+/",
    },
  };

  const jobs = discoverGoogleLinks(
    [
      '<a href="/url?q=https://example.zohorecruit.com/jobs/Careers/123/Role&sa=U">Role</a>',
      '<a href="/url?q=https://linkedin.com/jobs/view/123&sa=U">Copy</a>',
    ].join(""),
    source
  );

  assert.equal(jobs.length, 1);
  assert.equal(
    jobs[0].sourceUrl,
    "https://example.zohorecruit.com/jobs/Careers/123/Role"
  );
});

test("deadline helpers parse absolute and relative closing signals", () => {
  assert.equal(
    extractDeadlineText("Application Deadline: 31 October 2026"),
    "31 October 2026"
  );

  const value = relativeDeadline(
    "Expiring in 8 Days",
    new Date("2026-10-01T08:00:00.000Z")
  );
  assert.equal(value.toISOString(), "2026-10-09T23:59:59.000Z");
});

test("closed vacancy pages are rejected even when Google still indexes them", () => {
  assert.equal(pageIsClosed("No longer accepting applications"), true);
  assert.equal(pageIsClosed("This job posting is no longer available."), true);
  assert.equal(pageIsClosed("Applications are open until Friday."), false);
});

test("structured official detail becomes an active Tanzania job", async () => {
  const html = [
    "<html><body>",
    '<script type="application/ld+json">',
    "{",
    '"@type":"JobPosting",',
    '"identifier":{"value":"job-42"},',
    '"title":"Finance Manager",',
    '"description":"<p>Lead financial planning, controls and reporting.</p>",',
    '"employmentType":"FULL_TIME",',
    '"validThrough":"2099-12-31",',
    '"hiringOrganization":{"name":"Example Manufacturing Ltd","logo":"https://jobs.example.co.tz/logo.png"},',
    '"jobLocation":{"address":{"addressLocality":"Dar es Salaam","addressCountry":"Tanzania"}}',
    "}",
    "</script>",
    '<a href="/apply/42">Apply now</a>',
    "</body></html>",
  ].join("");

  const result = await parseAgencyDetail(
    {
      sourceUrl: "https://jobs.example.co.tz/jobs/42",
      contextText: "Finance Manager Dar es Salaam Tanzania",
    },
    LISTING_SOURCE,
    {
      now: new Date("2026-10-03T10:00:00.000Z"),
      fetchFn: async () => ({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => html,
      }),
    }
  );

  assert.ok(result.job);
  assert.equal(result.job.title, "Finance Manager");
  assert.equal(result.job.company, "Example Manufacturing Ltd");
  assert.equal(result.job.location, "Dar es Salaam, Tanzania");
  assert.equal(
    result.job.applicationUrl,
    "https://jobs.example.co.tz/apply/42"
  );
  assert.equal(
    result.job.companyLogo,
    "https://jobs.example.co.tz/logo.png"
  );
});

test("past deadlines are rejected instead of surfacing stale Google jobs", async () => {
  const result = await parseAgencyDetail(
    {
      sourceUrl: "https://jobs.example.co.tz/jobs/42",
      contextText: "Finance Manager Tanzania",
    },
    LISTING_SOURCE,
    {
      now: new Date("2026-10-03T10:00:00.000Z"),
      fetchFn: async () => ({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => [
          "<html><body>",
          "<h1>Finance Manager</h1>",
          "<p>Location: Dar es Salaam, Tanzania</p>",
          "<p>Deadline: 30 September 2026</p>",
          "<h2>Job Description</h2>",
          "<p>Lead finance operations and reporting.</p>",
          "</body></html>",
        ].join(""),
      }),
    }
  );

  assert.equal(result.job, null);
  assert.equal(result.reason, "expired");
});

test("agency collection preserves existing records when discovery yields nothing", async () => {
  const jobs = await collectVerifiedAgencyJobs(LISTING_SOURCE, {
    fetchFn: async () => ({
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => "<html><body><a href='/about'>About</a></body></html>",
    }),
  });

  assert.deepEqual(jobs, []);
  assert.equal(jobs.health.preserveExisting, true);
});


test("eKazi-style official detail keeps current deadline and login application flow", async () => {
  const source = {
    id: "ekazi-exact-manpower",
    name: "eKazi / Exact Manpower Consulting Ltd",
    url: "https://api.ekazi.co.tz/find-job",
    recruiterName: "Exact Manpower Consulting Ltd",
    countryFilter: "Tanzania",
    requireDeadline: true,
    detailPageIsApplication: true,
    defaultLocation: "Tanzania",
    discovery: {
      allowedHosts: ["api.ekazi.co.tz"],
      detailPathPattern: "^/job/show/",
    },
  };

  const result = await parseAgencyDetail(
    {
      sourceUrl:
        "https://api.ekazi.co.tz/job/show/recruitment-officer-intern-job-in-tanzania-/MTQwMDg%3D",
      contextText:
        "Recruitment Officer Intern Deadline Wed, 21 Oct 2026 Tanzania",
    },
    source,
    {
      now: new Date("2026-10-03T10:00:00.000Z"),
      fetchFn: async () => ({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () =>
          [
            "<html><body>",
            "<h1>Recruitment Officer Intern</h1>",
            "<p>Job Type Internship</p>",
            "<p>Deadline: 21 October 2026</p>",
            "<h2>Job Description</h2>",
            "<p>Support recruitment, candidate screening and interview coordination.</p>",
            "<p>Location: Dar es Salaam, Tanzania</p>",
            "<p>Company: Exact Manpower Consulting Ltd</p>",
            '<a href="/login">Please login or register to apply this position</a>',
            "</body></html>",
          ].join(""),
      }),
    }
  );

  assert.ok(result.job);
  assert.equal(result.job.company, "Exact Manpower Consulting Ltd");
  assert.equal(result.job.type, "INTERNSHIP");
  assert.equal(
    result.job.applicationUrl,
    "https://api.ekazi.co.tz/login"
  );
  assert.equal(
    result.job.deadline.toISOString(),
    "2026-10-21T23:59:59.000Z"
  );
});
