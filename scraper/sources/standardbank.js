const cheerio = require("cheerio");

const { cleanText, deduplicateJobs } = require("../lib/jobs");
const { extractSourceMedia } = require("../lib/source-page");

const COMPANY = "StandardBankGroup";
const API_ROOT = `https://api.smartrecruiters.com/v1/companies/${COMPANY}/postings`;
const PAGE_SIZE = 100;
const MAX_POSTINGS = 500;
const REQUEST_TIMEOUT_MS = 20_000;

function requestOptions() {
  return {
    headers: {
      Accept: "application/json",
      "User-Agent": "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };
}

async function fetchJson(url, fetchFn) {
  const response = await fetchFn(url, requestOptions());
  if (!response.ok) {
    throw new Error(`Standard Bank official careers returned HTTP ${response.status}.`);
  }
  return response.json();
}

function htmlToText(value) {
  if (!value) return "";
  const $ = cheerio.load(`<main>${value}</main>`);
  $("br").replaceWith("\n");
  $("li").each((_, element) => {
    $(element).prepend("• ").append("\n");
  });
  $("p, h1, h2, h3, h4").each((_, element) => {
    $(element).append("\n");
  });
  return $("main")
    .text()
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean)
    .join("\n\n");
}

function mapEmploymentType(value) {
  const type = cleanText(value).toLowerCase();
  if (type.includes("part")) return "PART_TIME";
  if (type.includes("contract") || type.includes("temporary")) return "CONTRACT";
  if (type.includes("intern")) return "INTERNSHIP";
  return "FULL_TIME";
}

function getCompanyName(posting) {
  const companyCode = posting.customField?.find(
    (field) => field.fieldLabel === "Company Code"
  )?.valueLabel;
  return cleanText(companyCode) || "Stanbic Bank Tanzania";
}

function isOfficialSmartRecruitersUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      (
        host === "jobs.smartrecruiters.com" ||
        host === "www.smartrecruiters.com" ||
        host === "smartrecruiters.com"
      )
    );
  } catch {
    return false;
  }
}

function getOfficialApplyUrl(posting) {
  return isOfficialSmartRecruitersUrl(posting?.applyUrl)
    ? new URL(posting.applyUrl).toString()
    : null;
}

function getOfficialPostingUrl(posting) {
  if (isOfficialSmartRecruitersUrl(posting?.postingUrl)) {
    return new URL(posting.postingUrl).toString();
  }
  if (isOfficialSmartRecruitersUrl(posting?.applyUrl)) {
    const url = new URL(posting.applyUrl);
    url.searchParams.delete("oga");
    return url.toString();
  }
  return null;
}

function mapPosting(posting) {
  if (
    !posting?.active ||
    posting.location?.country?.toLowerCase() !== "tz"
  ) {
    return null;
  }

  const sourceUrl = getOfficialPostingUrl(posting);
  const applicationUrl = getOfficialApplyUrl(posting);
  if (!sourceUrl || !applicationUrl) return null;

  const sections = posting.jobAd?.sections || {};
  const description = [
    sections.jobDescription?.text,
    sections.qualifications?.text,
    sections.additionalInformation?.text,
  ]
    .map(htmlToText)
    .filter(Boolean)
    .join("\n\n");

  const companyDescriptionHtml =
    posting.jobAd?.sections?.companyDescription?.text || "";
  const media = extractSourceMedia(companyDescriptionHtml, sourceUrl);
  const companyLogo =
    cleanText(posting.company?.logoUrl) ||
    cleanText(posting.company?.logo) ||
    media.companyLogo ||
    null;

  return {
    sourceId: `standardbank-${posting.id}`,
    title: posting.name,
    company: getCompanyName(posting),
    location:
      cleanText(posting.location?.city) ||
      cleanText(posting.location?.fullLocation) ||
      "Tanzania",
    description,
    type: mapEmploymentType(posting.typeOfEmployment?.label),
    sourceUrl,
    applicationUrl,
    companyLogo,
    representativeImage: media.representativeImage,
    language: posting.language?.code || "en",
  };
}

async function collectPostingSummaries(fetchFn) {
  const postings = [];

  for (let offset = 0; offset < MAX_POSTINGS; offset += PAGE_SIZE) {
    const page = await fetchJson(
      `${API_ROOT}?limit=${PAGE_SIZE}&offset=${offset}`,
      fetchFn
    );
    if (!Array.isArray(page.content)) {
      throw new Error("Standard Bank official careers returned malformed data.");
    }

    postings.push(...page.content);
    if (
      page.content.length < PAGE_SIZE ||
      postings.length >= Number(page.totalFound || 0)
    ) {
      break;
    }
  }

  return postings;
}

async function collectStandardBankJobs({ fetchFn = fetch } = {}) {
  const summaries = await collectPostingSummaries(fetchFn);
  const tanzania = summaries.filter(
    (posting) => posting.location?.country?.toLowerCase() === "tz"
  );
  const detailed = [];

  for (const posting of tanzania) {
    const detail = await fetchJson(`${API_ROOT}/${posting.id}`, fetchFn);
    const job = mapPosting(detail);
    if (job) detailed.push(job);
  }

  return deduplicateJobs(detailed, {
    source: "standardbank-tanzania",
    baseUrl: "https://jobs.smartrecruiters.com/StandardBankGroup",
    company: "Stanbic Bank Tanzania",
  });
}

module.exports = {
  API_ROOT,
  collectStandardBankJobs,
  getOfficialApplyUrl,
  getOfficialPostingUrl,
  htmlToText,
  mapPosting,
};
