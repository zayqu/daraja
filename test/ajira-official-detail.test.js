const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isOfficialDetailUrl, parseOfficialAjiraDetail, enrichOfficialAjiraJobs,
} = require("../scraper/lib/ajira-official-detail");
const { collectAjiraJobs } = require("../scraper/sources/ajira");
const { createHealthReport, renderHealthSummary } = require("../scraper/lib/health");

const original = "https://portal.ajira.go.tz/view-advert/abc%3D%3D";
const row = {
  title: "OFFICER II – RECORDS MANAGEMENT",
  company: "Example District Council",
  deadline: "30/11/2026",
  sourceUrl: original,
  location: "Tanzania",
  description: "Visit the official Ajira Portal for the full vacancy notice.",
};
const html = [
  "<html><head><title>View Vacancy Details | Ajira Portal</title></head>",
  "<body><header><nav>Home Vacancies</nav></header><main>",
  "<h3>Post Details</h3><h2>OFFICER II – RECORDS MANAGEMENT</h2>",
  "<div>Company</div><div>Example District Council</div>",
  "<div>Positions</div><div>2 Positions</div>",
  "<h3>Application Period</h3><p>10/11/2026 - 30/11/2026</p>",
  "<h3>Duties and Responsibilities</h3>",
  "<p>i. Maintain records across council departments using approved records management procedures.</p>",
  "<p>ii. Prepare record summaries and ensure complete documentation and filing.</p>",
  "<h3>Qualifications</h3>",
  "<p>Holder of a diploma in records management from a recognized institution.</p>",
  "<h3>Remuneration</h3><p>TGS D</p>",
  "</main></body></html>",
].join("");

test("only vacancy-level PSRS HTTPS links qualify as original notices", () => {
  assert.equal(isOfficialDetailUrl(original), true);
  assert.equal(isOfficialDetailUrl("https://portal.ajira.go.tz/vacancies"), false);
  assert.equal(isOfficialDetailUrl("https://fake-portal.ajira.go.tz/view-advert/123"), false);
  assert.equal(isOfficialDetailUrl("http://portal.ajira.go.tz/view-advert/123"), false);
  assert.equal(isOfficialDetailUrl("https://portal.ajira.go.tz.evil.test/view-advert/123"), false);
});

test("official vacancy parser extracts duties and qualifications with confirmed deadline", () => {
  const detail = parseOfficialAjiraDetail(html, row);
  assert.ok(detail);
  assert.equal(detail.title, row.title);
  assert.equal(detail.company, row.company);
  assert.equal(detail.deadline.toISOString(), "2026-11-30T23:59:59.000Z");
  assert.match(detail.description, /Principal Responsibilities/);
  assert.match(detail.description, /Maintain records across council departments/);
  assert.match(detail.description, /diploma in records management/);
  assert.equal(detail.originalEvidence.verified, true);
  assert.equal(detail.originalEvidence.deadlineVerified, true);
  assert.equal(detail.applicationUrl, original);
});

test("contradictory title, company or deadline cannot be verified", () => {
  assert.equal(parseOfficialAjiraDetail(html, { ...row, title: "Accountant" }), null);
  assert.equal(parseOfficialAjiraDetail(html, { ...row, company: "Other Council" }), null);
  assert.equal(parseOfficialAjiraDetail(html, { ...row, deadline: "29/11/2026" }), null);
  assert.equal(parseOfficialAjiraDetail(html.replace("Holder of a diploma in records management from a recognized institution.", "N/A"), row), null);
});

test("a broken original notice preserves an unverified lead", async () => {
  const result = await enrichOfficialAjiraJobs([row], {
    fetchFn: async () => ({ ok: false, status: 404 }),
  });
  assert.equal(result.verified, 0);
  assert.equal(result.unverified, 1);
  assert.equal(result.jobs[0].originalEvidence, undefined);
});

test("the government adapter enriches a listing only after verifying official detail", async () => {
  const result = await collectAjiraJobs({
    rows: [row],
    verifyOfficial: true,
    fetchFn: async (url) => {
      assert.equal(url, original);
      return {
        ok: true,
        url,
        text: async () => html,
      };
    },
  });
  assert.equal(result.length, 1);
  assert.equal(result.health.verified, 1);
  assert.equal(result.health.unverified, 0);
  assert.equal(result[0].originalEvidence.verified, true);
  assert.match(result[0].description, /records management/);
});

