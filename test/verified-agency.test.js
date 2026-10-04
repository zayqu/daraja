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


const STRICT_RECRUITER_SOURCE = {
  id: "career-options-africa-tanzania",
  name: "Career Options Africa Group - Tanzania",
  url: "https://www.careeroptionsafricagroup.com/jobs",
  recruiterName: "Career Options Africa Group",
  countryFilter: "Tanzania",
  requireDeadline: true,
  detailPageIsApplication: false,
  defaultLocation: "Tanzania",
  publishPolicy: {
    requireNamedEmployer: true,
    requireDirectEmployerApplication: true,
    hideSourceBranding: true,
    rejectEditorialTitles: true,
  },
  discovery: {
    mode: "listing",
    allowedHosts: ["careeroptionsafricagroup.com"],
    detailPathPattern: "^/jobs/detail/",
    maxJobs: 20,
    concurrency: 2,
  },
};

test("recruiter discovery is rewritten to Daraja position/company fields and direct employer apply", async () => {
  const result = await parseAgencyDetail(
    {
      sourceUrl:
        "https://www.careeroptionsafricagroup.com/jobs/detail/hub-manager-at-jaza-energy-inc-october-2026-20263",
      contextText:
        "Hub Manager at Jaza Energy Inc October 2026 Location: Tanzania, Dar es Salaam Closing Date: 14/10/2026",
    },
    STRICT_RECRUITER_SOURCE,
    {
      now: new Date("2026-10-04T05:00:00.000Z"),
      fetchFn: async () => ({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () =>
          [
            "<html><body>",
            "<h1>Hub Manager at Jaza Energy Inc October 2026</h1>",
            "<p>Location: Tanzania, Dar es Salaam</p>",
            "<p>Employment Type: Full-Time</p>",
            "<p>Closing Date: 14/10/2026</p>",
            "<h2>Job Description</h2>",
            "<p>Lead hub growth, operations and customer service across assigned locations.</p>",
            "<h2>Application Process</h2>",
            '<p>Apply on the employer career site: <a href="https://careers.jazaenergy.com/jobs/hub-manager">Apply now</a></p>',
            '<img class="site-logo" src="/career-options-logo.png" alt="Career Options Africa Group logo">',
            "</body></html>",
          ].join(""),
      }),
    }
  );

  assert.ok(result.job);
  assert.equal(result.job.title, "Hub Manager");
  assert.equal(result.job.company, "Jaza Energy Inc");
  assert.equal(result.job.location, "Dar es Salaam, Tanzania");
  assert.equal(result.job.type, "FULL_TIME");
  assert.equal(
    result.job.applicationUrl,
    "https://careers.jazaenergy.com/jobs/hub-manager"
  );
  assert.equal(result.job.companyLogo, null);
  assert.equal(result.job.representativeImage, null);
});

test("explicit Lagos location is rejected even if the page mentions Tanzania elsewhere", async () => {
  const result = await parseAgencyDetail(
    {
      sourceUrl:
        "https://www.careeroptionsafricagroup.com/jobs/detail/regional-manager-999",
      contextText:
        "Regional Manager Employment Type: Full-Time Location: Lagos, Nigeria Closing Date: 20/10/2026",
    },
    STRICT_RECRUITER_SOURCE,
    {
      now: new Date("2026-10-04T05:00:00.000Z"),
      fetchFn: async () => ({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () =>
          [
            "<html><body>",
            "<h1>Regional Manager at Example Group</h1>",
            "<p>Location: Lagos, Nigeria</p>",
            "<p>Closing Date: 20/10/2026</p>",
            "<h2>Job Description</h2>",
            "<p>Regional leadership role. Our offices also operate in Tanzania and Kenya.</p>",
            "<h2>Application Process</h2>",
            '<a href="https://careers.example.com/apply/999">Apply</a>',
            "</body></html>",
          ].join(""),
      }),
    }
  );

  assert.equal(result.job, null);
  assert.equal(result.reason, "country");
});

test("recruiter-only application flow is rejected when employer-direct application is required", async () => {
  const result = await parseAgencyDetail(
    {
      sourceUrl:
        "https://www.careeroptionsafricagroup.com/jobs/detail/finance-manager-1000",
      contextText:
        "Finance Manager at Example Manufacturing Location: Tanzania, Arusha Closing Date: 20/10/2026",
    },
    STRICT_RECRUITER_SOURCE,
    {
      now: new Date("2026-10-04T05:00:00.000Z"),
      fetchFn: async () => ({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () =>
          [
            "<html><body>",
            "<h1>Finance Manager at Example Manufacturing</h1>",
            "<p>Location: Arusha, Tanzania</p>",
            "<p>Closing Date: 20/10/2026</p>",
            "<h2>Job Description</h2>",
            "<p>Lead financial planning, reporting and business controls.</p>",
            "<h2>Application Process</h2>",
            '<a href="/apply/1000">Apply now</a>',
            "</body></html>",
          ].join(""),
      }),
    }
  );

  assert.equal(result.job, null);
  assert.equal(result.reason, "application-missing");
});

test("editorial roundup headlines are rejected instead of becoming job positions", async () => {
  const result = await parseAgencyDetail(
    {
      sourceUrl:
        "https://www.careeroptionsafricagroup.com/jobs/detail/10-new-jobs-at-nmb-bank-1001",
      contextText:
        "10 New Jobs at NMB Bank Location: Tanzania, Dar es Salaam Closing Date: 20/10/2026",
    },
    STRICT_RECRUITER_SOURCE,
    {
      now: new Date("2026-10-04T05:00:00.000Z"),
      fetchFn: async () => ({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () =>
          [
            "<html><body>",
            "<h1>10 New Jobs at NMB Bank</h1>",
            "<p>Location: Dar es Salaam, Tanzania</p>",
            "<p>Closing Date: 20/10/2026</p>",
            "<h2>Job Description</h2>",
            "<p>Roundup article containing several unrelated positions.</p>",
            "<h2>Application Process</h2>",
            '<a href="https://careers.nmbbank.co.tz/">Apply</a>',
            "</body></html>",
          ].join(""),
      }),
    }
  );

  assert.equal(result.job, null);
  assert.equal(result.reason, "editorial-title");
});

