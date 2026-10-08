const catalog = require("../config/source-catalog.json");
const bankCatalog = require("../config/bank-source-catalog.json");
const { SCRAPER_USER_AGENT } = require("./runtime-config");
const { cleanText, mapEmploymentType } = require("./jobs");

// Source learning: every discovery lead (a vacancy seen on a secondary job
// board) teaches Daraja which official employer pages and applicant systems
// are active in Tanzania. Leads are never publication evidence on their own
// (docs/JOB-SOURCE-POLICY.md); this module recognises the official system a
// lead points to, verifies postings through that system's public API where
// one exists, and reports which employers Daraja should be collecting from.

const OFFICIAL_TIMEOUT_MS = 20000;

// Known applicant-tracking systems. `api` marks systems with a stable public
// posting API that Daraja can verify against without rendering pages.
const ATS_PATTERNS = [
  { kind: "smartrecruiters", api: true, host: /(^|\.)smartrecruiters\.com$/ },
  { kind: "greenhouse", api: true, host: /(^|\.)greenhouse\.io$/ },
  { kind: "lever", api: true, host: /(^|\.)lever\.co$/ },
  { kind: "workday", api: false, host: /(^|\.)myworkdayjobs\.com$/ },
  { kind: "oracle-hcm", api: false, host: /\.oraclecloud\.com$/ },
  { kind: "successfactors", api: false, host: /(^|\.)(successfactors\.(com|eu)|sapsf\.(com|eu))$/ },
  { kind: "zoho-recruit", api: false, host: /(^|\.)zohorecruit\.(com|eu|in)$/ },
  { kind: "bamboohr", api: false, host: /(^|\.)bamboohr\.com$/ },
  { kind: "workable", api: false, host: /(^|\.)workable\.com$/ },
  { kind: "recruitee", api: false, host: /(^|\.)recruitee\.com$/ },
  { kind: "teamtailor", api: false, host: /(^|\.)teamtailor\.com$/ },
  { kind: "niajiri", api: false, host: /(^|\.)niajiri\.africa$/ },
  { kind: "ajira-portal", api: false, host: /(^|\.)ajira\.go\.tz$/ },
];

function hostOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

// Self-hosted portals are recognised by their URL shape instead of host.
const SELF_HOSTED_PATTERNS = [
  // Frappe HR / ERPNext job portal: /jobs/<company>/<opening>
  { kind: "frappe-hrms", api: false, path: /^\/jobs\/[a-z0-9_]+\/[^/]+\/?$/i },
];

function detectAts(url) {
  const host = hostOf(url);
  if (!host) return null;
  const match = ATS_PATTERNS.find((pattern) => pattern.host.test(host));
  if (match) return { kind: match.kind, api: match.api, host };
  const path = new URL(url).pathname;
  const selfHosted = SELF_HOSTED_PATTERNS.find((pattern) => pattern.path.test(path));
  return selfHosted ? { kind: selfHosted.kind, api: false, host } : null;
}

