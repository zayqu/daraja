// Read-only PSRS verification smoke test, intended for a dedicated CI runner.
// No Prisma connection, data writes, notification deliveries or deployments.
const { chromium } = require("playwright");
const { extractRenderedRows, mapRenderedVacancy } = require("../scraper/sources/ajira");
const { enrichOfficialAjiraJobs } = require("../scraper/lib/ajira-official-detail");
const { createPageRenderer } = require("../scraper/lib/source-page");

const URL = "https://portal.ajira.go.tz/vacancies";
const sampleLimit = Math.min(Math.max(Number(process.env.PSRS_AUDIT_SAMPLE || 6), 1), 12);

async function audit() {
  const browser = await chromium.launch({ headless: true });
  const warnings = [];
  let rows = [];
  try {
    const page = await browser.newPage();
    try {
      await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.locator("table tbody tr").first().waitFor({ timeout: 30_000 });
      rows = await extractRenderedRows(page);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const distinct = [...new Map(rows.map((r) =>
    [r.title + "|" + r.company, r]
  )).values()];
  const mapped = distinct.map(mapRenderedVacancy).filter(Boolean);
  const withDetail = mapped.filter((job) => job.sourceUrl.includes("/view-advert/"));
  const sample = withDetail.slice(0, sampleLimit);
  const renderer = createPageRenderer({
    budget: sampleLimit,
    timeoutMs: 35_000,
  });
  let result;
  try {
    result = await enrichOfficialAjiraJobs(sample, {
      render: renderer.render,
      concurrency: 2,
    });
  } finally {
    await renderer.close();
  }
  if (!mapped.length) warnings.push("No mapped vacancies found on source page");
  if (!withDetail.length) warnings.push("No vacancy-specific URLs were discoverable from the rendered table");
  if (sample.length && result.verified === 0) warnings.push("None of the sampled original notices passed full verification");
  const summary = {
    source: URL,
    discoveredRows: rows.length,
    mappedVacancies: mapped.length,
    vacancyDetailLinks: withDetail.length,
    indexOnlyLinks: mapped.length - withDetail.length,
    sampled: sample.length,
    verified: result.verified,
    unverified: result.unverified,
    sample: result.jobs.map((job) => ({
      title: job.title,
      institution: job.company,
      deadline: job.deadline?.toISOString?.() || null,
      originalUrl: job.sourceUrl,
      verified: job.originalEvidence?.verified === true,
      descriptionLength: job.description?.length || 0,
    })),
    warnings,
  };
  console.log("PSRS_READ_ONLY_AUDIT " + JSON.stringify(summary));
  // Failed discovery is not proof of no vacancies; make it visible to CI.
  if (warnings.length) process.exitCode = 1;
}

audit().catch((error) => {
  console.error("PSRS_READ_ONLY_AUDIT_FAILED", error.message);
  process.exitCode = 1;
});
