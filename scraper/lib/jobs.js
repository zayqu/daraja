const { createHash } = require("node:crypto");
const { categorizeJob } = require("./categories");

const AJIRA_SOURCE = "ajira";
const AJIRA_VACANCIES_URL = "https://portal.ajira.go.tz/vacancies";

function cleanText(value) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
}

function cleanDescription(value) {
  if (typeof value !== "string") return "";

  const repeatedField =
    /^(?:organization|organisation|company|employer|location|application\s+method|application\s+email|application\s+deadline|closing\s+date|deadline)\s*:/i;

  return value
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean)
    .filter((paragraph) => !repeatedField.test(paragraph))
    .join("\n\n");
}

function parseDeadline(value) {
  const text = cleanText(value);
  if (!text) return null;

  const numeric = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (numeric) {
    const [, day, month, year] = numeric.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date;
    }
    return null;
  }

  const named = text.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/i);
  if (named) {
    const months = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december",
    ];
    const day = Number(named[1]);
    const month = months.indexOf(named[2].toLowerCase());
    const year = Number(named[3]);
    if (month >= 0) {
      const date = new Date(Date.UTC(year, month, day, 23, 59, 59));
      if (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month &&
        date.getUTCDate() === day
      ) {
        return date;
      }
    }
    return null;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeUrl(value, baseUrl = AJIRA_VACANCIES_URL) {
  const text = cleanText(value);
  if (!text) return baseUrl;

  try {
    const url = new URL(text, baseUrl);
    if (url.protocol === "mailto:") {
      const email = decodeURIComponent(url.pathname).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return baseUrl;
      const params = [];
      const subject = url.searchParams.get("subject");
      const body = url.searchParams.get("body");
      if (subject && !/[\r\n]/.test(subject)) {
        params.push(`subject=${encodeURIComponent(subject.trim())}`);
      }
      if (body) {
        params.push(`body=${encodeURIComponent(body.replace(/\r\n?/g, "\n"))}`);
      }
      const query = params.join("&");
      return `mailto:${email}${query ? `?${query}` : ""}`;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return baseUrl;
    url.hash = "";
    return url.toString();
  } catch {
    return baseUrl;
  }
}

function getSourceId(job, baseUrl = AJIRA_VACANCIES_URL) {
  const sourceUrl = normalizeUrl(job.sourceUrl, baseUrl);
  const url = new URL(sourceUrl);
  const pathId = url.pathname.match(
    /(?:vacanc(?:y|ies)|advert(?:isement)?|job)s?\/([^/?#]+)/i
  )?.[1];
  const queryId =
    url.searchParams.get("id") ||
    url.searchParams.get("vacancyId") ||
    url.searchParams.get("advertId");

  if (pathId || queryId) {
    return cleanText(pathId || queryId).toLowerCase();
  }

  return createHash("sha256")
    .update(`${cleanText(job.title).toLowerCase()}\0${cleanText(job.company).toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

function normalizeJob(rawJob, defaults = {}) {
  const title = cleanText(rawJob.title);
  const company =
    cleanText(rawJob.company) ||
    cleanText(defaults.company) ||
    "Government of Tanzania";
  const deadline = parseDeadline(rawJob.deadline);
  const numberOfPosts = cleanText(rawJob.numberOfPosts);
  const baseUrl = defaults.baseUrl || AJIRA_VACANCIES_URL;
  const sourceUrl = normalizeUrl(rawJob.sourceUrl, baseUrl);

  if (title.length < 3) return null;

  const job = {
    title,
    company,
    location: cleanText(rawJob.location) || cleanText(defaults.location) || "Tanzania",
    description:
      cleanDescription(rawJob.description) ||
      (numberOfPosts
        ? `${numberOfPosts}. ${defaults.description || "Visit the source website for full vacancy details and application instructions."}`
        : defaults.description ||
          "Visit the source website for full vacancy details and application instructions."),
    category:
      cleanText(rawJob.category) ||
      cleanText(defaults.category) ||
      categorizeJob({
        ...rawJob,
        company,
        source: cleanText(defaults.source),
      }),
    type: rawJob.type || defaults.type || "FULL_TIME",
    sourceUrl,
    source: cleanText(defaults.source) || AJIRA_SOURCE,
    language: cleanText(rawJob.language) || cleanText(defaults.language) || "en",
    deadline,
    active: deadline ? deadline.getTime() >= Date.now() : true,
  };

  return {
    ...job,
    sourceId: cleanText(rawJob.sourceId) || getSourceId(job, baseUrl),
  };
}

function deduplicateJobs(rawJobs, defaults = {}) {
  const jobs = new Map();

  for (const rawJob of rawJobs) {
    const job = normalizeJob(rawJob, defaults);
    if (!job) continue;
    jobs.set(job.sourceId, job);
  }

  return [...jobs.values()];
}

module.exports = {
  AJIRA_SOURCE,
  AJIRA_VACANCIES_URL,
  cleanDescription,
  cleanText,
  deduplicateJobs,
  getSourceId,
  normalizeJob,
  normalizeUrl,
  parseDeadline,
};
