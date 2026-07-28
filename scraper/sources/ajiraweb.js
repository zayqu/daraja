const cheerio = require("cheerio");

const { buildEmailApplicationUrl } = require("../lib/applications");
const { cleanText, deduplicateJobs } = require("../lib/jobs");

const AJIRAWEB_FEED_URL = "https://ajiraweb.com/feed/";
const REQUEST_TIMEOUT_MS = 60000;
const OFFICIAL_PAGE_TIMEOUT_MS = 20000;

function extractDeadline(text) {
  const value = cleanText(text);
  const patterns = [
    /(?:application\s+deadline|closing\s+date|deadline)\s*:?\s*(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})/i,
    /(?:application\s+deadline|closing\s+date|deadline)\s*:?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
    /(?:application\s+deadline|closing\s+date|deadline)\s*:?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i,
  ];
  return patterns.map((pattern) => value.match(pattern)?.[1]).find(Boolean) || null;
}

function extractCompany(title, categories = []) {
  const atCompany = cleanText(title).match(/\bat\s+(.+?)(?:\s*[|–—-]\s*|\s+\d{4}$|$)/i)?.[1];
  if (atCompany) return cleanText(atCompany);

  const vacancyCompany = cleanText(title)
    .replace(/\b(vacancies|vacancy|careers?|jobs?)\b.*$/i, "")
    .trim();
  const category = categories.find(
    (value) => !/^jobs? in tanzania$/i.test(value) && !/^latest jobs$/i.test(value)
  );
  return vacancyCompany.length >= 3 ? vacancyCompany : category || "Employer in Tanzania";
}

function extractOfficialUrl(html, articleUrl) {
  const $ = cheerio.load(html || "");
  const articleHost = new URL(articleUrl).hostname.replace(/^www\./, "");
  const blockedHosts = [
    articleHost,
    "facebook.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "linkedin.com",
    "youtube.com",
    "whatsapp.com",
  ];

  const candidates = $("a[href]")
    .map((_, link) => $(link).attr("href"))
    .get()
    .filter(Boolean);

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate, articleUrl);
      const host = url.hostname.replace(/^www\./, "");
      if (
        ["http:", "https:"].includes(url.protocol) &&
        !blockedHosts.some((blocked) => host === blocked || host.endsWith(`.${blocked}`)) &&
        !/google\.com|doubleclick\.net|googlesyndication\.com/.test(host)
      ) {
        return url.toString();
      }
    } catch {
      // Ignore malformed links and keep looking.
    }
  }
  return articleUrl;
}

function getOfficialLinks(html, articleUrl) {
  const $ = cheerio.load(html || "");
  const articleHost = new URL(articleUrl).hostname.replace(/^www\./, "");
  return $("a[href]")
    .map((_, link) => $(link).attr("href"))
    .get()
    .filter(Boolean)
    .map((href) => {
      try {
        return new URL(href, articleUrl);
      } catch {
        return null;
      }
    })
    .filter(
      (url) =>
        url &&
        ["http:", "https:"].includes(url.protocol) &&
        url.hostname.replace(/^www\./, "") !== articleHost &&
        !/(facebook|twitter|instagram|linkedin|youtube|whatsapp|google|doubleclick)/i.test(
          url.hostname
        )
    )
    .map((url) => url.toString());
}

function discoverAjiraWebLinks(xml) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const discoveries = [];

  $("item").each((_, item) => {
    const node = $(item);
    const categories = node.find("category").map((__, category) => cleanText($(category).text())).get();
    if (!categories.some((category) => /^jobs? in tanzania$/i.test(category))) return;

    const title = cleanText(node.find("title").first().text());
    const articleUrl = cleanText(node.find("link").first().text());
    const content = node.find("content\\:encoded").first().text() || node.find("description").first().text();
    if (!title || !articleUrl) return;

    for (const sourceUrl of getOfficialLinks(content, articleUrl)) {
      discoveries.push({
        articleTitle: title,
        articleUrl,
        sourceUrl,
      });
    }
  });

  return discoveries;
}

function htmlToText(value) {
  const $ = cheerio.load(value || "");
  $("script, style").remove();
  return cleanText($.text());
}

function getLabeledValue($, label) {
  const pattern = new RegExp(`^${label}\\s*:`, "i");
  for (const element of $("p, li").toArray()) {
    const text = cleanText($(element).text());
    if (pattern.test(text)) return text.replace(pattern, "").trim();
  }
  return "";
}

