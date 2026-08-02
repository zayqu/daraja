const crypto = require("node:crypto");
const cheerio = require("cheerio");

const institutions = require("../config/tanzania-financial-institutions.json").institutions;
const { cleanText, deduplicateJobs } = require("../lib/jobs");

const REQUEST_TIMEOUT_MS = 12000;
const MAX_CAREER_PAGES_PER_INSTITUTION = 3;
const CONCURRENCY = 4;

function normalizeHost(value) {
  return String(value || "").toLowerCase().replace(/^www\./, "");
}

function isOfficialUrl(candidate, homepage) {
  try {
    const url = new URL(candidate, homepage);
    const officialHost = normalizeHost(new URL(homepage).hostname);
    const candidateHost = normalizeHost(url.hostname);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      (candidateHost === officialHost || candidateHost.endsWith(`.${officialHost}`))
    );
  } catch {
    return false;
  }
}

function isGenericTitle(value) {
  const title = cleanText(value).toLowerCase();
  return (
    !title ||
    title.length < 4 ||
    /^(careers?|jobs?|vacancies|opportunities|apply|apply now|read more|learn more|view details)$/i.test(title) ||
    /^(email|physical|online) application$/i.test(title)
  );
}

function discoverCareerUrls(html, homepage) {
  const $ = cheerio.load(html || "");
  const urls = [];
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const label = cleanText($(element).text());
    if (!href || !/(career|vacanc|job|opportunit|work[- ]?with[- ]?us|recruit)/i.test(`${href} ${label}`)) {
      return;
    }
    try {
      const url = new URL(href, homepage).toString();
      if (isOfficialUrl(url, homepage)) urls.push(url);
    } catch {
      // Ignore malformed links.
    }
  });
  return [...new Set([homepage, ...urls])].slice(0, MAX_CAREER_PAGES_PER_INSTITUTION);
}

function flattenJsonLd(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (typeof value !== "object") return [];
  return [value, ...flattenJsonLd(value["@graph"]), ...flattenJsonLd(value.itemListElement)];
}

function parseJsonLdJobs(html, institution, pageUrl) {
  const $ = cheerio.load(html || "");
  const jobs = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const payload = JSON.parse($(element).text());
      for (const item of flattenJsonLd(payload)) {
        const type = Array.isArray(item?.["@type"]) ? item["@type"] : [item?.["@type"]];
        if (!type.includes("JobPosting")) continue;
        const title = cleanText(item.title || item.name);
        if (isGenericTitle(title)) continue;
        const country = cleanText(
          item.jobLocation?.address?.addressCountry ||
            item.applicantLocationRequirements?.name ||
            "Tanzania"
        );
        if (country && !/tanzania|\btz\b/i.test(country)) continue;
        const detailUrl = item.url && isOfficialUrl(item.url, institution.url)
          ? new URL(item.url, pageUrl).toString()
          : pageUrl;
        const descriptionHtml = item.description || item.responsibilities || item.qualifications || "";
        const description = cleanText(cheerio.load(descriptionHtml).text());
        const locality = cleanText(item.jobLocation?.address?.addressLocality);
        const region = cleanText(item.jobLocation?.address?.addressRegion);
        const identifier = cleanText(item.identifier?.value || item.identifier || detailUrl);
        jobs.push({
          sourceId: `${institution.id}-${crypto.createHash("sha256").update(identifier).digest("hex").slice(0, 20)}`,
          title,
          company: cleanText(item.hiringOrganization?.name) || institution.name,
          location: [locality, region].filter(Boolean).join(", ") || "Tanzania",
          description: description || `View the official ${institution.name} vacancy for full requirements and application instructions.`,
          deadline: item.validThrough || null,
          sourceUrl: detailUrl,
        });
      }
    } catch {
      // Ignore malformed structured data and continue checking the page.
    }
  });
  return jobs;
}

function parseOfficialJobLinks(html, institution, pageUrl) {
  const $ = cheerio.load(html || "");
  const jobs = [];
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const title = cleanText($(element).text());
    if (!href || isGenericTitle(title)) return;
    if (!/(job|vacanc|career|position|opening|recruit)/i.test(href)) return;
    let detailUrl;
    try {
      detailUrl = new URL(href, pageUrl).toString();
    } catch {
      return;
    }
    if (!isOfficialUrl(detailUrl, institution.url)) return;
    jobs.push({
      sourceId: `${institution.id}-${crypto.createHash("sha256").update(detailUrl).digest("hex").slice(0, 20)}`,
      title,
      company: institution.name,
      location: "Tanzania",
      description: `View the official ${institution.name} vacancy for full requirements and application instructions.`,
      sourceUrl: detailUrl,
    });
  });
  return jobs;
}

async function fetchHtml(url, fetchFn) {
  const response = await fetchFn(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) throw new Error("non-HTML response");
  return response.text();
}

async function collectInstitution(institution, fetchFn) {
  const homepageHtml = await fetchHtml(institution.url, fetchFn);
  const careerUrls = discoverCareerUrls(homepageHtml, institution.url);
  const pages = await Promise.allSettled(
    careerUrls.map(async (url) => ({ url, html: url === institution.url ? homepageHtml : await fetchHtml(url, fetchFn) }))
  );
  const jobs = [];
  for (const result of pages) {
    if (result.status !== "fulfilled") continue;
    jobs.push(...parseJsonLdJobs(result.value.html, institution, result.value.url));
    jobs.push(...parseOfficialJobLinks(result.value.html, institution, result.value.url));
  }
  return jobs;
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      try {
        results[current] = { status: "fulfilled", value: await mapper(items[current]) };
      } catch (reason) {
        results[current] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function collectTanzaniaFinancialInstitutionJobs({ fetchFn = fetch } = {}) {
  const results = await mapWithConcurrency(
    institutions,
    CONCURRENCY,
    (institution) => collectInstitution(institution, fetchFn)
  );
  const rawJobs = [];
  const failures = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") rawJobs.push(...result.value);
    else failures.push({ institution: institutions[index].id, error: cleanText(result.reason?.message) });
  });

  const jobs = deduplicateJobs(rawJobs, {
    source: "tanzania-financial-institutions",
    baseUrl: "https://www.bot.go.tz/",
    location: "Tanzania",
  });
  Object.defineProperty(jobs, "health", {
    enumerable: false,
    value: {
      institutions: institutions.length,
      failedInstitutions: failures.length,
      failures: failures.slice(0, 10),
      preserveExisting: jobs.length === 0,
    },
  });
  return jobs;
}

module.exports = {
  collectTanzaniaFinancialInstitutionJobs,
  discoverCareerUrls,
  isGenericTitle,
  isOfficialUrl,
  parseJsonLdJobs,
  parseOfficialJobLinks,
};
