const { chromium } = require("playwright");
require("dotenv").config();

const {
  AJIRA_SOURCE,
  AJIRA_VACANCIES_URL,
  deduplicateJobs,
} = require("../lib/jobs");
const { createPrismaClient, saveJobs } = require("../lib/store");

const MAX_PAGES = 100;

async function extractPageJobs(page) {
  return page.locator("table tbody tr").evaluateAll((rows, baseUrl) =>
    rows.flatMap((row) => {
      const cells = [...row.querySelectorAll("td")];
      if (cells.length < 4) return [];

      const titleCell = cells[1];
      const link = titleCell.querySelector("a[href]") || row.querySelector("a[href]");
      const title =
        link?.textContent ||
        titleCell.querySelector("div > div:first-child")?.textContent ||
        titleCell.textContent;
      const company =
        cells[2]?.querySelector("div")?.textContent || cells[2]?.textContent;
      const deadline =
        cells[3]?.querySelector("span")?.textContent || cells[3]?.textContent;
      const numberOfPosts =
        titleCell.querySelector(".text-gray-600")?.textContent ||
        [...titleCell.querySelectorAll("div")]
          .map((element) => element.textContent)
          .find((text) => /post|position|nafasi/i.test(text || ""));

      return [{
        title,
        company,
        deadline,
        numberOfPosts,
        sourceUrl: link?.href || baseUrl,
      }];
    }), AJIRA_VACANCIES_URL);
}

async function increasePageSize(page) {
  const selects = page.locator("select");
  for (let index = 0; index < await selects.count(); index += 1) {
    const select = selects.nth(index);
    const options = await select.locator("option").allTextContents();
    const preferred = ["100", "50"].find((size) =>
      options.some((option) => option.trim() === size)
    );
    if (preferred) {
      await select.selectOption({ label: preferred }).catch(() =>
        select.selectOption(preferred)
      );
      await page.waitForTimeout(1000);
      return;
    }
  }
}

async function findNextButton(page) {
  const candidates = [
    page.getByRole("button", { name: /^next$/i }),
    page.locator("button:has-text('Next')"),
    page.locator("[aria-label='Next page']"),
  ];

  for (const candidate of candidates) {
    if (await candidate.count()) return candidate.first();
  }
  return null;
}

async function collectAjiraJobs({ browserFactory = () => chromium.launch({ headless: true }) } = {}) {
  const browser = await browserFactory();
  const page = await browser.newPage({
    userAgent: "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
  });

  try {
    await page.goto(AJIRA_VACANCIES_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForSelector("table tbody tr", { timeout: 45000 });
    await increasePageSize(page);

    const rawJobs = [];
    const pageFingerprints = new Set();

    for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber += 1) {
      await page.waitForSelector("table tbody tr", { timeout: 20000 });
      const jobs = await extractPageJobs(page);
      if (!jobs.length) {
        throw new Error(`Ajira page ${pageNumber} contained no readable vacancies.`);
      }

      const fingerprint = jobs
        .slice(0, 5)
        .map((job) => `${job.title}|${job.company}`)
        .join("\n");
      if (pageFingerprints.has(fingerprint)) break;
      pageFingerprints.add(fingerprint);
      rawJobs.push(...jobs);
      console.log(`Ajira page ${pageNumber}: ${jobs.length} vacancies`);

      const nextButton = await findNextButton(page);
      if (!nextButton) break;

      const disabled =
        (await nextButton.isDisabled().catch(() => false)) ||
        (await nextButton.getAttribute("aria-disabled")) === "true";
      if (disabled) break;

      await nextButton.click();
      await page.waitForTimeout(1200);
    }

    const jobs = deduplicateJobs(rawJobs, {
      source: AJIRA_SOURCE,
      baseUrl: AJIRA_VACANCIES_URL,
      category: "Government",
      language: "sw",
      description:
        "Visit the official Ajira Portal for the full vacancy notice and application instructions.",
    });
    if (!jobs.length) {
      throw new Error("Ajira scrape produced zero valid vacancies; database was not changed.");
    }
    return jobs;
  } finally {
    await browser.close();
  }
}

async function scrapeAjira({ dryRun = false } = {}) {
  console.log(`Starting Ajira scraper${dryRun ? " (dry run)" : ""}...`);
  const jobs = await collectAjiraJobs();

  if (dryRun) {
    const summary = {
      found: jobs.length,
      sample: jobs.slice(0, 3).map(({ title, company, deadline, sourceUrl }) => ({
        title,
        company,
        deadline,
        sourceUrl,
      })),
    };
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }

  const prisma = createPrismaClient();
  try {
    const summary = await saveJobs(prisma, jobs, AJIRA_SOURCE);
    console.log(JSON.stringify(summary));
    return summary;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  scrapeAjira({ dryRun }).catch((error) => {
    console.error("Ajira scraper failed:", error);
    process.exitCode = 1;
  });
}

module.exports = {
  collectAjiraJobs,
  extractPageJobs,
  saveJobs,
  scrapeAjira,
};