function extractEmailApplicationJobs(articleTitle, articleUrl, html) {
  const $ = cheerio.load(html || "");
  const emailHref = $('a[href^="mailto:"]').first().attr("href") || "";
  let employerSubject = "";
  try {
    employerSubject = new URL(emailHref).searchParams.get("subject") || "";
  } catch {
    // A plain email link is still valid.
  }
  employerSubject =
    employerSubject ||
    getLabeledValue($, "Email Subject") ||
    getLabeledValue($, "Subject Line") ||
    getLabeledValue($, "Subject");

  const email = emailHref.replace(/^mailto:/i, "").split("?")[0].trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return [];

  const company =
    getLabeledValue($, "Organization") ||
    extractCompany(articleTitle);
  const location = getLabeledValue($, "Location") || "Tanzania";
  const deadline =
    getLabeledValue($, "Application Deadline") ||
    extractDeadline(htmlToText(html));
  const jobs = [];

  for (const heading of $("h3").toArray()) {
    const headingText = cleanText($(heading).text());
    if (!/^\d+\s*[.)-]\s*/.test(headingText)) continue;
    const title = headingText.replace(/^\d+\s*[.)-]\s*/, "").trim();
    const details = [];
    let current = $(heading).next();
    while (current.length && !/^h[1-3]$/i.test(current[0].tagName)) {
      const text = cleanText(current.text());
      if (text) details.push(text);
      current = current.next();
    }
    const instructions = details.join("\n\n");

    jobs.push({
      sourceId: `email-${email.toLowerCase()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title,
      company,
      location,
      description: instructions,
      deadline,
      sourceUrl: buildEmailApplicationUrl({
        email,
        title,
        company,
        subject: employerSubject,
      }),
    });
  }

  if (jobs.length) return jobs;

  const availableLabel = $("strong")
    .filter((_, element) => /^Available Positions\s*:?$/i.test(cleanText($(element).text())))
    .first();
  const list = availableLabel.parent().next("ul, ol");
  return list
    .find("li")
    .map((_, item) => {
      const title = cleanText($(item).text());
      return {
        sourceId: `email-${email.toLowerCase()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title,
        company,
        location,
        description: `Apply for the ${title} position at ${company}.`,
        deadline,
        sourceUrl: buildEmailApplicationUrl({
          email,
          title,
          company,
          subject: employerSubject,
        }),
      };
    })
    .get()
    .filter((job) => job.title);
}

function parseEmailJobsFromFeed(xml) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const jobs = [];
  $("item").each((_, item) => {
    const node = $(item);
    const categories = node
      .find("category")
      .map((__, category) => cleanText($(category).text()))
      .get();
    if (!categories.some((category) => /^jobs? in tanzania$/i.test(category))) return;
    const articleTitle = cleanText(node.find("title").first().text());
    const articleUrl = cleanText(node.find("link").first().text());
    const content =
      node.find("content\\:encoded").first().text() ||
      node.find("description").first().text();
    jobs.push(...extractEmailApplicationJobs(articleTitle, articleUrl, content));
  });
  return jobs;
}

function mapEmploymentType(value) {
  const type = cleanText(value).toLowerCase();
  if (type.includes("part")) return "PART_TIME";
  if (type.includes("contract") || type.includes("temporary")) return "CONTRACT";
  if (type.includes("intern")) return "INTERNSHIP";
  return "FULL_TIME";
}

function getJobPostingJson(html) {
  const $ = cheerio.load(html || "");
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    try {
      const value = JSON.parse($(script).text());
      const candidates = Array.isArray(value) ? value : value["@graph"] || [value];
      const posting = candidates.find((item) => item?.["@type"] === "JobPosting");
      if (posting) return posting;
    } catch {
      // Ignore malformed structured data.
    }
  }
  return null;
}

