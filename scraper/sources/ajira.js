const { SCRAPER_USER_AGENT } = require("../lib/runtime-config");
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
const { enrichOfficialAjiraJobs } = require("../lib/ajira-official-detail");

const AJIRA_DETAIL_URL = "https://portal.ajira.go.tz/view-advert";
const AJIRA_ENCRYPTION_KEY = "*n%^+-$#@$$^@1ERFWFW";
const REQUEST_TIMEOUT_MS = 60000;
const MAX_PAGES = 100;

function getAjiraKey() {
  return CryptoJS.enc.Utf8.parse(AJIRA_ENCRYPTION_KEY);
}

function encryptAjiraId(id) {
  const value = String(id || "").trim();
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid Ajira vacancy ID: ${value || "(empty)"}`);
  }
  const key = getAjiraKey();
  return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(value), key, {
    keySize: 128 / 32,
    iv: key,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
    .toString()
    .replace(/\//g, "juam");
}

function decryptAjiraId(value) {
  try {
    const encrypted = decodeURIComponent(String(value || ""))
      .replace(/juam/g, "/")
      .trim();
    if (!encrypted) return null;
    const key = getAjiraKey();
    const id = CryptoJS.AES.decrypt(encrypted, key, {
      keySize: 128 / 32,
      iv: key,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8);
    return /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
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
  const numericId = match ? decryptAjiraId(match[1]) : null;
  if (numericId) return numericId;
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

  const candidateUrl = String(row?.sourceUrl || "");
  // An explicit numeric PSRS vacancy ID is valid evidence from the listing.
  // Never derive a detail URL from a title, employer name, or a URL slug.
  const officialId = /^\d+$/.test(String(row?.id || "")) ? String(row.id) : null;
  const directUrl = officialId ? getAjiraDetailUrl(officialId) : null;
  const sourceUrl = /^https:\/\/portal\.ajira\.go\.tz\/view-advert\/[^/]+/i.test(candidateUrl)
    ? candidateUrl
    : directUrl || AJIRA_VACANCIES_URL;

  return {
    sourceId: sourceIdFor(sourceUrl, title, company),
    title,
    company: company || "Government of Tanzania",
    deadline: formatDeadline(row?.deadline),
    numberOfPosts: row?.numberOfPosts || "",
    sourceUrl,
    // A listing row is not enough to verify the full job description.
    // Keep it for review until a vacancy-level official notice is resolved.
    originalEvidence: { verified: false, deadlineVerified: Boolean(row?.deadline), originalUrl: sourceUrl },
    applicationUrl: row?.applicationUrl || null,
    companyLogo: row?.companyLogo || null,
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
    companyLogo:
      vacancy?.scheme?.emp?.logoUrl ||
      vacancy?.scheme?.emp?.logo ||
      vacancy?.employer?.logoUrl ||
      vacancy?.employer?.logo ||
      null,
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
        const employerImage = cells[2].querySelector("img");
        const companyLogo =
          employerImage?.src ||
          employerImage?.getAttribute("data-src") ||
          employerImage?.getAttribute("data-lazy-src") ||
          "";
        const deadline =
          cells[3].querySelector("span")?.textContent || cells[3].textContent;
        const link = row.querySelector('a[href*="view-advert"]')?.href || "";
        // Only capture IDs explicitly included in the rendered official row.
        // Titles and table positions are not substitute vacancy identifiers.
        const id = row.getAttribute("data-vacancy-id") ||
          row.getAttribute("data-advert-id") ||
          row.getAttribute("data-advertisement-id") ||
          row.querySelector("[data-vacancy-id]")?.getAttribute("data-vacancy-id") ||
          "";
        return {
          id: /^\d+$/.test(id) ? id : "",
          title: title?.trim(),
          company: employer?.trim(),
          companyLogo,
          deadline: deadline?.trim(),
          numberOfPosts: posts?.trim(),
          sourceUrl: link,
        };
      })
      .filter(Boolean)
  );
}

async function fetchRenderedRows({ launch = (options) => chromium.launch(options) } = {}) {
  const browser = await launch({ headless: true });
  const rows = [];
  try {
    const page = await browser.newPage({
      userAgent: SCRAPER_USER_AGENT,
    });
    await page.goto(AJIRA_VACANCIES_URL, {
      waitUntil: "networkidle",
      timeout: REQUEST_TIMEOUT_MS,
    });
    await page.waitForFunction(() => {
      // Angular draws a placeholder row before vacancy data arrives.
      // A <tr> alone is not evidence that a vacancy has loaded.
      const rows = [...document.querySelectorAll("table tbody tr")];
      return rows.some((row) => {
        const cells = row.querySelectorAll("td");
        return cells.length >= 4 &&
          (cells[1]?.textContent || "").trim().length >= 5 &&
          (cells[2]?.textContent || "").trim().length >= 4;
      });
    }, null, { timeout: REQUEST_TIMEOUT_MS });

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
  let jobs = deduplicateJobs(mapped, {
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

  let verification = { verified: 0, unverified: jobs.length };
  // Fixture-based adapter tests pass rows directly; production runs fetch
  // and verify full official vacancy pages, rather than trusting the index.
  if (options.verifyOfficial === true || (!options.rows && options.verifyOfficial !== false)) {
    const result = await enrichOfficialAjiraJobs(jobs, { fetchFn: options.fetchFn, render: options.render });
    jobs = result.jobs;
    verification = { verified: result.verified, unverified: result.unverified };
  }
  console.log(
    `Ajira rendered listings: ${rows.length} rows; ${jobs.length} candidate vacancies; ${verification.verified} verified original notices; ${rejectedGenericTitles} invalid titles skipped`
  );
  Object.defineProperty(jobs, "health", {
    enumerable: false,
    value: { rejectedGenericTitles, renderedRows: rows.length, ...verification },
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
  decryptAjiraId,
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
