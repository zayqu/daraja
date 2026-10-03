const cheerio = require("cheerio");

const {
  cleanText,
  deduplicateJobs,
  parseDeadline,
} = require("../lib/jobs");
const {
  extractSourcePageMetadata,
  isSafePublicHttpUrl,
} = require("../lib/source-page");

const REQUEST_TIMEOUT_MS = 30000;
const GOOGLE_SEARCH_URL = "https://www.google.com/search";
const DEFAULT_MAX_JOBS = 40;
const DEFAULT_MAX_GOOGLE_RESULTS = 20;

function mapEmploymentType(value) {
  const type = cleanText(value).toLowerCase();
  if (type.includes("freelance")) return "FREELANCE";
  if (type.includes("part")) return "PART_TIME";
  if (type.includes("intern") || type.includes("volunteer")) return "INTERNSHIP";
  if (type.includes("contract") || type.includes("temporary") || type.includes("fixed")) {
    return "CONTRACT";
  }
  return "FULL_TIME";
}

function htmlToText(value) {
  const $ = cheerio.load(value || "");
  $("script, style, noscript").remove();
  return cleanText($.text());
}

function isAllowedHost(urlValue, source) {
  try {
    const url = new URL(urlValue);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const allowed = source.discovery?.allowedHosts || [
      new URL(source.url).hostname.toLowerCase().replace(/^www\./, ""),
    ];
    return allowed.some((value) => {
      const expected = String(value).toLowerCase().replace(/^www\./, "");
      return host === expected || host.endsWith("." + expected);
    });
  } catch {
    return false;
  }
}

