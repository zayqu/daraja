const { createHash } = require("node:crypto");
const { categorizeJob } = require("./categories");

const AJIRA_SOURCE = "ajira";
const AJIRA_VACANCIES_URL = "https://portal.ajira.go.tz/vacancies";

function cleanText(value) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
}

function cleanLocation(value) {
  const text = cleanText(value);
  if (!text) return "";
  return text
    .replace(/\s*(?:application\s+deadline|closing\s+date|deadline)\s*:\s*.*$/i, "")
    .replace(/\s*(?:application\s+deadline|closing\s+date|deadline)\b.*$/i, "")
    .trim();
}

function deadlineFromLocation(value) {
  const text = cleanText(value);
  return text.match(/(?:application\s+deadline|closing\s+date|deadline)\s*:\s*(.+)$/i)?.[1]?.trim() || "";
}

function cleanDescription(value) {
  if (typeof value !== "string") return "";
  const repeatedField = /^(?:organization|organisation|company|employer|location|application\s+method|application\s+email|application\s+deadline|closing\s+date|deadline)\s*:/i;
  return value.split(/\n+/).map(cleanText).filter(Boolean).filter((paragraph) => !repeatedField.test(paragraph)).join("\n\n");
}

const MONTHS = new Map(
  [
    ["january", "jan", "januari"],
    ["february", "feb", "februari"],
    ["march", "mar", "machi"],
    ["april", "apr", "aprili"],
    ["may", "mei"],
    ["june", "jun", "juni"],
    ["july", "jul", "julai"],
    ["august", "aug", "agosti"],
    ["september", "sep", "sept", "septemba"],
    ["october", "oct", "oktoba"],
    ["november", "nov", "novemba"],
    ["december", "dec", "desemba", "disemba"],
  ].flatMap((names, month) => names.map((name) => [name, month]))
);

function utcEndOfDay(year, month, day) {
  const date = new Date(Date.UTC(year, month, day, 23, 59, 59));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month &&
    date.getUTCDate() === day
    ? date
    : null;
}

