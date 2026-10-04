const cheerio = require("cheerio");
const {
  extractSourceMedia,
  isSafePublicHttpUrl,
} = require("./source-page");

const GOOGLE_SEARCH_URL = "https://www.google.com/search";
const SEARCH_TIMEOUT_MS = 12000;
const VERIFY_TIMEOUT_MS = 12000;

const BLOCKED_DISCOVERY_HOSTS = [
  "google.com",
  "googleusercontent.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "wikipedia.org",
  "ajiraweb.com",
  "portal.ajira.go.tz",
  "ajira.daraja.co.tz",
  "jobs.smartrecruiters.com",
  "smartrecruiters.com",
  "myworkdayjobs.com",
  "workdayjobs.com",
  "greenhouse.io",
  "lever.co",
  "taleo.net",
  "oraclecloud.com",
  "successfactors.com",
  "indeed.com",
  "glassdoor.com",
  "brightermonday.co.ke",
  "fuzu.com",
];

const COMMON_EMPLOYER_TOKENS = new Set([
  "the",
  "and",
  "for",
  "of",
  "in",
  "at",
  "limited",
  "ltd",
  "plc",
  "company",
  "corporation",
  "group",
  "holdings",
  "organization",
  "organisation",
  "tanzania",
  "tanzanian",
  "united",
  "republic",
]);

function normalizeEmployerName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function employerTokens(company) {
  const normalized = normalizeEmployerName(company);
  const acronymMatches =
    String(company || "").match(/\(([A-Z][A-Z0-9]{2,})\)/g) || [];
  const acronyms = acronymMatches
    .map((value) => value.replace(/[()]/g, "").toLowerCase())
    .filter(Boolean);

  const tokens = normalized
    .split(" ")
    .filter(
      (token) => token.length >= 3 && !COMMON_EMPLOYER_TOKENS.has(token)
    );

  return [...new Set([...acronyms, ...tokens])];
}

function hostIsBlocked(hostname, extraBlockedHosts = []) {
  const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
  return [...BLOCKED_DISCOVERY_HOSTS, ...extraBlockedHosts].some((blocked) => {
    const expected = String(blocked || "").toLowerCase().replace(/^www\./, "");
    return host === expected || host.endsWith("." + expected);
  });
}

function rootUrl(value, extraBlockedHosts = []) {
  try {
    const url = new URL(value);
    if (!isSafePublicHttpUrl(url.toString())) return null;
    if (hostIsBlocked(url.hostname, extraBlockedHosts)) return null;
    return url.protocol + "//" + url.host + "/";
  } catch {
    return null;
  }
}

function siteFromMailto(value, extraBlockedHosts = []) {
  try {
    const url = new URL(value);
    if (url.protocol !== "mailto:") return null;
    const email = decodeURIComponent(url.pathname || "").trim();
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain || hostIsBlocked(domain, extraBlockedHosts)) return null;
    return "https://" + domain + "/";
  } catch {
    return null;
  }
}

function candidateSitesFromJob(job, { blockedHosts = [] } = {}) {
  const candidates = [];

  if (job?.sourceUrl) {
    const candidate = rootUrl(job.sourceUrl, blockedHosts);
    if (candidate) candidates.push(candidate);
  }

  if (job?.applicationUrl) {
    const candidate = job.applicationUrl.startsWith("mailto:")
      ? siteFromMailto(job.applicationUrl, blockedHosts)
      : rootUrl(job.applicationUrl, blockedHosts);
    if (candidate) candidates.push(candidate);
  }

  return [...new Set(candidates)];
}

function googleResultUrl(href) {
  const value = String(href || "").trim();
  if (!value) return null;

  try {
    if (value.startsWith("/url?")) {
      const parsed = new URL(value, "https://www.google.com");
      const target =
        parsed.searchParams.get("q") || parsed.searchParams.get("url");
      return target && isSafePublicHttpUrl(target) ? target : null;
    }

    if (value.startsWith("http://") || value.startsWith("https://")) {
      return isSafePublicHttpUrl(value) ? value : null;
    }
  } catch {
    return null;
  }

  return null;
}

function parseGoogleOfficialSiteCandidates(html) {
  const $ = cheerio.load(html || "");
  const results = [];

  $("a[href]").each((_, element) => {
    const target = googleResultUrl($(element).attr("href"));
    if (!target) return;

    try {
      const url = new URL(target);
      if (hostIsBlocked(url.hostname)) return;
      const root = url.protocol + "//" + url.host + "/";
      if (!results.includes(root)) results.push(root);
    } catch {
      // Ignore malformed search results.
    }
  });

  return results;
}

async function fetchHtml(url, fetchFn, timeoutMs) {
  const response = await fetchFn(url, {
    redirect: "follow",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en",
      "User-Agent": "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
    },
    signal: AbortSignal.timeout(timeoutMs || VERIFY_TIMEOUT_MS),
  });

  if (!response?.ok) return null;
  const contentType = response.headers?.get?.("content-type") || "";
  if (
    contentType &&
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml+xml")
  ) {
    return null;
  }

  return response.text();
}