test("client-rendered official vacancy data can be verified without trusting an HTML shell", async () => {
  let rendered = 0;
  const result = await enrichOfficialAjiraJobs([row], {
    fetchFn: async () => { throw new Error("plain HTTP must not run when browser renderer is supplied"); },
    render: async (url) => {
      assert.equal(url, original);
      rendered += 1;
      return { html, url: original };
    },
  });
  assert.equal(rendered, 1);
  assert.equal(result.verified, 1);
  assert.equal(result.jobs[0].originalEvidence.verified, true);
});
test("a renderer that redirects away from the official vacancy is rejected", async () => {
  const result = await enrichOfficialAjiraJobs([row], {
    render: async () => ({ html, url: "https://other.example.test/view-advert/123" }),
  });
  assert.equal(result.verified, 0);
});
test("a browser-rendered listing without full detail remains unverified", async () => {
  const result = await enrichOfficialAjiraJobs([row], {
    render: async () => ({
      html: "<html><body><h2>OFFICER II – RECORDS MANAGEMENT</h2><p>Application period is shown in the browser later.</p></body></html>",
      url: original,
    }),
  });
  assert.equal(result.verified, 0);
});


test("Kiswahili government notices use the same verified facts and deadline policy", () => {
  const swahili = html
    .replace("Application Period", "Kipindi cha Maombi")
    .replace("Duties and Responsibilities", "Majukumu na Wajibu")
    .replace("Qualifications", "Sifa za Mwombaji")
    .replace("Remuneration", "Mshahara");
  const detail = parseOfficialAjiraDetail(swahili, row);
  assert.ok(detail);
  assert.equal(detail.deadline.toISOString(), "2026-11-30T23:59:59.000Z");
  assert.match(detail.description, /Maintain records across council departments/);
  assert.match(detail.description, /diploma in records management/);
});

test("missing public detail links are counted without attempting a render", async () => {
  let renders = 0;
  const result = await collectAjiraJobs({
    rows: [{ ...row, sourceUrl: "https://portal.ajira.go.tz/vacancies" }],
    verifyOfficial: true,
    render: async () => { renders += 1; return { html }; },
  });
  assert.equal(renders, 0);
  assert.equal(result.health.verified, 0);
  assert.equal(result[0].originalEvidence.verified, false);
  assert.deepEqual(result.health.verificationFailures, {
    missingDetailUrl: 1, detailUnavailable: 0, unsafeRedirect: 0,
    incompleteOrConflictingFacts: 0,
  });
  const report = createHealthReport({
    startedAt: new Date(), summaries: [{ source: "ajira", ...result.health }],
    warnings: [{ source: "ajira", warning: "1 missing detail link" }],
  });
  assert.equal(report.status, "degraded");
  assert.match(renderHealthSummary(report), /Original-notice verification blockers/);
  assert.match(renderHealthSummary(report), /\| ajira \| 1 \| 0 \| 0 \| 0 \|/);
});

test("every unverified notice has exactly one blocker across concurrent reads", async () => {
  const jobs = [
    { ...row, sourceUrl: "https://portal.ajira.go.tz/vacancies" },
    ...["unavailable", "redirect", "incomplete", "throws", "verified"].map(
      (id) => ({ ...row, sourceUrl: `https://portal.ajira.go.tz/view-advert/${id}` })
    ),
  ];
  const result = await enrichOfficialAjiraJobs(jobs, {
    render: async (url) => {
      if (url.endsWith("/unavailable")) return null;
      if (url.endsWith("/redirect")) return { html, url: "https://other.test/" };
      if (url.endsWith("/incomplete")) return { html: "<body>Loading</body>", url };
      if (url.endsWith("/throws")) throw new Error("private network diagnostic");
      return { html, url };
    },
  });
  assert.equal(result.verified, 1);
  assert.equal(result.unverified, 5);
  assert.deepEqual(result.verificationFailures, {
    missingDetailUrl: 1, detailUnavailable: 2, unsafeRedirect: 1,
    incompleteOrConflictingFacts: 1,
  });
  assert.equal(Object.values(result.verificationFailures).reduce((sum, n) => sum + n, 0), result.unverified);
  assert.doesNotMatch(JSON.stringify(result), /private network diagnostic/);
  assert.equal(jobs[5].originalEvidence, undefined);
});

test("HTTP failures, redirects and conflicting facts have distinct blockers", async () => {
  for (const [response, reason] of [
    [{ ok: false, status: 503 }, "detailUnavailable"],
    [{ ok: true, url: "https://other.test/" }, "unsafeRedirect"],
    [{ ok: true, url: original, text: async () => html.replace("30/11/2026", "29/11/2026") }, "incompleteOrConflictingFacts"],
  ]) {
    const result = await enrichOfficialAjiraJobs([row], { fetchFn: async () => response });
    assert.equal(result.verified, 0);
    assert.equal(result.verificationFailures[reason], 1);
    assert.equal(Object.values(result.verificationFailures).reduce((sum, n) => sum + n, 0), 1);
  }
});