function parseDeadline(value) {
  const text = cleanText(value)
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  const numeric = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (numeric) {
    const [, day, month, year] = numeric.map(Number);
    return utcEndOfDay(year, month - 1, day);
  }
  const dayFirst = text.match(
    /^(?:tarehe\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+)\.?\s+(\d{4})$/i
  );
  const monthFirst = text.match(
    /^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})$/i
  );
  const named = dayFirst
    ? { day: dayFirst[1], month: dayFirst[2], year: dayFirst[3] }
    : monthFirst
      ? { day: monthFirst[2], month: monthFirst[1], year: monthFirst[3] }
      : null;
  if (named) {
    const month = MONTHS.get(named.month.toLowerCase());
    return month === undefined
      ? null
      : utcEndOfDay(Number(named.year), month, Number(named.day));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const NUMBER_WORDS = new Map([
  ["one", 1], ["two", 2], ["three", 3], ["four", 4], ["five", 5],
  ["six", 6], ["seven", 7], ["eight", 8], ["nine", 9], ["ten", 10],
  ["moja", 1], ["mmoja", 1], ["mbili", 2], ["miwili", 2], ["tatu", 3],
  ["mitatu", 3], ["nne", 4], ["minne", 4], ["tano", 5], ["mitano", 5],
  ["sita", 6], ["saba", 7], ["nane", 8], ["tisa", 9], ["kumi", 10],
]);
const COUNT = "(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|moja|mmoja|mbili|miwili|tatu|mitatu|nne|minne|tano|mitano|sita|saba|nane|tisa|kumi)";
const RANGE = `${COUNT}(?:\\s*\\(\\d{1,2}\\))?(?:\\s*(?:-|–|to|hadi|mpaka)\\s*${COUNT}(?:\\s*\\(\\d{1,2}\\))?)?\\s*(\\+)?`;
const EXPERIENCE_PATTERNS = [
  new RegExp(`${RANGE}\\s*(?:years?|yrs?)(?:'|’)?\\s*(?:of\\s+)?(?:[a-z-]+\\s+){0,3}experience`, "i"),
  new RegExp(`experience\\W{0,20}(?:of\\s+)?(?:at\\s+least\\s+|minimum\\s+(?:of\\s+)?|not\\s+less\\s+than\\s+)?${RANGE}\\s*(?:years?|yrs?)`, "i"),
  new RegExp(`uzoefu\\s+(?:wa\\s+)?(?:kazi\\s+)?(?:usiopungua\\s+|wa\\s+)?(?:miaka\\s+)?${RANGE}(?:\\s*miaka)?`, "i"),
];
const NO_EXPERIENCE =
  /\b(?:no\s+(?:prior\s+|previous\s+|work\s+)?experience\s+(?:is\s+)?(?:required|needed|necessary)|fresh\s+graduates?\s+(?:are\s+)?(?:welcome|encouraged)|hakuna\s+uzoefu|bila\s+uzoefu)\b/i;

const MINIMUM_WORDS =
  /\b(?:minimum|at\s+least|not\s+less\s+than|more\s+than|over|usiopungua|zaidi\s+ya)\b/i;

function countValue(value) {
  if (!value) return null;
  const word = NUMBER_WORDS.get(value.toLowerCase());
  const number = word ?? Number.parseInt(value, 10);
  return Number.isInteger(number) && number >= 0 && number <= 40 ? number : null;
}

function extractExperience(...texts) {
  const text = texts.map(cleanText).filter(Boolean).join(" ");
  if (!text) return null;
  for (const pattern of EXPERIENCE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    const min = countValue(match[1]);
    const max = countValue(match[2]);
    if (min === null) continue;
    if (max !== null && max >= min) return { min, max };
    const context = text.slice(
      Math.max(0, match.index - 30),
      match.index + match[0].length
    );
    const openEnded = Boolean(match[3]) || MINIMUM_WORDS.test(context);
    return { min, max: openEnded ? null : min };
  }
  return NO_EXPERIENCE.test(text) ? { min: 0, max: 0 } : null;
}

function parseOpenings(...values) {
  for (const value of values.map(cleanText).filter(Boolean)) {
    const match =
      value.match(/^(\d{1,4})$/) ||
      value.match(/(\d{1,4})\s*(?:posts?|positions?|vacanc(?:y|ies)|openings?)\b/i) ||
      value.match(/\bnafasi\s+(\d{1,4})\b/i);
    const count = match ? Number.parseInt(match[1], 10) : null;
    if (count && count > 0) return count;
  }
  return null;
}

const TYPE_RULES = [
  ["INTERNSHIP", /\b(?:intern(?:ship)?s?|industrial\s+attachment|mafunzo\s+kwa\s+vitendo)\b/i],
  ["FREELANCE", /\bfreelanc(?:e|er|ing)\b/i],
  ["PART_TIME", /\bpart[\s-]?time\b/i],
  ["CONTRACT", /\b(?:fixed[\s-]term|temporary|contract(?:ual)?\s+(?:basis|position|role|employment|staff)|(?:on|under)\s+(?:a\s+)?(?:\d+[\s-](?:year|month)s?\s+)?contract|ajira\s+ya\s+mkataba|kwa\s+mkataba)\b/i],
  ["FULL_TIME", /\b(?:full[\s-]?time|permanent(?:\s+and\s+pensionable)?|ajira\s+ya\s+kudumu)\b/i],
];

const LABEL_RULES = [
  ["FREELANCE", /freelanc/i],
  ["PART_TIME", /part/i],
  ["INTERNSHIP", /intern|volunteer|attachment/i],
  ["CONTRACT", /contract|temporary|fixed|mkataba/i],
  ["FULL_TIME", /full|permanent|kudumu/i],
];

// The first argument is a structured employment-type label (JSON-LD, ATS or a
// "Job Type:" field); later arguments are free text where only explicit
// wording counts. Returns null when nothing states the type.
function mapEmploymentType(label, ...texts) {
  const labelText = cleanText(Array.isArray(label) ? label.join(" ") : label);
  const labelRule = labelText && LABEL_RULES.find(([, pattern]) => pattern.test(labelText));
  if (labelRule) return labelRule[0];
  for (const text of texts.map(cleanText).filter(Boolean)) {
    const rule = TYPE_RULES.find(([, pattern]) => pattern.test(text));
    if (rule) return rule[0];
  }
  return null;
}

function normalizeOptionalUrl(
  value,
  baseUrl = AJIRA_VACANCIES_URL,
  { allowMailto = false } = {}
) {
  const text = cleanText(value);
  if (!text) return null;

  try {
    const url = new URL(text, baseUrl);
    if (url.protocol === "mailto:") {
      if (!allowMailto) return null;
      const email = decodeURIComponent(url.pathname).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
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

    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeUrl(value, baseUrl = AJIRA_VACANCIES_URL) {
  return (
    normalizeOptionalUrl(value, baseUrl, { allowMailto: true }) ||
    baseUrl
  );
}

function getSourceId(job, baseUrl = AJIRA_VACANCIES_URL) {
  const sourceUrl = normalizeUrl(job.sourceUrl, baseUrl);
  const url = new URL(sourceUrl);
  const pathId = url.pathname.match(/(?:vacanc(?:y|ies)|advert(?:isement)?|job)s?\/([^/?#]+)/i)?.[1];
  const queryId = url.searchParams.get("id") || url.searchParams.get("vacancyId") || url.searchParams.get("advertId");
  if (pathId || queryId) return cleanText(pathId || queryId).toLowerCase();
  return createHash("sha256").update(`${cleanText(job.title).toLowerCase()}\0${cleanText(job.company).toLowerCase()}`).digest("hex").slice(0, 32);
}

function normalizeJob(rawJob, defaults = {}) {
  const title = cleanText(rawJob.title);
  const company = cleanText(rawJob.company) || cleanText(defaults.company);
  const embeddedDeadline = deadlineFromLocation(rawJob.location);
  const deadline = parseDeadline(rawJob.deadline || embeddedDeadline);
  const numberOfPosts = cleanText(rawJob.numberOfPosts);
  const baseUrl = defaults.baseUrl || AJIRA_VACANCIES_URL;
  const sourceUrl = normalizeUrl(
    rawJob.sourceJobUrl || rawJob.sourceUrl,
    baseUrl
  );
  const applicationUrl = normalizeOptionalUrl(
    rawJob.applicationUrl,
    sourceUrl,
    { allowMailto: true }
  );
  const companyLogo = normalizeOptionalUrl(rawJob.companyLogo, sourceUrl);
  const representativeImage = normalizeOptionalUrl(
    rawJob.representativeImage,
    sourceUrl
  );
  if (title.length < 3 || !company) return null;
  const experience = extractExperience(rawJob.experience, rawJob.description);
  const job = {
    title,
    company,
    location: cleanLocation(rawJob.location) || cleanLocation(defaults.location) || "Tanzania",
    description: cleanDescription(rawJob.description) || (numberOfPosts ? `${numberOfPosts}. ${defaults.description || "Visit the source website for full vacancy details and application instructions."}` : defaults.description || "Visit the source website for full vacancy details and application instructions."),
    category: cleanText(rawJob.category) || cleanText(defaults.category) || categorizeJob({ ...rawJob, company, source: cleanText(defaults.source) }),
    type:
      rawJob.type ||
      defaults.type ||
      mapEmploymentType(rawJob.employmentType, title, rawJob.description),
    experienceMinYears: experience?.min ?? null,
    experienceMaxYears: experience?.max ?? null,
    openings: parseOpenings(numberOfPosts, rawJob.openings),
    sourceUrl,
    applicationUrl,
    companyLogo,
    representativeImage,
    source: cleanText(defaults.source) || AJIRA_SOURCE,
    language: cleanText(rawJob.language) || cleanText(defaults.language) || "en",
    deadline,
    active: deadline ? deadline.getTime() >= Date.now() : true,
  };
  return { ...job, sourceId: cleanText(rawJob.sourceId) || getSourceId(job, baseUrl) };
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
  cleanLocation,
  cleanText,
  deadlineFromLocation,
  deduplicateJobs,
  extractExperience,
  getSourceId,
  mapEmploymentType,
  normalizeJob,
  normalizeOptionalUrl,
  normalizeUrl,
  parseDeadline,
  parseOpenings,
};
