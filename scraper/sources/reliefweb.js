const cheerio = require("cheerio");

const { deduplicateJobs } = require("../lib/jobs");

const RELIEFWEB_SOURCE = "reliefweb";
const RELIEFWEB_URL =
  "https://reliefweb.int/jobs?advanced-search=%28C244%29";
const MAX_PAGES = 20;

function parseReliefWebPage(html) {
  const $ = cheerio.load(html);
  const jobs = [];

  $("article.rw-river-article--job").each((_, article) => {
    const element = $(article);
    const link = element.find(".rw-river-article__title a[href]").first();
    const deadline = element
      .find(".rw-entity-meta__tag-value--closing-date time")
      .attr("datetime");
    const country = element.find(".rw-entity-country-slug").text().trim();

    if (!/tanzania/i.test(country) || !deadline) return;

    jobs.push({
      title: link.text(),
      company: element
        .find(".rw-entity-meta__tag-value--source")
        .text(),
      location: "Tanzania",
      deadline,
      sourceUrl: link.attr("href"),
      category: "NGO",
      language: "en",
      description:
        "This humanitarian or development vacancy is listed for Tanzania. Visit ReliefWeb for the complete role description and official application instructions.",
    });
  });

  return jobs;
}

async function fetchPage(url, fetchFn, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchFn(url, {
        headers: {
          "User-Agent": "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        throw new Error(`ReliefWeb returned HTTP ${response.status}.`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw lastError;
}

async function collectReliefWebJobs({ fetchFn = fetch } = {}) {
  const rawJobs = [];
  const seenIds = new Set();

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL(RELIEFWEB_URL);
    if (page) url.searchParams.set("page", page);
    const html = await fetchPage(url, fetchFn);
    const pageJobs = parseReliefWebPage(html);
    if (!pageJobs.length) break;

    let newOnPage = 0;
    for (const job of pageJobs) {
      const match = job.sourceUrl?.match(/\/job\/(\d+)/);
      const id = match?.[1] || job.sourceUrl;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      rawJobs.push(job);
      newOnPage += 1;
    }

    console.log(`ReliefWeb page ${page + 1}: ${newOnPage} new vacancies`);
    if (!newOnPage) break;
  }

  const jobs = deduplicateJobs(rawJobs, {
    source: RELIEFWEB_SOURCE,
    baseUrl: RELIEFWEB_URL,
    category: "NGO",
    language: "en",
  });
  if (!jobs.length) {
    throw new Error(
      "ReliefWeb scrape produced zero valid Tanzania vacancies; database was not changed."
    );
  }
  return jobs;
}

module.exports = {
  RELIEFWEB_SOURCE,
  RELIEFWEB_URL,
  collectReliefWebJobs,
  fetchPage,
  parseReliefWebPage,
};
