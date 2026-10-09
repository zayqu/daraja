const { SCRAPER_USER_AGENT } = require("../lib/runtime-config");
const { cleanText, deduplicateJobs, mapEmploymentType } = require("../lib/jobs");
const { htmlToText } = require("./standardbank");

const CRDB_ORIGIN = "https://careers.crdbbank.co.tz";
const CRDB_CAREERS_URL = CRDB_ORIGIN + "/jobs";
const CRDB_APPLY_URL = CRDB_ORIGIN + "/auth/login";
const CRDB_LOGO_URL = CRDB_ORIGIN + "/assets/svg/auth/crdb_logo_tagline.svg";
const API_ROOT = CRDB_ORIGIN + "/api/v1/requisitions/job-posts";
const PAGE_SIZE = 50;
const MAX_PAGES = 10;
const REQUEST_TIMEOUT_MS = 30000;

const TANZANIA_COMPANIES = {
  "00001": "CRDB Bank Plc",
  "00004": "CRDB Insurance Company Limited",
};
const FOREIGN_PATTERN = /\b(DRC|CONGO|BURUNDI|KINSHASA|LUBUMBASHI|BUJUMBURA)\b/i;

async function fetchJson(url, fetchFn) {
  const response = await fetchFn(url, {
    headers: { Accept: "application/json", "User-Agent": SCRAPER_USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error("CRDB careers returned HTTP " + response.status + ".");
  }
  const body = await response.json();
  if (body?.code !== 1000 || !body.data) {
    throw new Error("CRDB careers returned malformed data.");
  }
  return body.data;
}

function isExternal(post) {
  return /EXTERNAL/i.test(cleanText(post?.jobAlert));
}
function isOpen(post) {
  return cleanText(post?.status).toUpperCase() === "OPEN";
}
function isPossiblyTanzanian(summary) {
  return !FOREIGN_PATTERN.test(
    [summary?.location, summary?.businessUnit].filter(Boolean).join(" ")
  );
}
function titleCase(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase())
    .replace(/\b(Ict|Ai|Esg|Hr|It|Sme|Msme)\b/g, (word) => word.toUpperCase())
    .replace(/\b(And|Of|For|The|In|To)\b/g, (word, _w, offset) =>
      offset === 0 ? word : word.toLowerCase()
    );
}
function companyFor(detail) {
  const code = cleanText(detail?.jobDetail?.companyCode);
  return TANZANIA_COMPANIES[code] || null;
}
function locationFor(summary, detail) {
  const location = cleanText(summary?.location || detail?.jobDetail?.businessLocation);
  if (/tanzania head office/i.test(location)) return "Dar es Salaam";
  if (/tanzania/i.test(location)) return location;
  // Subsidiary vacancies are checked by company code, not by a guessed country.
  return "Tanzania";
}
function toDayFirstDate(value) {
  const match = cleanText(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[3] + "/" + match[2] + "/" + match[1] : null;
}
function buildDescription(detail) {
  const sections = [
    ["Job Purpose", detail.jobPurpose],
    ["Principal Responsibilities", detail.principalResponsibilities],
    ["Qualifications Required", detail.qualificationRequired],
  ];
  const parts = sections
    .map(([heading, html]) => {
      const text = htmlToText(html);
      return text ? heading + "\n\n" + text : "";
    })
    .filter(Boolean);
  const footer = htmlToText(detail.footer);
  if (footer) parts.push(footer);
  return parts.join("\n\n");
}

function mapCrdbPost(summary, detail) {
  if (!summary || !detail || !isOpen(detail) || !isExternal(detail)) return null;
  const company = companyFor(detail);
  if (!company) return null;
  const foreignEvidence = [
    summary.location,
    summary.businessUnit,
    detail.jobDetail?.businessLocation,
    detail.jobDetail?.costCenterName,
  ].filter(Boolean).join(" ");
  if (FOREIGN_PATTERN.test(foreignEvidence)) return null;
  const title = titleCase(detail.title || summary.title);
  if (!title) return null;
  const openings = Number(detail.numberOfCandidates || summary.numberOfCandidates);
  return {
    sourceId: "crdb-" + (detail.id || summary.id),
    title,
    company,
    location: locationFor(summary, detail),
    description: buildDescription(detail),
    deadline: toDayFirstDate(detail.deadline || summary.deadline),
    type: mapEmploymentType(cleanText(detail.employmentTerms), title),
    numberOfPosts: Number.isFinite(openings) && openings > 0
      ? openings + " Post" + (openings === 1 ? "" : "s")
      : "",
    sourceUrl: CRDB_CAREERS_URL,
    applicationUrl: CRDB_APPLY_URL,
    companyLogo: CRDB_LOGO_URL,
  };
}

async function collectOpenSummaries(fetchFn) {
  const posts = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await fetchJson(
      API_ROOT + "/open?pageNumber=" + page + "&pageSize=" + PAGE_SIZE + "&status=OPEN",
      fetchFn
    );
    if (!Array.isArray(data.content)) {
      throw new Error("CRDB careers returned malformed data.");
    }
    posts.push(...data.content);
    if (data.last || data.content.length < PAGE_SIZE) break;
  }
  return posts;
}

async function collectCrdbJobs({ fetchFn = fetch } = {}) {
  const summaries = await collectOpenSummaries(fetchFn);
  const candidates = summaries.filter(
    (post) => isOpen(post) && isExternal(post) && isPossiblyTanzanian(post)
  );
  const jobs = [];
  for (const summary of candidates) {
    const data = await fetchJson(API_ROOT + "/" + summary.id, fetchFn);
    const job = mapCrdbPost(summary, data.details);
    if (job) jobs.push(job);
  }
  const results = deduplicateJobs(jobs, {
    source: "crdb-bank-careers",
    baseUrl: CRDB_CAREERS_URL,
    location: "Tanzania",
  });
  Object.defineProperty(results, "health", {
    enumerable: false,
    value: { preserveExisting: results.length === 0 },
  });
  console.log(
    "CRDB Bank: " + results.length + " Tanzania vacancies (" +
    summaries.length + " open posts on the portal)"
  );
  return results;
}
module.exports = {
  API_ROOT, CRDB_APPLY_URL, CRDB_CAREERS_URL, collectCrdbJobs, mapCrdbPost,
};