function routedFetch(pages) {
  return async (url) => {
    const html = pages[String(url)];
    if (html === undefined) return { ok: false, status: 404, headers: new Headers() };
    return {
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => html,
    };
  };
}

const JAZA_AGENCY_URL =
  "https://www.careeroptionsafricagroup.com/jobs/detail/hub-manager-at-jaza-energy-inc-october-2026-20263";
const JAZA_EMPLOYER_URL = "https://hris.peoplehum.com/ehire/jobs/ddb0ebc";
const JAZA_AGENCY_PAGE = [
  "<html><body>",
  "<h1>Hub Manager at Jaza Energy Inc October 2026</h1>",
  "<p>Location: Tanzania, Dar es Salaam</p>",
  "<p>Employment Type: Full-Time</p>",
  "<p>Closing Date: 14/10/2026</p>",
  "<h2>Job Description</h2>",
  "<p>Lead hub growth, operations and customer service across assigned locations.</p>",
  "<h2>Application Process</h2>",
  `<p>Apply on the employer career site: <a href="${JAZA_EMPLOYER_URL}">Apply now</a></p>`,
  "</body></html>",
].join("");
const JAZA_EMPLOYER_PAGE = [
  "<html><body><header>JAZA</header><h2>Job details</h2>",
  "<h3>Hub Manager (Solar Energy)-</h3><p>Mwanza, Tanzania</p>",
  "<dl><dt>Job Function</dt><dd>Execution</dd>",
  "<dt>Employment Type</dt><dd>Contract</dd>",
  "<dt>Experience level</dt><dd>3 to 6Years</dd>",
  "<dt>Location</dt><dd>Mwanza, Tanzania</dd></dl>",
  "<p>Jaza builds solar-powered hubs that charge batteries for homes across Tanzania.</p>",
  "</body></html>",
].join("");
const JAZA_DISCOVERY = {
  sourceUrl: JAZA_AGENCY_URL,
  contextText: "Hub Manager at Jaza Energy Inc October 2026 Closing Date: 14/10/2026",
};
const JAZA_NOW = new Date("2026-10-04T05:00:00.000Z");

test("employer page facts outrank the recruiter's copy", async () => {
  const result = await parseAgencyDetail(JAZA_DISCOVERY, STRICT_RECRUITER_SOURCE, {
    now: JAZA_NOW,
    fetchFn: routedFetch({
      [JAZA_AGENCY_URL]: JAZA_AGENCY_PAGE,
      [JAZA_EMPLOYER_URL]: JAZA_EMPLOYER_PAGE,
    }),
  });

  assert.equal(result.job.location, "Mwanza, Tanzania");
  assert.equal(result.job.type, "CONTRACT");
  assert.equal(result.job.experienceMinYears, 3);
  assert.equal(result.job.experienceMaxYears, 6);
  assert.equal(result.job.applicationUrl, JAZA_EMPLOYER_URL);
  assert.equal(result.job.reviewReasons, undefined);
});

test("an employer link that shows nothing holds the vacancy for review", async () => {
  const rendered = [];
  const result = await parseAgencyDetail(JAZA_DISCOVERY, STRICT_RECRUITER_SOURCE, {
    now: JAZA_NOW,
    fetchFn: routedFetch({
      [JAZA_AGENCY_URL]: JAZA_AGENCY_PAGE,
      [JAZA_EMPLOYER_URL]: "<html><body><div>English</div></body></html>",
    }),
    render: async (url) => {
      rendered.push(url);
      return "English";
    },
  });

  assert.deepEqual(rendered, [JAZA_EMPLOYER_URL]);
  assert.ok(result.job);
  assert.deepEqual(result.job.reviewReasons, [
    "the employer application link did not show this vacancy",
  ]);
});

test("a JavaScript-only employer page is read through the renderer", async () => {
  const result = await parseAgencyDetail(JAZA_DISCOVERY, STRICT_RECRUITER_SOURCE, {
    now: JAZA_NOW,
    fetchFn: routedFetch({
      [JAZA_AGENCY_URL]: JAZA_AGENCY_PAGE,
      [JAZA_EMPLOYER_URL]: "<html><body><app-root></app-root></body></html>",
    }),
    render: async () =>
      "Job details\nHub Manager (Solar Energy)-\nMwanza, Tanzania\nEmployment Type\nContract\nExperience level\n3 to 6Years\nLocation\nMwanza, Tanzania\nJaza builds solar-powered hubs that charge batteries for homes.",
  });

  assert.equal(result.job.location, "Mwanza, Tanzania");
  assert.equal(result.job.type, "CONTRACT");
  assert.equal(result.job.reviewReasons, undefined);
});

test("a vacancy closed on the employer page is not imported", async () => {
  const result = await parseAgencyDetail(JAZA_DISCOVERY, STRICT_RECRUITER_SOURCE, {
    now: JAZA_NOW,
    fetchFn: routedFetch({
      [JAZA_AGENCY_URL]: JAZA_AGENCY_PAGE,
      [JAZA_EMPLOYER_URL]: JAZA_EMPLOYER_PAGE.replace(
        "<dl>",
        "<p>This position is no longer accepting applications.</p><dl>"
      ),
    }),
  });

  assert.equal(result.job, null);
  assert.equal(result.reason, "closed");
});
