const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isOfficialDetailUrl, parseOfficialAjiraDetail, enrichOfficialAjiraJobs,
} = require("../scraper/lib/ajira-official-detail");
const { collectAjiraJobs } = require("../scraper/sources/ajira");

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