function employerMatchScore(html, company, website) {
  const $ = cheerio.load(html || "");
  $("script, style, noscript").remove();

  const haystack = normalizeEmployerName(
    [
      $("title").first().text(),
      $('meta[name="description"]').attr("content"),
      $('meta[property="og:site_name"]').attr("content"),
      $('meta[property="og:title"]').attr("content"),
      $("body").text().slice(0, 20000),
      website,
    ]
      .filter(Boolean)
      .join(" ")
  );

  const tokens = employerTokens(company);
  if (!tokens.length) return 0;

  let matched = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) matched += 1;
  }

  if (matched === 0) return 0;
  if (tokens.length === 1) return matched === 1 ? 2 : 0;
  return matched >= Math.min(2, tokens.length) ? matched + 1 : 1;
}

async function verifiedMediaFromWebsite(
  website,
  company,
  { fetchFn = fetch } = {}
) {
  try {
    const html = await fetchHtml(website, fetchFn, VERIFY_TIMEOUT_MS);
    if (!html) return null;

    const score = employerMatchScore(html, company, website);
    if (score < 2) return null;

    const media = extractSourceMedia(html, website);
    if (!media.companyLogo && !media.representativeImage) return null;

    return {
      website,
      companyLogo: media.companyLogo,
      representativeImage: media.representativeImage,
      confidence: score,
    };
  } catch {
    return null;
  }
}

async function searchGoogleOfficialWebsite(
  company,
  { fetchFn = fetch } = {}
) {
  const query = company + " official website Tanzania";
  const url =
    GOOGLE_SEARCH_URL +
    "?hl=en&num=5&q=" +
    encodeURIComponent(query);

  try {
    const html = await fetchHtml(url, fetchFn, SEARCH_TIMEOUT_MS);
    return html ? parseGoogleOfficialSiteCandidates(html) : [];
  } catch {
    return [];
  }
}

async function reuseLearnedMedia(prisma, company) {
  if (typeof prisma?.job?.findFirst !== "function") return null;

  try {
    return await prisma.job.findFirst({
      where: {
        company: {
          equals: company,
          mode: "insensitive",
        },
        OR: [
          { companyLogo: { not: null } },
          { representativeImage: { not: null } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        companyLogo: true,
        representativeImage: true,
      },
    });
  } catch {
    return null;
  }
}

function propagateMedia(jobs, media) {
  if (!media) return;
  for (const job of jobs) {
    job.companyLogo = job.companyLogo || media.companyLogo || null;
    job.representativeImage =
      job.representativeImage || media.representativeImage || null;
  }
}

async function enrichJobsWithOfficialEmployerMedia(
  jobs,
  {
    source = "",
    prisma = null,
    fetchFn = fetch,
    searchBudget = { remaining: 8 },
    blockedHosts = [],
  } = {}
) {
  if (!Array.isArray(jobs) || jobs.length === 0) return jobs;

  const groups = new Map();
  for (const job of jobs) {
    const key = normalizeEmployerName(job?.company);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(job);
  }

  for (const group of groups.values()) {
    const company = group[0]?.company;
    if (!company) continue;

    const current = group.find(
      (job) => job.companyLogo || job.representativeImage
    );
    if (current) {
      propagateMedia(group, current);
      continue;
    }

    const learned = await reuseLearnedMedia(prisma, company);
    if (learned?.companyLogo || learned?.representativeImage) {
      propagateMedia(group, learned);
      continue;
    }

    if (source === "ajira") continue;

    const directCandidates = [
      ...new Set(
        group.flatMap((job) =>
          candidateSitesFromJob(job, { blockedHosts })
        )
      ),
    ];

    let resolved = null;
    for (const website of directCandidates.slice(0, 3)) {
      resolved = await verifiedMediaFromWebsite(website, company, { fetchFn });
      if (resolved?.companyLogo || resolved?.representativeImage) break;
    }

    if (!resolved && searchBudget && Number(searchBudget.remaining) > 0) {
      searchBudget.remaining -= 1;
      const searched = await searchGoogleOfficialWebsite(company, { fetchFn });
      for (const website of searched.slice(0, 3)) {
        resolved = await verifiedMediaFromWebsite(website, company, {
          fetchFn,
        });
        if (resolved?.companyLogo || resolved?.representativeImage) break;
      }
    }

    if (resolved) propagateMedia(group, resolved);
  }

  return jobs;
}

module.exports = {
  candidateSitesFromJob,
  employerMatchScore,
  employerTokens,
  enrichJobsWithOfficialEmployerMedia,
  googleResultUrl,
  normalizeEmployerName,
  parseGoogleOfficialSiteCandidates,
  searchGoogleOfficialWebsite,
  verifiedMediaFromWebsite,
};
