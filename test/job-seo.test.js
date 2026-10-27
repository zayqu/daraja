const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const fullDescription =
  "NMB Bank Plc is looking for an E-learning Advisor to design, build and maintain digital learning content for staff across Tanzania. " +
  "Duties include running training needs analysis, producing e-learning modules, tracking completion and reporting on learning outcomes. " +
  "Applicants need a degree in education, ICT or a related field and at least three years of instructional design experience.";

const baseJob = {
  slug: "e-learning-advisor",
  title: "E-learning Advisor",
  company: "NMB Bank Plc",
  location: "Dar es Salaam",
  description: fullDescription,
  type: "CONTRACT",
  deadline: "2099-01-31T20:59:59.000Z",
  createdAt: "2026-10-10T08:00:00.000Z",
  companyLogo: "https://example.com/logo.png",
  sourceUrl: "https://www.nmbbank.co.tz/careers/123",
};

test("job search titles name the role, employer and location", async () => {
  const { buildJobSearchTitle } = await import("../lib/job-seo.js");
  assert.equal(
    buildJobSearchTitle(baseJob),
    "E-learning Advisor at NMB Bank Plc – Dar es Salaam | Daraja Jobs"
  );
  assert.equal(
    buildJobSearchTitle({ ...baseJob, location: "Tanzania" }),
    "E-learning Advisor at NMB Bank Plc – Tanzania | Daraja Jobs"
  );
});

test("JobPosting markup is built for full, open vacancies", async () => {
  const { buildJobPostingJsonLd } = await import("../lib/job-seo.js");
  const data = buildJobPostingJsonLd(baseJob, "https://ajira.daraja.co.tz/jobs/e-learning-advisor");

  assert.equal(data["@type"], "JobPosting");
  assert.equal(data.title, "E-learning Advisor");
  assert.equal(data.hiringOrganization.name, "NMB Bank Plc");
  assert.equal(data.hiringOrganization.logo, "https://example.com/logo.png");
  assert.equal(data.jobLocation.address.addressLocality, "Dar es Salaam");
  assert.equal(data.jobLocation.address.addressCountry, "TZ");
  assert.equal(data.employmentType, "CONTRACTOR");
  assert.equal(data.validThrough, "2099-01-31T20:59:59.000Z");
  assert.equal(data.datePosted, "2026-10-10T08:00:00.000Z");
});

test("JobPosting markup is skipped for thin, expired or undated vacancies", async () => {
  const { buildJobPostingJsonLd } = await import("../lib/job-seo.js");
  const url = "https://ajira.daraja.co.tz/jobs/x";

  assert.equal(
    buildJobPostingJsonLd({ ...baseJob, description: "View the official NMB Bank vacancy for E-learning Advisor." }, url),
    null
  );
  assert.equal(
    buildJobPostingJsonLd({ ...baseJob, description: `View the official advert. ${fullDescription}` }, url),
    null
  );
  assert.equal(buildJobPostingJsonLd({ ...baseJob, deadline: "2020-01-01T00:00:00.000Z" }, url), null);
  assert.equal(buildJobPostingJsonLd({ ...baseJob, createdAt: null }, url), null);
});

test("JSON-LD output cannot close its script tag", async () => {
  const { serializeJsonLd } = await import("../lib/job-seo.js");
  assert.doesNotMatch(serializeJsonLd({ description: "</script><script>alert(1)</script>" }), /</);
});

test("job pages render JobPosting markup and the sitemap lists open jobs", async () => {
  const root = path.join(__dirname, "..");
  const page = await readFile(path.join(root, "app", "jobs", "[id]", "page.js"), "utf8");
  const layout = await readFile(path.join(root, "app", "jobs", "[id]", "layout.js"), "utf8");
  const sitemap = await readFile(path.join(root, "app", "sitemap.js"), "utf8");

  assert.match(page, /application\/ld\+json/);
  assert.match(page, /buildJobPostingJsonLd/);
  assert.match(layout, /absolute: buildJobSearchTitle\(job\)/);
  assert.match(sitemap, /buildPublicJobWhere\("active"\)/);
  assert.match(sitemap, /export const revalidate/);
});

test("JobPosting includes only explicitly supported region and salary", async () => {
  const { buildJobPostingJsonLd } = await import("../lib/job-seo.js");
  const url = "https://ajira.daraja.co.tz/jobs/example";
  const clear = buildJobPostingJsonLd({ ...baseJob, salary: "TZS 1,200,000 per month" }, url);
  assert.equal(clear.jobLocation.address.addressRegion, "Dar es Salaam");
  assert.equal(clear.baseSalary.currency, "TZS");
  assert.equal(clear.baseSalary.value.value, 1200000);
  assert.equal(clear.baseSalary.value.unitText, "MONTH");
  assert.equal(clear.jobLocation.address.postalCode, undefined);
  assert.equal(clear.jobLocation.address.streetAddress, undefined);

  const unclear = buildJobPostingJsonLd({
    ...baseJob, location: "Moshi", salary: "Negotiable",
  }, url);
  assert.equal(unclear.jobLocation.address.addressRegion, undefined);
  assert.equal(unclear.baseSalary, undefined);
});