function normalizeJobLink(value, baseUrl, source) {
  try {
    const url = new URL(value, baseUrl);
    if (!isSafePublicHttpUrl(url.toString())) return null;
    url.hash = "";
    if (!isAllowedHost(url.toString(), source)) return null;

    const pattern = source.discovery?.detailPathPattern;
    if (pattern && !new RegExp(pattern, "i").test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function contextTextForLink($, element) {
  const node = $(element);
  const candidates = [
    node.closest("article"),
    node.closest("li"),
    node.closest("tr"),
    node.parent(),
    node.parent().parent(),
    node.parent().parent().parent(),
  ].filter((candidate) => candidate?.length);

  for (const candidate of candidates) {
    const text = cleanText(candidate.text());
    if (text.length >= 8 && text.length <= 2000) return text;
  }

  return cleanText(node.text());
}

function discoverListingLinks(html, pageUrl, source) {
  const $ = cheerio.load(html || "");
  const results = [];
  const seen = new Set();

  $("a[href]").each((_, element) => {
    const sourceUrl = normalizeJobLink($(element).attr("href"), pageUrl, source);
    if (!sourceUrl || seen.has(sourceUrl)) return;
    seen.add(sourceUrl);
    results.push({
      sourceUrl,
      contextText: contextTextForLink($, element),
    });
  });

  return results;
}

function googleResultTarget(href) {
  const value = String(href || "").trim();
  if (!value) return null;

  try {
    if (value.startsWith("/url?")) {
      const url = new URL(value, "https://www.google.com");
      return url.searchParams.get("q") || url.searchParams.get("url");
    }
    if (/^https?:\/\//i.test(value)) return value;
  } catch {
    return null;
  }
  return null;
}

function discoverGoogleLinks(html, source) {
  const $ = cheerio.load(html || "");
  const results = [];
  const seen = new Set();

  $("a[href]").each((_, element) => {
    const target = googleResultTarget($(element).attr("href"));
    if (!target) return;
    const sourceUrl = normalizeJobLink(target, source.url, source);
    if (!sourceUrl || seen.has(sourceUrl)) return;
    seen.add(sourceUrl);
    results.push({
      sourceUrl,
      contextText: cleanText($(element).text()),
    });
  });

  return results;
}

async function fetchHtml(url, fetchFn = fetch) {
  const response = await fetchFn(url, {
    redirect: "follow",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en",
      "User-Agent": "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response?.ok) {
    throw new Error("HTTP " + (response?.status || "unknown") + " from " + url);
  }

  const contentType = response.headers?.get?.("content-type") || "";
  if (
    contentType &&
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml+xml")
  ) {
    throw new Error("Unexpected content type from " + url + ": " + contentType);
  }

  return response.text();
}

function replaceTemplate(value, now = new Date()) {
  return String(value || "")
    .replaceAll("{year}", String(now.getUTCFullYear()))
    .replaceAll("{month}", String(now.getUTCMonth() + 1).padStart(2, "0"));
}

async function discoverAgencyJobs(source, { fetchFn = fetch, now = new Date() } = {}) {
  const mode = source.discovery?.mode || "listing";
  const maxJobs = Math.max(
    1,
    Math.min(Number(source.discovery?.maxJobs) || DEFAULT_MAX_JOBS, 100)
  );

  if (mode === "google") {
    const query = replaceTemplate(
      source.discovery?.query ||
        ("site:" + new URL(source.url).hostname + " Tanzania jobs {year}"),
      now
    );
    const url = new URL(GOOGLE_SEARCH_URL);
    url.searchParams.set("hl", "en");
    url.searchParams.set(
      "num",
      String(
        Math.max(
          1,
          Math.min(
            Number(source.discovery?.maxGoogleResults) ||
              DEFAULT_MAX_GOOGLE_RESULTS,
            30
          )
        )
      )
    );
    url.searchParams.set("filter", "0");
    url.searchParams.set("q", query);
    const html = await fetchHtml(url.toString(), fetchFn);
    return discoverGoogleLinks(html, source).slice(0, maxJobs);
  }

  const pages =
    source.discovery?.listingPages?.length > 0
      ? source.discovery.listingPages
      : [source.url];

  const results = [];
  const seen = new Set();
  for (const page of pages.slice(0, 5)) {
    const pageUrl = replaceTemplate(page, now);
    const html = await fetchHtml(pageUrl, fetchFn);
    for (const discovery of discoverListingLinks(html, pageUrl, source)) {
      if (seen.has(discovery.sourceUrl)) continue;
      seen.add(discovery.sourceUrl);
      results.push(discovery);
      if (results.length >= maxJobs) return results;
    }
  }
  return results;
}

function flattenJsonLd(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenJsonLd(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;

  output.push(value);
  if (value["@graph"]) flattenJsonLd(value["@graph"], output);
  return output;
}

function getJobPostingJson(html) {
  const $ = cheerio.load(html || "");
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    try {
      const value = JSON.parse($(script).text());
      const posting = flattenJsonLd(value).find((item) => {
        const type = item?.["@type"];
        return Array.isArray(type)
          ? type.includes("JobPosting")
          : type === "JobPosting";
      });
      if (posting) return posting;
    } catch {
      // Ignore malformed structured data and use the visible page instead.
    }
  }
  return null;
}

function labeledValue($, labels) {
  const patterns = labels.map(
    (label) => new RegExp("^" + label + "\\s*:?\\s*(.+)$", "i")
  );
  const selectors = "p, li, dt, dd, tr, div, span";

  for (const element of $(selectors).toArray()) {
    const text = cleanText($(element).text());
    if (!text || text.length > 500) continue;
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return cleanText(match[1]);
    }
  }

  return "";
}

function extractDeadlineText(value) {
  const text = cleanText(value);
  const patterns = [
    /(?:application\s+deadline|closing\s+date|close\s+date|deadline(?:\s*\(date\))?|last\s+day\s+to\s+apply)\s*:?\s*((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
    /(?:application\s+deadline|closing\s+date|close\s+date|deadline(?:\s*\(date\))?|last\s+day\s+to\s+apply)\s*:?\s*(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})/i,
    /(?:application\s+deadline|closing\s+date|close\s+date|deadline(?:\s*\(date\))?|last\s+day\s+to\s+apply)\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /(?:application\s+deadline|closing\s+date|close\s+date|deadline(?:\s*\(date\))?|last\s+day\s+to\s+apply)\s*:?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i,
  ];

  for (const pattern of patterns) {
    const found = text.match(pattern)?.[1];
    if (found) return cleanText(found);
  }
  return null;
}

function relativeDeadline(value, now = new Date()) {
  const match = cleanText(value).match(/\bexpir(?:es|ing)\s+in\s+(\d{1,3})\s+days?\b/i);
  if (!match) return null;
  const days = Number(match[1]);
  if (!Number.isFinite(days) || days < 0 || days > 120) return null;
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(23, 59, 59, 0);
  return date;
}

function locationFromPosting(posting) {
  const locations = Array.isArray(posting?.jobLocation)
    ? posting.jobLocation
    : posting?.jobLocation
      ? [posting.jobLocation]
      : [];

  for (const location of locations) {
    const address = location?.address || {};
    const value = [
      address.addressLocality,
      address.addressRegion,
      address.addressCountry,
    ]
      .filter(Boolean)
      .join(", ");
    if (value) return value;
  }
  return "";
}

function pageIsClosed(text) {
  return /(?:no longer accepting applications|job posting is no longer available|applications? (?:are )?closed|position (?:has been|is) filled|vacancy (?:has been|is) closed)/i.test(
    cleanText(text)
  );
}

function descriptionFromPage($, source) {
  const selector = source.detail?.descriptionSelector;
  if (selector) {
    const text = cleanText($(selector).first().text());
    if (text) return text;
  }

  const heading = $("h1, h2, h3, h4")
    .filter((_, element) =>
      /^(?:job\s+description|description|job\s+summary|position\s+summary)$/i.test(
        cleanText($(element).text())
      )
    )
    .first();

  if (heading.length) {
    const parts = [];
    let current = heading.next();
    while (
      current.length &&
      !/^h[1-4]$/i.test(current[0]?.tagName || "") &&
      parts.join(" ").length < 12000
    ) {
      const text = cleanText(current.text());
      if (text) parts.push(text);
      current = current.next();
    }
    if (parts.length) return parts.join("\n\n");
  }

  const main = $("main, article").first();
  const text = cleanText(main.length ? main.text() : $("body").text());
  return text.slice(0, 12000);
}

function sourceIdFromUrl(value) {
  try {
    const url = new URL(value);
    const tail = url.pathname.split("/").filter(Boolean).slice(-2).join("-");
    return tail || url.toString();
  } catch {
    return value;
  }
}

function countryMatchesTanzania(value) {
  return /\btanzania\b|\bdar es salaam\b|\btanga\b|\barusha\b|\bdodoma\b|\bmwanza\b|\bzanzibar\b|\bkilimanjaro\b|\bmara\b|\bmbeya\b|\bmorogoro\b|\bmtwara\b|\biringa\b|\bnjombe\b|\bkatavi\b|\brukwa\b|\bsongwe\b/i.test(
    cleanText(value)
  );
}

async function parseAgencyDetail(
  discovery,
  source,
  { fetchFn = fetch, now = new Date() } = {}
) {
  const html = await fetchHtml(discovery.sourceUrl, fetchFn);
  const $ = cheerio.load(html || "");
  const bodyText = cleanText($("body").text());

  if (pageIsClosed(bodyText)) {
    return { job: null, reason: "closed" };
  }

  const posting = getJobPostingJson(html);
  const metadata = extractSourcePageMetadata(html, discovery.sourceUrl);

  const title =
    cleanText(posting?.title) ||
    cleanText($(source.detail?.titleSelector || "h1").first().text()) ||
    cleanText($('meta[property="og:title"]').attr("content"));

  const company =
    cleanText(posting?.hiringOrganization?.name) ||
    labeledValue($, ["Company", "Employer", "Organization", "Organisation"]) ||
    cleanText(source.recruiterName) ||
    cleanText(source.name);

  const location =
    locationFromPosting(posting) ||
    labeledValue($, ["Location", "Job Location", "Duty Station"]) ||
    (() => {
      const match = cleanText(discovery.contextText).match(
        /(?:location\s*:?\s*)?([^|]{0,80}\bTanzania\b)/i
      );
      return cleanText(match?.[1]);
    })() ||
    cleanText(source.defaultLocation) ||
    "Tanzania";

  const deadlineText =
    cleanText(posting?.validThrough) ||
    labeledValue($, [
      "Application Deadline",
      "Closing Date",
      "Close Date",
      "Deadline",
      "Deadline \\(Date\\)",
      "Last Day to Apply",
    ]) ||
    extractDeadlineText(bodyText) ||
    extractDeadlineText(discovery.contextText);

  let deadline = deadlineText ? parseDeadline(deadlineText) : null;
  if (!deadline) {
    deadline = relativeDeadline(discovery.contextText, now);
  }

  const combinedCountryEvidence = [
    location,
    posting?.jobLocation?.address?.addressCountry,
    discovery.contextText,
    bodyText.slice(0, 4000),
  ]
    .filter(Boolean)
    .join(" ");

  if (
    source.countryFilter === "Tanzania" &&
    !countryMatchesTanzania(combinedCountryEvidence)
  ) {
    return { job: null, reason: "country" };
  }

  if (source.requireDeadline !== false && !deadline) {
    return { job: null, reason: "deadline-missing" };
  }

  if (deadline && deadline.getTime() < now.getTime()) {
    return { job: null, reason: "expired" };
  }

  const description =
    posting?.description
      ? htmlToText(posting.description)
      : descriptionFromPage($, source);

  if (!title || title.length < 3 || !description || description.length < 20) {
    return { job: null, reason: "incomplete" };
  }

  const rawJob = {
    sourceId:
      cleanText(posting?.identifier?.value) ||
      sourceIdFromUrl(discovery.sourceUrl),
    title,
    company,
    location,
    description,
    deadline: deadline ? deadline.toISOString() : null,
    type: mapEmploymentType(
      posting?.employmentType ||
        labeledValue($, ["Job Type", "Employment Type", "Type"])
    ),
    sourceUrl: discovery.sourceUrl,
    applicationUrl:
      metadata.applicationUrl ||
      (source.detailPageIsApplication ? discovery.sourceUrl : null),
    companyLogo: metadata.companyLogo,
    representativeImage: metadata.representativeImage,
  };

  const [job] = deduplicateJobs([rawJob], {
    source: source.id,
    baseUrl: source.url,
    location: source.defaultLocation || "Tanzania",
    language: "en",
  });

  if (!job || !job.active) {
    return { job: null, reason: "expired" };
  }

  return { job, reason: null };
}

async function mapWithConcurrency(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(values[index], index);
    }
  }

  const count = Math.max(1, Math.min(limit, values.length || 1));
  await Promise.all(Array.from({ length: count }, () => worker()));
  return output;
}

async function collectVerifiedAgencyJobs(
  source,
  {
    fetchFn = fetch,
    now = new Date(),
  } = {}
) {
  if (!source?.id || !source?.url) {
    throw new Error("Verified agency source configuration is incomplete.");
  }

  const discoveries = await discoverAgencyJobs(source, { fetchFn, now });
  if (!discoveries.length) {
    const empty = [];
    Object.defineProperty(empty, "health", {
      enumerable: false,
      value: {
        discovered: 0,
        unresolved: 0,
        preserveExisting: true,
      },
    });
    return empty;
  }

  const counters = {
    expired: 0,
    closed: 0,
    country: 0,
    deadlineMissing: 0,
    incomplete: 0,
    failed: 0,
  };

  const results = await mapWithConcurrency(
    discoveries,
    Math.max(1, Math.min(Number(source.discovery?.concurrency) || 5, 8)),
    async (discovery) => {
      try {
        const result = await parseAgencyDetail(discovery, source, {
          fetchFn,
          now,
        });
        if (!result.job) {
          if (result.reason === "expired") counters.expired += 1;
          else if (result.reason === "closed") counters.closed += 1;
          else if (result.reason === "country") counters.country += 1;
          else if (result.reason === "deadline-missing") counters.deadlineMissing += 1;
          else counters.incomplete += 1;
        }
        return result.job;
      } catch (error) {
        counters.failed += 1;
        console.warn(
          source.name + ": could not verify " + discovery.sourceUrl + ": " + error.message
        );
        return null;
      }
    }
  );

  const jobs = results.filter(Boolean);
  Object.defineProperty(jobs, "health", {
    enumerable: false,
    value: {
      discovered: discoveries.length,
      unresolved:
        counters.failed +
        counters.incomplete +
        counters.deadlineMissing,
      rejectedExpired: counters.expired + counters.closed,
      rejectedOutsideTanzania: counters.country,
      preserveExisting: jobs.length === 0,
    },
  });

  return jobs;
}

module.exports = {
  collectVerifiedAgencyJobs,
  discoverAgencyJobs,
  discoverGoogleLinks,
  discoverListingLinks,
  extractDeadlineText,
  getJobPostingJson,
  mapEmploymentType,
  pageIsClosed,
  parseAgencyDetail,
  relativeDeadline,
};
