const crypto = require("node:crypto");
const CryptoJS = require("crypto-js");
const { chromium } = require("playwright");
require("dotenv").config();

const {
  AJIRA_SOURCE,
  AJIRA_VACANCIES_URL,
  deduplicateJobs,
} = require("../lib/jobs");
const { createPrismaClient, saveJobs } = require("../lib/store");

const AJIRA_DETAIL_URL = "https://portal.ajira.go.tz/view-advert";
const AJIRA_ENCRYPTION_KEY = "*n%^+-$#@$$^@1ERFWFW";
const REQUEST_TIMEOUT_MS = 60000;
const MAX_PAGES = 100;

function encryptAjiraId(id) {
  const value = String(id || "").trim();
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid Ajira vacancy ID: ${value || "(empty)"}`);
  }
  const key = CryptoJS.enc.Utf8.parse(AJIRA_ENCRYPTION_KEY);
  return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(value), key, {
    keySize: 128 / 32,
    iv: key,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
    .toString()
    .replace(/\//g, "juam");
}

function getAjiraDetailUrl(id) {
  return `${AJIRA_DETAIL_URL}/${encryptAjiraId(id)}`;
}

function formatDeadline(value) {
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const display = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  return display
    ? `${display[1].padStart(2, "0")}/${display[2].padStart(2, "0")}/${display[3]}`
    : text || null;
}

function isGenericVacancyTitle(value) {
  const title = String(value || "").replace(/\s+/g, " ").trim();
  return (
    !title ||
    title.length < 4 ||
    /^(?:email|physical|postal|online|manual|website|portal|walk[ -]?in)\s+application(?:\s+method)?$/i.test(title) ||
    /^(?:how to apply|application method|apply now|view|view details|details|vacancies?|jobs?)$/i.test(title)
  );
}

function sourceIdFor(url, title, company) {
  const match = String(url || "").match(/view-advert\/([^?#]+)/i);
  if (match) return `advert-${match[1]}`;
  return `rendered-${crypto
    .createHash("sha256")
    .update(`${title}|${company}|${url || AJIRA_VACANCIES_URL}`)
    .digest("hex")
    .slice(0, 24)}`;
}

function mapRenderedVacancy(row) {
  const title = String(row?.title || "").replace(/\s+/g, " ").trim();
  const company = String(row?.company || "Government of Tanzania")
    .replace(/\s+/g, " ")
    .trim();
  if (isGenericVacancyTitle(title)) return null;

  const sourceUrl = /^https:\/\/portal\.ajira\.go\.tz\//i.test(row?.sourceUrl || "")
    ? row.sourceUrl
    : AJIRA_VACANCIES_URL;

  return {
    sourceId: sourceIdFor(sourceUrl, title, company),
    title,
    company: company || "Government of Tanzania",
    deadline: formatDeadline(row?.deadline),
    numberOfPosts: row?.numberOfPosts || "",
    sourceUrl,
  };
}

function mapAjiraVacancy(vacancy) {
  const id = String(vacancy?.id || "").trim();
  return mapRenderedVacancy({
    title:
      vacancy?.advertName ||
      vacancy?.title ||
      vacancy?.scheme?.name ||
      vacancy?.scheme?.title ||
      vacancy?.scheme?.codeNo,
    company: vacancy?.scheme?.emp?.name,
    deadline: vacancy?.closeDate,
    numberOfPosts: vacancy?.noOfPost
      ? `Number of Posts: ${vacancy.noOfPost}`
      : "",
    sourceUrl: /^\d+$/.test(id) ? getAjiraDetailUrl(id) : AJIRA_VACANCIES_URL,
  });
}

async function extractRenderedRows(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("table tbody tr")]
      .map((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 4) return null;
        const titleCell = cells[1];
        const title =
          titleCell.querySelector("div > div:first-child")?.textContent ||
          titleCell.querySelector("a")?.textContent ||
          titleCell.textContent;
        const posts =
          titleCell.querySelector(".text-gray-600")?.textContent ||
          titleCell.querySelector("small")?.textContent ||
          "";
        const employer =
          cells[2].querySelector("div")?.textContent || cells[2].textContent;
        const deadline =
          cells[3].querySelector("span")?.textContent || cells[3].textContent;
        const link = row.querySelector('a[href*="view-advert"]')?.href || "";
        return {
          title: title?.trim(),
          company: employer?.trim(),
          deadline: deadline?.trim(),
          numberOfPosts: posts?.trim(),
          sourceUrl: link,
        };
      })
      .filter(Boolean)
  );
}

async function fetchRenderedRows({
  launch = (options) => chromium.launch(options),
} = {}) {
  const browser = await launch({ headless: true });
  const rows = [];
  try {
    const page = await browser.newPage({
      userAgent: "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
    });
    await page.goto(AJIRA_VACANCIES_URL, {
      waitUntil: "networkidle",
      timeout: REQUEST_TIMEOUT_MS,
    });
    await page.waitForSelector("table tbody tr", { timeout: REQUEST_TIMEOUT_MS });

    const pageSize = page.locator("select").first();
    if (await pageSize.count()) {
      const options = await pageSize.locator("option").evaluateAll((items) =>
        items.map((item) => Number(item.value)).filter(Number.isFinite)
      );
      if (options.length) {
        await pageSize.selectOption(String(Math.max(...options)));
        await page.waitForTimeout(750);
      }
    }

    for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber += 1) {
      rows.push(...(await extractRenderedRows(page)));
      const next = page.getByRole("button", { name: /next/i }).first();
      if (!(await next.count()) || (await next.isDisabled())) break;
      await next.click();
      await page.waitForTimeout(750);
    }
  } finally {
    await browser.close();
  }
  return rows;
}

async function collectAjiraJobs(options = {}) {
  const rows = options.rows || (await fetchRenderedRows(options));
  const mapped = rows.map(mapRenderedVacancy).filter(Boolean);
  const rejectedGenericTitles = rows.length - mapped.length;
  const jobs = deduplicateJobs(mapped, {
    source: AJIRA_SOURCE,
    baseUrl: AJIRA_VACANCIES_URL,
    language: "sw",
    description:
      "Visit the official Ajira Portal for the full vacancy notice and application instructions.",
  });

  if (!jobs.length) {
    throw new Error(
      "Ajira rendered listings produced zero valid vacancies; database was not changed."
    );
  }

  console.log(
    `Ajira rendered listings: ${rows.length} rows; ${jobs.length} valid vacancies; ${rejectedGenericTitles} invalid titles skipped`
  );
  Object.defineProperty(jobs, "health", {
    enumerable: false,
    value: { rejectedGenericTitles, renderedRows: rows.length },
  });
  return jobs;
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
  encryptAjiraId,
  extractRenderedRows,
  fetchRenderedRows,
  formatDeadline,
  getAjiraDetailUrl,
  isGenericVacancyTitle,
  mapAjiraVacancy,
  mapRenderedVacancy,
  saveJobs,
  scrapeAjira,
  sourceIdFor,
};
