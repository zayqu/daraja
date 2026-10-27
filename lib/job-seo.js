// SEO helpers for public job pages: search titles and Google JobPosting data.
// Google only accepts JobPosting markup for pages that show the full job
// description, so thin "see the official advert" listings get no markup.

export const MIN_JOB_POSTING_DESCRIPTION_CHARS = 250;

const EMPLOYMENT_TYPES = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACTOR",
  INTERNSHIP: "INTERN",
  FREELANCE: "CONTRACTOR",
};

const THIN_DESCRIPTION_PATTERN = /^\s*(view|see|read) the official\b/i;

function plainText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericLocation(location) {
  const value = plainText(location).toLowerCase();
  return !value || value === "tanzania" || value === "tz";
}

// Only label a region when the stored location explicitly names it.
const REGIONS = new Set([
  "arusha", "dar es salaam", "dodoma", "geita", "iringa", "kagera",
  "katavi", "kigoma", "kilimanjaro", "lindi", "manyara", "mara",
  "mbeya", "morogoro", "mtwara", "mwanza", "njombe", "pemba north",
  "pemba south", "pwani", "rukwa", "ruvuma", "shinyanga", "simiyu",
  "singida", "songwe", "tabora", "tanga", "zanzibar north",
  "zanzibar south and central", "zanzibar west",
]);

function verifiedRegion(location) {
  const name = plainText(location);
  return REGIONS.has(name.toLowerCase()) ? name : null;
}

// Only publish a salary when the vacancy actually specifies a TZS amount
// and a pay period. Free-text descriptions and ambiguous ranges are ignored.
function explicitBaseSalary(salary) {
  const text = plainText(salary);
  const match = /^TZS\s+([\d,]+(?:\.\d{1,2})?)\s*(?:\/|per\s+)(hour|day|week|month|year)s?$/i.exec(text);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = { hour: "HOUR", day: "DAY", week: "WEEK", month: "MONTH", year: "YEAR" }[match[2].toLowerCase()];
  return {
    "@type": "MonetaryAmount",
    currency: "TZS",
    value: { "@type": "QuantitativeValue", value: amount, unitText: unit },
  };
}

function toIsoDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function httpsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function buildJobSearchTitle(job) {
  const title = plainText(job?.title) || "Job opportunity";
  const company = plainText(job?.company);
  const location = isGenericLocation(job?.location) ? "Tanzania" : plainText(job.location);
  const parts = [company ? `${title} at ${company}` : title, location];
  return `${parts.join(" – ")} | Daraja Jobs`;
}

export function hasFullJobDescription(job) {
  const text = plainText(job?.description);
  return (
    text.length >= MIN_JOB_POSTING_DESCRIPTION_CHARS &&
    !THIN_DESCRIPTION_PATTERN.test(text)
  );
}

export function buildJobPostingJsonLd(job, pageUrl, now = new Date()) {
  if (!job || !hasFullJobDescription(job)) return null;

  const validThrough = toIsoDate(job.deadline);
  if (validThrough && new Date(validThrough) < now) return null;

  const datePosted = toIsoDate(job.createdAt);
  if (!datePosted) return null;

  const address = { "@type": "PostalAddress", addressCountry: "TZ" };
  if (!isGenericLocation(job.location)) {
    address.addressLocality = plainText(job.location);
    const region = verifiedRegion(job.location);
    if (region) address.addressRegion = region;
  }

  const hiringOrganization = {
    "@type": "Organization",
    name: plainText(job.company),
  };
  const logo = httpsUrl(job.companyLogo);
  if (logo) hiringOrganization.logo = logo;
  const sameAs = httpsUrl(job.sourceUrl);
  if (sameAs) hiringOrganization.sameAs = new URL(sameAs).origin;

  const data = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: plainText(job.title),
    description: String(job.description).trim(),
    datePosted,
    hiringOrganization,
    jobLocation: { "@type": "Place", address },
    url: pageUrl,
    directApply: false,
  };

  const baseSalary = explicitBaseSalary(job.salary);
  if (baseSalary) data.baseSalary = baseSalary;
  if (validThrough) data.validThrough = validThrough;
  if (EMPLOYMENT_TYPES[job.type]) data.employmentType = EMPLOYMENT_TYPES[job.type];

  return data;
}

export function serializeJsonLd(data) {
  // Escape "<" so job text can never close the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
