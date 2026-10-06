const { SCRAPER_USER_AGENT } = require("../lib/runtime-config");
const cheerio = require("cheerio");

const {
  cleanText,
  deduplicateJobs,
  mapEmploymentType,
  parseDeadline,
} = require("../lib/jobs");
const {
  extractSourcePageMetadata,
  htmlToLines,
  inspectEmployerPage,
  isSafePublicHttpUrl,
} = require("../lib/source-page");

const REQUEST_TIMEOUT_MS = 30000;
const GOOGLE_SEARCH_URL = "https://www.google.com/search";
const DEFAULT_MAX_JOBS = 40;
const DEFAULT_MAX_GOOGLE_RESULTS = 20;

const MONTHS =
  "January|February|March|April|May|June|July|August|September|October|November|December";
const BLOCKED_APPLICATION_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "whatsapp.com",
  "t.me",
];


function htmlToText(value) {
  return htmlToLines(`<body>${value || ""}</body>`).join("\n");
}

function normalizeIdentity(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHost(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function hostMatches(hostname, expected) {
  const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
  const target = String(expected || "").toLowerCase().replace(/^www\./, "");
  return Boolean(
    host &&
      target &&
      (host === target || host.endsWith("." + target))
  );
}

function isAllowedHost(urlValue, source) {
  try {
    const url = new URL(urlValue);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const allowed = source.discovery?.allowedHosts || [
      new URL(source.url).hostname.toLowerCase().replace(/^www\./, ""),
    ];
    return allowed.some((value) => hostMatches(host, value));
  } catch {
    return false;
  }
}

function isSourceHost(urlValue, source) {
  try {
    const host = new URL(urlValue).hostname;
    const allowed = source.discovery?.allowedHosts || [
      new URL(source.url).hostname,
    ];
    return allowed.some((value) => hostMatches(host, value));
  } catch {
    return false;
  }
}

function isBlockedApplicationHost(urlValue) {
  try {
    const host = new URL(urlValue).hostname;
    return BLOCKED_APPLICATION_HOSTS.some((value) =>
      hostMatches(host, value)
    );
  } catch {
    return true;
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
    const sourceUrl = normalizeJobLink(
      $(element).attr("href"),
      pageUrl,
      source
    );
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
      "User-Agent": SCRAPER_USER_AGENT,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response?.ok) {
    throw new Error(
      "HTTP " + (response?.status || "unknown") + " from " + url
    );
  }

  const contentType = response.headers?.get?.("content-type") || "";
  if (
    contentType &&
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml+xml")
  ) {
    throw new Error(
      "Unexpected content type from " + url + ": " + contentType
    );
  }

  return response.text();
}

function replaceTemplate(value, now = new Date()) {
  return String(value || "")
    .replaceAll("{year}", String(now.getUTCFullYear()))
    .replaceAll(
      "{month}",
      String(now.getUTCMonth() + 1).padStart(2, "0")
    );
}

async function discoverAgencyJobs(
  source,
  { fetchFn = fetch, now = new Date() } = {}
) {
  const mode = source.discovery?.mode || "listing";
  const maxJobs = Math.max(
    1,
    Math.min(
      Number(source.discovery?.maxJobs) || DEFAULT_MAX_JOBS,
      100
    )
  );

  if (mode === "google") {
    const query = replaceTemplate(
      source.discovery?.query ||
        "site:" +
          new URL(source.url).hostname +
          " Tanzania jobs {year}",
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
  for (const script of $(
    'script[type="application/ld+json"]'
  ).toArray()) {
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
      // Ignore malformed structured data and use visible page facts.
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
  const match = cleanText(value).match(
    /\bexpir(?:es|ing)\s+in\s+(\d{1,3})\s+days?\b/i
  );
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

function locationFromContext(value) {
  const text = cleanText(value);
  const match = text.match(
    /(?:job\s+location|location|duty\s+station)\s*:?\s*(.+?)(?=\s+(?:employment\s+type|job\s+type|date\s+published|closing\s+date|deadline|posted|$))/i
  );
  return cleanText(match?.[1]);
}

function countryMatchesTanzania(value) {
  return /\btanzania\b|\bdar es salaam\b|\btanga\b|\barusha\b|\bdodoma\b|\bmwanza\b|\bzanzibar\b|\bkilimanjaro\b|\bmoshi\b|\bmara\b|\bmbeya\b|\bmorogoro\b|\bmtwara\b|\biringa\b|\bnjombe\b|\bkatavi\b|\brukwa\b|\bsongwe\b|\btabora\b|\bsingida\b|\bshinyanga\b|\bsimiyu\b|\bgeita\b|\bkagera\b|\bkigoma\b|\blindi\b|\bpwani\b|\bcoast region\b/i.test(
    cleanText(value)
  );
}

function normalizeTanzaniaLocation(value) {
  let location = cleanText(value);
  if (!location) return "";

  location = location
    .replace(/^tanzania\s*,\s*/i, "")
    .replace(/\s*,\s*tanzania$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!location || /^tanzania$/i.test(location)) return "Tanzania";
  return location + ", Tanzania";
}

function pageIsClosed(text) {
  return /(?:no longer accepting applications|job posting is no longer available|applications? (?:are )?closed|position (?:has been|is) filled|vacancy (?:has been|is) closed)/i.test(
    cleanText(text)
  );
}

const DESCRIPTION_SECTION_HEADING =
  /^(?:key\s+|main\s+|job\s+)?(?:responsibilit|duties|requirement|qualification|skills|experience|education|competenc|benefits|what\s+we\s+offer|remuneration|overview|position|role|summary|purpose|desirable|preferred|majukumu|sifa)/i;

const EMPLOYER_PAGE_START =
  /^(?:job\s+description|description|about\s+(?:the\s+)?(?:role|job|us|company)|key\s+responsibilit|responsibilit|duties|position\s+overview|overview|summary)\s*:?$/i;

// The description section of the employer's own vacancy page, if it has one.
function descriptionFromEmployerLines(lines = []) {
  const start = lines.findIndex(
    (line) => line.length <= 60 && EMPLOYER_PAGE_START.test(line)
  );
  if (start < 0) return "";
  return lines.slice(start).join("\n").slice(0, 12000);
}

// Keeps the description's own line and heading structure so the job page can
// present it in sections. Collection stops at the recruiter's application
// block or page furniture.
function descriptionFromPage($, source) {
  const linesOf = (element) =>
    htmlToLines(`<body>${$.html(element) || ""}</body>`);
  const selector = source.detail?.descriptionSelector;
  if (selector) {
    const lines = linesOf($(selector).first());
    if (lines.length) return lines.join("\n").slice(0, 12000);
  }

  const heading = $("h1, h2, h3, h4")
    .filter((_, element) =>
      /^(?:job\s+description|description|job\s+summary|position\s+summary)$/i.test(
        cleanText($(element).text())
      )
    )
    .first();

  if (heading.length) {
    const lines = [];
    let current = heading.next();
    while (current.length && lines.join(" ").length < 12000) {
      if (/^h[1-4]$/i.test(current[0]?.tagName || "")) {
        const title = cleanText(current.text());
        if (!DESCRIPTION_SECTION_HEADING.test(title)) break;
        lines.push(title);
      } else {
        lines.push(...linesOf(current));
      }
      current = current.next();
    }
    if (lines.length) return lines.join("\n");
  }

  const main = $("main, article").first();
  return linesOf(main.length ? main : $("body")).join("\n").slice(0, 12000);
}

function sourceIdFromUrl(value) {
  try {
    const url = new URL(value);
    const tail = url.pathname
      .split("/")
      .filter(Boolean)
      .slice(-2)
      .join("-");
    return tail || url.toString();
  } catch {
    return value;
  }
}

function stripDateSuffix(value) {
  return cleanText(value)
    .replace(
      new RegExp("\\s+(?:" + MONTHS + ")\\s+20\\d{2}$", "i"),
      ""
    )
    .replace(/\s*\(\s*\d+\s+posts?\s*\)\s*$/i, "")
    .trim();
}

function cleanPositionTitle(value) {
  return stripDateSuffix(value)
    .replace(/\s+vacanc(?:y|ies)(?:\s+in\s+.+)?$/i, "")
    .replace(/\s+job$/i, "")
    .replace(/^\s*(?:job|vacancy)\s*[:-]\s*/i, "")
    .trim();
}

function splitTitleAndCompany(rawTitle, explicitCompany, source) {
  let title = stripDateSuffix(rawTitle);
  let company = cleanText(explicitCompany);

  const atMatch = title.match(/^(.*?)\s+(?:job\s+)?at\s+(.+)$/i);
  if (atMatch) {
    const parsedTitle = cleanPositionTitle(atMatch[1]);
    const parsedCompany = stripDateSuffix(atMatch[2]);
    if (parsedTitle) title = parsedTitle;

    const recruiter = normalizeIdentity(source.recruiterName || source.name);
    if (
      !company ||
      normalizeIdentity(company) === recruiter
    ) {
      company = parsedCompany;
    }
  }

  title = cleanPositionTitle(title);
  company = stripDateSuffix(company);
  return { title, company };
}

function isEditorialJobTitle(value) {
  const title = cleanText(value);
  return (
    /^(?:\d+\s+)?(?:new\s+)?jobs?\s+(?:at|from|with)\b/i.test(title) ||
    /^(?:latest\s+)?(?:job|vacancy)\s+opportunities?\s+(?:at|from|with)\b/i.test(
      title
    ) ||
    /^vacancies?\s+(?:at|from|with)\b/i.test(title) ||
    /\bmultiple\s+(?:job\s+)?positions?\b/i.test(title)
  );
}

function applicationSectionHtml($) {
  const heading = $("h1, h2, h3, h4, h5, h6")
    .filter((_, element) =>
      /^(?:application\s+process|how\s+to\s+apply|application\s+instructions?|method\s+of\s+application|apply)$/i.test(
        cleanText($(element).text())
      )
    )
    .first();

  if (heading.length) {
    const parts = [];
    let current = heading.next();
    let guard = 0;
    while (
      current.length &&
      !/^h[1-6]$/i.test(current[0]?.tagName || "") &&
      guard < 20
    ) {
      parts.push($.html(current));
      current = current.next();
      guard += 1;
    }
    if (parts.length) return parts.join("\n");
  }

  const targeted = [];
  $("p, li, div").each((_, element) => {
    const text = cleanText($(element).text());
    if (
      text.length <= 1200 &&
      /(?:interested|qualified)\s+(?:candidates|applicants)|submit\s+(?:your\s+)?(?:cv|resume|application)|send\s+(?:your\s+)?(?:cv|resume|application)|email\s+(?:your\s+)?(?:cv|resume|application)|to\s+apply\b/i.test(
        text
      )
    ) {
      targeted.push($.html(element));
    }
  });
  return targeted.slice(0, 8).join("\n");
}

function mailtoFromEmail(email) {
  const value = cleanText(email).replace(/[),.;:]+$/, "");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? "mailto:" + value
    : null;
}

function extractDirectEmployerApplication(
  $,
  pageUrl,
  source,
  metadata
) {
  const sectionHtml = applicationSectionHtml($);
  const section = cheerio.load(sectionHtml || "");
  const sectionText = cleanText(section.text());

  let mailto = null;
  section('a[href^="mailto:" i]').each((_, element) => {
    if (mailto) return;
    const href = cleanText(section(element).attr("href"));
    if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/i.test(href)) {
      mailto = href;
    }
  });
  if (mailto) return mailto;

  const textEmail = sectionText.match(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
  )?.[0];
  const textMailto = mailtoFromEmail(textEmail);
  if (textMailto) return textMailto;

  const externalCandidates = [];
  section("a[href]").each((index, element) => {
    const raw = cleanText(section(element).attr("href"));
    if (!raw || /^mailto:/i.test(raw)) return;

    try {
      const url = new URL(raw, pageUrl).toString();
      if (!isSafePublicHttpUrl(url)) return;
      if (isSourceHost(url, source)) return;
      if (isBlockedApplicationHost(url)) return;

      const label = cleanText(section(element).text());
      let score = 10;
      if (/\bapply\b|\bapplication\b|\bcareer\b|\bvacanc/i.test(label)) {
        score += 40;
      }
      if (/submit|send|proceed|continue/i.test(sectionText)) score += 15;
      externalCandidates.push({ url, score, index });
    } catch {
      // Ignore malformed application links.
    }
  });

  const textUrls =
    sectionText.match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
  for (const raw of textUrls) {
    try {
      const url = raw.replace(/[),.;:]+$/, "");
      if (!isSafePublicHttpUrl(url)) continue;
      if (isSourceHost(url, source)) continue;
      if (isBlockedApplicationHost(url)) continue;
      externalCandidates.push({
        url,
        score: 25,
        index: externalCandidates.length + 100,
      });
    } catch {
      // Ignore malformed application URLs.
    }
  }

  externalCandidates.sort(
    (a, b) => b.score - a.score || a.index - b.index
  );
  if (externalCandidates[0]?.url) return externalCandidates[0].url;

  if (metadata?.applicationUrl) {
    if (metadata.applicationUrl.startsWith("mailto:")) {
      const address = decodeURIComponent(
        metadata.applicationUrl
          .slice("mailto:".length)
          .split("?")[0]
      );
      if (sectionText.includes(address)) return metadata.applicationUrl;
    } else if (
      isSafePublicHttpUrl(metadata.applicationUrl) &&
      !isSourceHost(metadata.applicationUrl, source) &&
      !isBlockedApplicationHost(metadata.applicationUrl)
    ) {
      return metadata.applicationUrl;
    }
  }

  return null;
}

async function parseAgencyDetail(
  discovery,
  source,
  { fetchFn = fetch, now = new Date(), render = null } = {}
) {
  const html = await fetchHtml(discovery.sourceUrl, fetchFn);
  const $ = cheerio.load(html || "");
  const bodyText = cleanText($("body").text());

  if (pageIsClosed(bodyText)) {
    return { job: null, reason: "closed" };
  }

  const posting = getJobPostingJson(html);
  const metadata = extractSourcePageMetadata(
    html,
    discovery.sourceUrl
  );

  const rawTitle =
    cleanText(posting?.title) ||
    cleanText(
      $(source.detail?.titleSelector || "h1")
        .first()
        .text()
    ) ||
    cleanText(
      $('meta[property="og:title"]').attr("content")
    );

  if (
    source.publishPolicy?.rejectEditorialTitles &&
    isEditorialJobTitle(rawTitle)
  ) {
    return { job: null, reason: "editorial-title" };
  }

  const explicitCompany =
    cleanText(posting?.hiringOrganization?.name) ||
    labeledValue($, [
      "Company",
      "Employer",
      "Organization",
      "Organisation",
    ]);

  const identity = splitTitleAndCompany(
    rawTitle,
    explicitCompany,
    source
  );

  const recruiterIdentity = normalizeIdentity(
    source.recruiterName || source.name
  );
  if (
    source.publishPolicy?.requireNamedEmployer &&
    (!identity.company ||
      normalizeIdentity(identity.company) === recruiterIdentity)
  ) {
    return { job: null, reason: "employer-missing" };
  }

  const explicitLocation =
    locationFromPosting(posting) ||
    labeledValue($, [
      "Location",
      "Job Location",
      "Duty Station",
    ]) ||
    locationFromContext(discovery.contextText);

  if (
    source.countryFilter === "Tanzania" &&
    (!explicitLocation ||
      !countryMatchesTanzania(explicitLocation))
  ) {
    return { job: null, reason: "country" };
  }

  const location =
    source.countryFilter === "Tanzania"
      ? normalizeTanzaniaLocation(explicitLocation)
      : cleanText(explicitLocation || source.defaultLocation);

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

  let deadline = deadlineText
    ? parseDeadline(deadlineText)
    : null;
  if (!deadline) {
    deadline = relativeDeadline(discovery.contextText, now);
  }

  if (source.requireDeadline !== false && !deadline) {
    return { job: null, reason: "deadline-missing" };
  }

  if (deadline && deadline.getTime() < now.getTime()) {
    return { job: null, reason: "expired" };
  }

  const applicationUrl = source.publishPolicy
    ?.requireDirectEmployerApplication
    ? extractDirectEmployerApplication(
        $,
        discovery.sourceUrl,
        source,
        metadata
      )
    : metadata.applicationUrl ||
      (source.detailPageIsApplication
        ? discovery.sourceUrl
        : null);

  if (
    source.publishPolicy?.requireDirectEmployerApplication &&
    !applicationUrl
  ) {
    return { job: null, reason: "application-missing" };
  }

  // Follow the employer's own application link: it must still show this
  // vacancy, and the facts it states outrank the recruiter's copy.
  let official = {};
  let employerDescription = "";
  let finalApplicationUrl = applicationUrl;
  const reviewReasons = [];
  if (applicationUrl && !applicationUrl.startsWith("mailto:")) {
    const employerPage = await inspectEmployerPage(applicationUrl, {
      title: identity.title,
      fetchFn,
      render,
    });
    if (employerPage.status === "ok") {
      if (pageIsClosed(employerPage.lines.join(" "))) {
        return { job: null, reason: "closed" };
      }
      official = employerPage.facts;
      employerDescription = descriptionFromEmployerLines(employerPage.lines);
      // Send candidates straight to where the employer takes applications,
      // not to a second description page.
      finalApplicationUrl = employerPage.applyUrl || applicationUrl;
    } else {
      reviewReasons.push(
        "the employer application link did not show this vacancy"
      );
    }
  }

  if (official.location && source.countryFilter === "Tanzania") {
    if (!countryMatchesTanzania(official.location)) {
      return { job: null, reason: "country" };
    }
  }
  const finalLocation = official.location
    ? source.countryFilter === "Tanzania"
      ? normalizeTanzaniaLocation(official.location)
      : cleanText(official.location)
    : location;

  if (!deadline && official.deadline) {
    deadline = parseDeadline(official.deadline);
    if (deadline && deadline.getTime() < now.getTime()) {
      return { job: null, reason: "expired" };
    }
  }

  const recruiterDescription = posting?.description
    ? htmlToText(posting.description)
    : descriptionFromPage($, source);
  // Prefer the employer's own, usually fuller, description.
  const description =
    employerDescription.length > recruiterDescription.length
      ? employerDescription
      : recruiterDescription;

  if (
    !identity.title ||
    identity.title.length < 3 ||
    !description ||
    description.length < 20
  ) {
    return { job: null, reason: "incomplete" };
  }

  const rawJob = {
    sourceId:
      cleanText(posting?.identifier?.value) ||
      sourceIdFromUrl(discovery.sourceUrl),
    title: identity.title,
    company: identity.company,
    location: finalLocation,
    description,
    experience: official.experience
      ? `Experience: ${official.experience}`
      : "",
    reviewReasons,
    deadline: deadline ? deadline.toISOString() : null,
    type: mapEmploymentType(
      official.employmentType ||
        posting?.employmentType ||
        labeledValue($, [
          "Job Type",
          "Employment Type",
          "Type",
        ])
    ),
    sourceUrl: discovery.sourceUrl,
    applicationUrl: finalApplicationUrl,
    companyLogo: source.publishPolicy?.hideSourceBranding
      ? null
      : metadata.companyLogo,
    representativeImage: source.publishPolicy?.hideSourceBranding
      ? null
      : metadata.representativeImage,
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

  const count = Math.max(
    1,
    Math.min(limit, values.length || 1)
  );
  await Promise.all(
    Array.from({ length: count }, () => worker())
  );
  return output;
}

async function collectVerifiedAgencyJobs(
  source,
  {
    fetchFn = fetch,
    now = new Date(),
    render = null,
  } = {}
) {
  if (!source?.id || !source?.url) {
    throw new Error(
      "Verified agency source configuration is incomplete."
    );
  }

  const discoveries = await discoverAgencyJobs(source, {
    fetchFn,
    now,
  });
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
    employerMissing: 0,
    applicationMissing: 0,
    editorialTitle: 0,
    incomplete: 0,
    failed: 0,
  };

  const results = await mapWithConcurrency(
    discoveries,
    Math.max(
      1,
      Math.min(
        Number(source.discovery?.concurrency) || 5,
        8
      )
    ),
    async (discovery) => {
      try {
        const result = await parseAgencyDetail(
          discovery,
          source,
          { fetchFn, now, render }
        );
        if (!result.job) {
          if (result.reason === "expired") counters.expired += 1;
          else if (result.reason === "closed") counters.closed += 1;
          else if (result.reason === "country") counters.country += 1;
          else if (result.reason === "deadline-missing")
            counters.deadlineMissing += 1;
          else if (result.reason === "employer-missing")
            counters.employerMissing += 1;
          else if (result.reason === "application-missing")
            counters.applicationMissing += 1;
          else if (result.reason === "editorial-title")
            counters.editorialTitle += 1;
          else counters.incomplete += 1;
        }
        return result.job;
      } catch (error) {
        counters.failed += 1;
        console.warn(
          source.name +
            ": could not verify " +
            discovery.sourceUrl +
            ": " +
            error.message
        );
        return null;
      }
    }
  );

  const jobs = results.filter(Boolean);
  const allFailed =
    discoveries.length > 0 &&
    counters.failed === discoveries.length;
  const cleanEmptySnapshot =
    jobs.length === 0 && counters.failed === 0;

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
      rejectedUnnamedEmployer: counters.employerMissing,
      rejectedRecruiterOnlyApplication:
        counters.applicationMissing,
      rejectedEditorialTitles: counters.editorialTitle,
      preserveExisting: allFailed,
      archiveEmptySnapshot: cleanEmptySnapshot,
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
  extractDirectEmployerApplication,
  getJobPostingJson,
  isEditorialJobTitle,
  mapEmploymentType,
  normalizeTanzaniaLocation,
  pageIsClosed,
  parseAgencyDetail,
  relativeDeadline,
  splitTitleAndCompany,
};