function normalizeName(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(
      /\b(?:ltd|limited|plc|inc|llc|company|co|group|tanzania|tz|careers?|jobs?|official|the|of|and|&)\b/g,
      " "
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Words that say what kind of organisation an employer is, not which one.
// A name made only of these ("Bank", "International Hospital") never matches.
const GENERIC_NAME_WORDS = new Set([
  "bank", "microfinance", "finance", "financial", "insurance", "hotel", "resort",
  "school", "schools", "university", "college", "hospital", "health", "foundation",
  "international", "services", "service", "africa", "east", "holdings", "industries",
  "enterprises", "consulting", "corporation", "mining", "energy", "cement", "credit",
  "gold", "house", "platform", "products", "animal", "company",
]);

function catalogSources() {
  const sources = new Map();
  for (const source of [...catalog.sources, ...bankCatalog.sources]) {
    sources.set(source.id, source);
  }
  return [...sources.values()];
}

// Matches a lead to a catalog source by official host first, then by
// employer name. Name matching needs every significant word of the shorter
// name to appear in the longer one, so "Equity Bank" matches
// "Equity Bank Tanzania Careers" but "Bank" alone matches nothing.
function matchCatalogSource(lead, sources = catalogSources()) {
  const leadHost = hostOf(lead.officialUrl);
  if (leadHost && !detectAts(lead.officialUrl)) {
    const byHost = sources.find((source) => {
      const sourceHost = hostOf(source.url);
      return sourceHost && (leadHost === sourceHost || leadHost.endsWith(`.${sourceHost}`));
    });
    if (byHost) return byHost;
  }

  const leadName = normalizeName(lead.employer);
  if (leadName.length < 3) return null;
  const distinctive = (name) =>
    new Set(name.split(" ").filter((word) => word && !GENERIC_NAME_WORDS.has(word)));
  const leadWords = distinctive(leadName);
  if (!leadWords.size) return null;
  return (
    sources.find((source) => {
      const sourceWords = distinctive(normalizeName(source.name));
      if (!sourceWords.size) return false;
      const [shorter, longer] =
        leadWords.size <= sourceWords.size ? [leadWords, sourceWords] : [sourceWords, leadWords];
      return [...shorter].every((word) => longer.has(word));
    }) || null
  );
}

// True when an enabled catalog source already collects the lead's official
// page (for example a SmartRecruiters company board Daraja reads directly).
// Such leads add nothing new and would only create duplicates.
function collectedByEnabledSource(lead, sources = catalogSources()) {
  const leadUrl = String(lead.officialUrl || "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "");
  if (!leadUrl) return null;
  return (
    sources.find((source) => {
      if (!source.enabled || !source.url) return false;
      const sourceUrl = source.url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
      return sourceUrl.includes("/") && leadUrl.startsWith(`${sourceUrl}/`);
    }) || null
  );
}

function htmlToText(value) {
  return cleanText(String(value || "").replace(/<[^>]+>/g, " "));
}

async function fetchJson(url, fetchFn) {
  const response = await fetchFn(url, {
    headers: { Accept: "application/json", "User-Agent": SCRAPER_USER_AGENT },
    signal: AbortSignal.timeout(OFFICIAL_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchSmartRecruitersPosting(url, fetchFn) {
  const parsed = new URL(url);
  const [company, slug] = parsed.pathname.split("/").filter(Boolean);
  const postingId = slug?.match(/^(\d{6,})/)?.[1];
  if (!company || !postingId) return null;
  const posting = await fetchJson(
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings/${postingId}`,
    fetchFn
  );
  if (!posting?.active || posting.location?.country?.toLowerCase() !== "tz") return null;
  const sections = posting.jobAd?.sections || {};
  return {
    sourceId: `smartrecruiters-${posting.id}`,
    title: posting.name,
    company: cleanText(posting.company?.name),
    location: posting.location?.fullLocation || "Tanzania",
    description: [sections.jobDescription?.text, sections.qualifications?.text, sections.additionalInformation?.text]
      .map(htmlToText)
      .filter(Boolean)
      .join("\n\n"),
    type: mapEmploymentType(posting.typeOfEmployment?.label),
    sourceUrl: posting.postingUrl || url,
    applicationUrl: posting.applyUrl || posting.postingUrl || url,
    companyLogo: cleanText(posting.company?.logoUrl) || null,
  };
}

async function fetchGreenhousePosting(url, fetchFn) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const jobsIndex = parts.indexOf("jobs");
  const board = jobsIndex > 0 ? parts[jobsIndex - 1] : parsed.searchParams.get("for");
  const jobId = parts[jobsIndex + 1] || parsed.searchParams.get("gh_jid");
  if (!board || !/^\d+$/.test(jobId || "")) return null;
  const posting = await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs/${jobId}`,
    fetchFn
  );
  const location = cleanText(posting?.location?.name);
  if (!posting?.title || !/tanzania|dar es salaam|dodoma|arusha|mwanza|zanzibar/i.test(location)) {
    return null;
  }
  return {
    sourceId: `greenhouse-${board}-${posting.id}`,
    title: posting.title,
    company: cleanText(posting.company_name),
    location,
    description: htmlToText(
      String(posting.content || "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
    ),
    sourceUrl: posting.absolute_url || url,
    applicationUrl: posting.absolute_url || url,
  };
}

async function fetchLeverPosting(url, fetchFn) {
  const [company, postingId] = new URL(url).pathname.split("/").filter(Boolean);
  if (!company || !/^[0-9a-f-]{36}$/i.test(postingId || "")) return null;
  const posting = await fetchJson(
    `https://api.lever.co/v0/postings/${encodeURIComponent(company)}/${postingId}`,
    fetchFn
  );
  const location = cleanText(posting?.categories?.location);
  if (!posting?.text || !/tanzania|dar es salaam|dodoma|arusha|mwanza|zanzibar/i.test(location)) {
    return null;
  }
  return {
    sourceId: `lever-${company}-${posting.id}`,
    title: posting.text,
    company: "",
    location,
    description: cleanText(posting.descriptionPlain),
    type: mapEmploymentType(posting.categories?.commitment),
    sourceUrl: posting.hostedUrl || url,
    applicationUrl: posting.applyUrl || posting.hostedUrl || url,
  };
}

const ATS_FETCHERS = {
  smartrecruiters: fetchSmartRecruitersPosting,
  greenhouse: fetchGreenhousePosting,
  lever: fetchLeverPosting,
};

// Verifies a lead's official link through the applicant system's public
// posting API. Returns a job only when the system confirms an active
// Tanzania posting; otherwise null (the caller decides whether to hold the
// lead for review).
async function fetchAtsPosting(url, fetchFn = fetch) {
  const ats = detectAts(url);
  const fetcher = ats && ATS_FETCHERS[ats.kind];
  if (!fetcher) return null;
  try {
    return await fetcher(url, fetchFn);
  } catch {
    return null;
  }
}

function createLearningLog() {
  const employers = new Map();
  return {
    record(lead, outcome) {
      const key = normalizeName(lead.employer) || hostOf(lead.officialUrl) || "unknown";
      const entry = employers.get(key) || {
        employer: cleanText(lead.employer) || "Unknown employer",
        leads: 0,
        verified: 0,
        held: 0,
        officialHosts: new Set(),
        ats: new Set(),
      };
      entry.leads += 1;
      if (outcome === "verified") entry.verified += 1;
      else if (outcome === "held") entry.held += 1;
      const host = hostOf(lead.officialUrl);
      if (host) entry.officialHosts.add(host);
      const ats = detectAts(lead.officialUrl);
      if (ats) entry.ats.add(ats.kind);
      employers.set(key, entry);
    },
    // Summarises what this run learned: employers seen on discovery boards,
    // the official systems they use and whether Daraja's catalog already
    // collects from them. `suggested` lists employers worth enabling next.
    summary(sources = catalogSources()) {
      const rows = [...employers.values()].map((entry) => {
        const match = matchCatalogSource(
          { employer: entry.employer, officialUrl: [...entry.officialHosts][0] ? `https://${[...entry.officialHosts][0]}/` : "" },
          sources
        );
        return {
          employer: entry.employer,
          leads: entry.leads,
          verified: entry.verified,
          held: entry.held,
          officialHosts: [...entry.officialHosts],
          ats: [...entry.ats],
          catalogSource: match ? { id: match.id, enabled: match.enabled === true } : null,
        };
      });
      rows.sort((a, b) => b.leads - a.leads || a.employer.localeCompare(b.employer));
      return {
        employers: rows.length,
        notCollected: rows.filter((row) => !row.catalogSource?.enabled).length,
        suggested: rows
          .filter((row) => !row.catalogSource?.enabled && (row.officialHosts.length || row.ats.length))
          .slice(0, 25),
        unknownEmployers: rows
          .filter((row) => !row.catalogSource)
          .map((row) => row.employer)
          .slice(0, 50),
      };
    },
  };
}

module.exports = {
  ATS_PATTERNS,
  catalogSources,
  collectedByEnabledSource,
  createLearningLog,
  detectAts,
  fetchAtsPosting,
  matchCatalogSource,
  normalizeName,
};
