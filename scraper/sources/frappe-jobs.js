const cheerio = require("cheerio");

const { SCRAPER_USER_AGENT } = require("../lib/runtime-config");
const { cleanText, deduplicateJobs, mapEmploymentType } = require("../lib/jobs");
const { htmlToLines } = require("../lib/source-page");

// Official employer job portals built on Frappe HR (ERPNext). The /jobs page
// is server-rendered: each opening is a card whose id is its detail route,
// with the closing date on the card. Detail pages carry the description and
// the employer's own "Apply Now" form. One adapter serves every employer that
// runs this portal; each employer is its own catalog source.

const REQUEST_TIMEOUT_MS = 30000;

async function fetchHtml(url, fetchFn) {
  const response = await fetchFn(url, {
    headers: { Accept: "text/html", "User-Agent": SCRAPER_USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  return response.text();
}

function parseFrappeListing(html, listingUrl) {
  const $ = cheerio.load(html || "");
  return $('[name="card"][id^="jobs/"]')
    .map((_, element) => {
      const card = $(element);
      const route = card.attr("id");
      const closes = cleanText(
        card.find("p").filter((__, p) => /closes\s+on/i.test($(p).text())).find("b").first().text()
      );
      const details = card
        .find(".text-14 > div")
        .map((__, div) => cleanText($(div).text()))
        .get()
        .filter(Boolean);
      return {
        title: cleanText(card.find("h4").first().attr("title") || card.find("h4").first().text()),
        company: cleanText(card.find(".font-weight-bold").first().text()),
        employmentType: cleanText(card.find(".other-badge").first().text()).replace(/^•\s*/, ""),
        location: details[0] || "",
        deadline: closes || null,
        detailUrl: new URL(`/${route}`, listingUrl).toString(),
      };
    })
    .get()
    .filter((job) => job.title && job.detailUrl);
}

// Portal fact rows (label line, value line) that precede the description.
const FACT_LABELS = /^(?:location|department|employment type|applications received|closes on|salary|designation|currency)$/i;

function parseFrappeDetail(html, detailUrl) {
  const $ = cheerio.load(html || "");
  const content = $(".page_content").first();
  const applyHref = content
    .find("a")
    .filter((_, a) => /apply\s+now/i.test($(a).text()))
    .first()
    .attr("href");
  const lines = htmlToLines(content.html() || "");
  let lastFact = -1;
  lines.forEach((line, index) => {
    if (FACT_LABELS.test(line)) lastFact = index + 1;
  });
  const description = lines
    .slice(lastFact + 1)
    .filter((line) => !/^apply now$/i.test(line))
    .join("\n");
  return {
    description,
    applicationUrl: applyHref ? new URL(applyHref, detailUrl).toString() : detailUrl,
  };
}

async function collectFrappeJobs(source, { fetchFn = fetch } = {}) {
  const listingUrl = source.url;
  const listings = parseFrappeListing(await fetchHtml(listingUrl, fetchFn), listingUrl);
  const rawJobs = [];
  let unresolved = 0;
  for (const listing of listings.slice(0, source.discovery?.maxJobs || 50)) {
    try {
      const detail = parseFrappeDetail(await fetchHtml(listing.detailUrl, fetchFn), listing.detailUrl);
      rawJobs.push({
        sourceId: new URL(listing.detailUrl).pathname.replace(/^\/jobs\//, ""),
        title: listing.title,
        company: listing.company || source.employerName,
        location: listing.location || source.defaultLocation || "Tanzania",
        description: detail.description,
        deadline: listing.deadline,
        type: mapEmploymentType(listing.employmentType, listing.title, detail.description),
        sourceUrl: listing.detailUrl,
        applicationUrl: detail.applicationUrl,
        reviewReasons: listing.deadline ? [] : ["no closing date on the employer's portal"],
      });
    } catch (error) {
      unresolved += 1;
      console.warn(`Could not read ${listing.detailUrl}: ${error.message}`);
    }
  }
  const jobs = deduplicateJobs(rawJobs, {
    source: source.id,
    baseUrl: listingUrl,
    company: source.employerName,
    location: source.defaultLocation || "Tanzania",
  });
  Object.defineProperty(jobs, "health", {
    enumerable: false,
    value: { discovered: listings.length, unresolved, archiveEmptySnapshot: listings.length === 0 && unresolved === 0 },
  });
  console.log(`${source.name}: ${jobs.length} current opening(s) on the employer's portal`);
  return jobs;
}

module.exports = {
  collectFrappeJobs,
  parseFrappeDetail,
  parseFrappeListing,
};
