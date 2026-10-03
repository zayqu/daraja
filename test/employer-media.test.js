const test = require("node:test");
const assert = require("node:assert/strict");

const {
  candidateSitesFromJob,
  employerMatchScore,
  enrichJobsWithOfficialEmployerMedia,
  normalizeEmployerName,
  parseGoogleOfficialSiteCandidates,
} = require("../scraper/lib/employer-media");

test("normalizes employer labels consistently", () => {
  assert.equal(
    normalizeEmployerName("Tanzania Shipping Company Limited (TASHICO)"),
    "tanzania shipping company limited tashico"
  );
});

test("derives employer website candidates from official source and email domains", () => {
  assert.deepEqual(
    candidateSitesFromJob({
      sourceUrl: "https://careers.example.co.tz/jobs/42",
      applicationUrl: "mailto:jobs@example.co.tz?subject=Role",
    }),
    [
      "https://careers.example.co.tz/",
      "https://example.co.tz/",
    ]
  );
});

test("does not derive employer candidates from aggregators or ATS hosts", () => {
  assert.deepEqual(
    candidateSitesFromJob({
      sourceUrl: "https://ajiraweb.com/example-job/",
      applicationUrl:
        "https://jobs.smartrecruiters.com/Example/123-example-role",
    }),
    []
  );
});

test("extracts non-google result sites from Google search markup", () => {
  const html = [
    '<a href="/url?q=https://www.example.co.tz/&sa=U">Official site</a>',
    '<a href="https://www.linkedin.com/company/example">LinkedIn</a>',
    '<a href="https://jobs.smartrecruiters.com/Example">Jobs</a>',
  ].join("");

  assert.deepEqual(parseGoogleOfficialSiteCandidates(html), [
    "https://www.example.co.tz/",
  ]);
});

test("requires employer identity evidence before accepting a website", () => {
  const html =
    "<html><head><title>Example Bank Tanzania</title></head>" +
    '<body><img class="site-logo" src="/logo.svg" alt="Example Bank logo"></body></html>';

  assert.ok(
    employerMatchScore(
      html,
      "Example Bank Tanzania Plc",
      "https://www.examplebank.co.tz/"
    ) >= 2
  );
  assert.equal(
    employerMatchScore(
      html,
      "Different Shipping Company",
      "https://www.examplebank.co.tz/"
    ),
    0
  );
});

test("reuses previously learned employer media from existing jobs", async () => {
  const jobs = [
    {
      title: "Role A",
      company: "Example Bank Plc",
      sourceUrl: "https://jobs.smartrecruiters.com/Example/1-role",
      applicationUrl: "https://jobs.smartrecruiters.com/Example/1-role",
      companyLogo: null,
      representativeImage: null,
    },
  ];

  const prisma = {
    job: {
      findFirst: async () => ({
        companyLogo: "https://www.examplebank.co.tz/logo.svg",
        representativeImage: null,
      }),
    },
  };

  let fetchCalls = 0;
  await enrichJobsWithOfficialEmployerMedia(jobs, {
    source: "example",
    prisma,
    fetchFn: async () => {
      fetchCalls += 1;
      throw new Error("Network should not be needed");
    },
  });

  assert.equal(jobs[0].companyLogo, "https://www.examplebank.co.tz/logo.svg");
  assert.equal(fetchCalls, 0);
});

test("discovers and verifies an official employer website through Google when needed", async () => {
  const jobs = [
    {
      title: "Role A",
      company: "Example Shipping Company",
      sourceUrl: "https://jobs.smartrecruiters.com/Example/1-role",
      applicationUrl: "https://jobs.smartrecruiters.com/Example/1-role",
      companyLogo: null,
      representativeImage: null,
    },
  ];

  const calls = [];
  await enrichJobsWithOfficialEmployerMedia(jobs, {
    source: "external-source",
    searchBudget: { remaining: 1 },
    fetchFn: async (url) => {
      calls.push(url);
      if (url.startsWith("https://www.google.com/search")) {
        return {
          ok: true,
          headers: new Headers({ "content-type": "text/html" }),
          text: async () =>
            '<a href="/url?q=https://www.exampleshipping.co.tz/&sa=U">Official</a>',
        };
      }
      if (url === "https://www.exampleshipping.co.tz/") {
        return {
          ok: true,
          headers: new Headers({ "content-type": "text/html" }),
          text: async () =>
            '<html><head><title>Example Shipping Company</title></head>' +
            '<body><img class="site-logo" src="/logo.png" alt="Example Shipping Company logo"></body></html>',
        };
      }
      throw new Error("Unexpected URL: " + url);
    },
  });

  assert.equal(
    jobs[0].companyLogo,
    "https://www.exampleshipping.co.tz/logo.png"
  );
  assert.equal(calls.length, 2);
});

test("Ajira does not web-search arbitrary employer branding when portal media is absent", async () => {
  const jobs = [
    {
      title: "Government Role",
      company: "Example Public Institution",
      sourceUrl: "https://portal.ajira.go.tz/vacancies",
      applicationUrl: "https://portal.ajira.go.tz/auth",
      companyLogo: null,
      representativeImage: null,
    },
  ];

  let fetchCalls = 0;
  await enrichJobsWithOfficialEmployerMedia(jobs, {
    source: "ajira",
    searchBudget: { remaining: 1 },
    fetchFn: async () => {
      fetchCalls += 1;
      throw new Error("Ajira fallback should not trigger web search");
    },
  });

  assert.equal(jobs[0].companyLogo, null);
  assert.equal(fetchCalls, 0);
});
