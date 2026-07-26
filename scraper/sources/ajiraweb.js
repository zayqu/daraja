const cheerio = require("cheerio");

const { cleanText, deduplicateJobs } = require("../lib/jobs");

const AJIRAWEB_FEED_URL = "https://ajiraweb.com/feed/";
const REQUEST_TIMEOUT_MS = 60000;

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

function parseAjiraWebFeed(xml) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const rawJobs = [];

  $("item").each((_, item) => {
    const node = $(item);
    const categories = node.find("category").map((__, category) => cleanText($(category).text())).get();
    if (!categories.some((category) => /^jobs? in tanzania$/i.test(category))) return;

    const title = cleanText(node.find("title").first().text());
    const articleUrl = cleanText(node.find("link").first().text());
    const content = node.find("content\\:encoded").first().text() || node.find("description").first().text();
    if (!title || !articleUrl) return;

    const plainDescription = cleanText(cheerio.load(content || "").text());
    rawJobs.push({
      sourceId: cleanText(node.find("guid").first().text()) || articleUrl,
      title,
      company: extractCompany(title, categories),
      description: plainDescription.slice(0, 5000),
      deadline: extractDeadline(plainDescription),
      sourceUrl: extractOfficialUrl(content, articleUrl),
    });
  });

  return deduplicateJobs(rawJobs, {
    source: "ajiraweb",
    baseUrl: AJIRAWEB_FEED_URL,
    location: "Tanzania",
    description: "Visit the source website for full vacancy details and application instructions.",
  });
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

  const jobs = parseAjiraWebFeed(await response.text());
  console.log(`AjiraWeb feed: ${jobs.length} Tanzania vacancies`);
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
  parseAjiraWebFeed,
};