async function fetchStandardBankJob(sourceUrl, fetchFn) {
  const url = new URL(sourceUrl);
  const jobId = url.searchParams.get("jobID");
  if (!jobId || !/^\d+$/.test(jobId)) return null;

  const apiUrl = `https://api.smartrecruiters.com/v1/companies/StandardBankGroup/postings/${jobId}`;
  const response = await fetchFn(apiUrl, {
    headers: { Accept: "application/json", "User-Agent": "DarajaJobsBot/1.0" },
    signal: AbortSignal.timeout(OFFICIAL_PAGE_TIMEOUT_MS),
  });
  if (!response.ok) return null;

  const posting = await response.json();
  if (!posting.active || posting.location?.country?.toLowerCase() !== "tz") return null;

  const sections = posting.jobAd?.sections || {};
  const description = [
    sections.jobDescription?.text,
    sections.qualifications?.text,
    sections.additionalInformation?.text,
  ]
    .map(htmlToText)
    .filter(Boolean)
    .join("\n\n");

  return {
    sourceId: `standardbank-${posting.id}`,
    title: posting.name,
    company: "Stanbic Bank Tanzania",
    location: posting.location?.fullLocation || "Tanzania",
    description,
    type: mapEmploymentType(posting.typeOfEmployment?.label),
    sourceUrl: posting.applyUrl || posting.postingUrl || url.toString(),
  };
}

async function fetchStructuredJob(sourceUrl, fetchFn) {
  const response = await fetchFn(sourceUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
    },
    signal: AbortSignal.timeout(OFFICIAL_PAGE_TIMEOUT_MS),
  });
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
    return null;
  }

  const posting = getJobPostingJson(await response.text());
  if (!posting?.title || !posting?.description) return null;

  const country =
    posting.jobLocation?.address?.addressCountry ||
    posting.applicantLocationRequirements?.name ||
    "";
  if (country && !/tanzania|\btz\b/i.test(String(country))) return null;

  const location = [
    posting.jobLocation?.address?.addressLocality,
    posting.jobLocation?.address?.addressRegion,
    country,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    sourceId: cleanText(posting.identifier?.value) || sourceUrl,
    title: cleanText(posting.title),
    company: cleanText(posting.hiringOrganization?.name) || "Employer in Tanzania",
    location: location || "Tanzania",
    description: htmlToText(posting.description),
    deadline: posting.validThrough || null,
    type: mapEmploymentType(posting.employmentType),
    sourceUrl,
  };
}

async function fetchOfficialJob(discovery, fetchFn = fetch) {
  const host = new URL(discovery.sourceUrl).hostname.replace(/^www\./, "");
  if (host === "standardbank.com") {
    return fetchStandardBankJob(discovery.sourceUrl, fetchFn);
  }
  return fetchStructuredJob(discovery.sourceUrl, fetchFn);
}

async function parseAjiraWebFeed(xml, { fetchFn = fetch } = {}) {
  const discoveries = discoverAjiraWebLinks(xml);
  const results = await Promise.allSettled(
    discoveries.map((discovery) => fetchOfficialJob(discovery, fetchFn))
  );
  let unresolved = 0;
  const rawJobs = results
    .map((result, index) => {
      if (result.status === "fulfilled") return result.value;
      unresolved += 1;
      console.warn(
        `Could not resolve official vacancy ${discoveries[index].sourceUrl}: ${result.reason.message}`
      );
      return null;
    })
    .filter(Boolean);
  rawJobs.push(...parseEmailJobsFromFeed(xml));

  const jobs = deduplicateJobs(rawJobs, {
    source: "ajiraweb",
    baseUrl: AJIRAWEB_FEED_URL,
    location: "Tanzania",
  });
  Object.defineProperty(jobs, "health", {
    enumerable: false,
    value: {
      discovered: discoveries.length,
      unresolved,
    },
  });
  return jobs;
}

async function collectAjiraWebJobs({
  fetchFn = fetch,
  signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS),
} = {}) {
  const response = await fetchFn(AJIRAWEB_FEED_URL, {
    headers: {
      Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
      "User-Agent": "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
    },
    signal,
  });
  if (!response.ok) throw new Error(`AjiraWeb feed returned HTTP ${response.status}.`);

  const jobs = await parseAjiraWebFeed(await response.text(), { fetchFn });
  console.log(`AjiraWeb discovery: ${jobs.length} verified official vacancies`);
  if (!jobs.length) {
    throw new Error("AjiraWeb produced zero valid Tanzania vacancies; database was not changed.");
  }
  return jobs;
}

module.exports = {
  AJIRAWEB_FEED_URL,
  collectAjiraWebJobs,
  extractCompany,
  extractDeadline,
  extractOfficialUrl,
  extractEmailApplicationJobs,
  discoverAjiraWebLinks,
  fetchOfficialJob,
  fetchStandardBankJob,
  getJobPostingJson,
  parseEmailJobsFromFeed,
  parseAjiraWebFeed,
};
