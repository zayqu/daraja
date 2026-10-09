const { JOB_CATEGORIES } = require("./job-categories");

// Vacancies the Daraja owner publishes directly (content/vacancies/*.json).
// Each file is one vacancy. The file name is its stable identity, so editing
// the file updates the same job and deleting it is a deliberate archive.

const JOB_TYPES = new Set(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EAT_END_OF_DAY = "T23:59:59+03:00";

function text(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Shared by owner vacancies and employer submissions: a closing day in East
// Africa Time and one application method (email or https link). Problems are
// pushed onto `errors`.
function parseApplicationDetails(raw, errors) {
  let deadline = null;
  if (raw?.deadline) {
    deadline = /^\d{4}-\d{2}-\d{2}$/.test(raw.deadline) ? new Date(`${raw.deadline}${EAT_END_OF_DAY}`) : null;
    if (!deadline || Number.isNaN(deadline.getTime())) errors.push("deadline must be a date like 2026-10-21");
  }

  const applyEmail = text(raw?.applyEmail, 200);
  const applyUrl = text(raw?.applyUrl, 2000);
  let applicationUrl = null;
  if (applyEmail) {
    if (!EMAIL.test(applyEmail)) errors.push("applyEmail is not a valid email address");
    const subject = text(raw?.emailSubject, 200);
    applicationUrl = `mailto:${applyEmail}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
  } else if (applyUrl) {
    if (!/^https:\/\/[^\s]+\.[^\s]+/i.test(applyUrl)) errors.push("applyUrl must start with https://");
    applicationUrl = applyUrl;
  } else {
    errors.push("applyEmail or applyUrl is required");
  }
  return { deadline, applicationUrl };
}

// Returns { job } ready for Prisma, or { errors } describing every problem.
function parseOwnerVacancy(raw, fileName, { now = new Date() } = {}) {
  const errors = [];
  const id = String(fileName || "").replace(/\.json$/i, "");
  if (!/^[a-z0-9][a-z0-9-]{2,120}$/.test(id)) errors.push("file name must be lowercase words joined by hyphens");

  const title = text(raw?.title, 160);
  const company = text(raw?.company, 160);
  const location = text(raw?.location, 160);
  const category = text(raw?.category, 100);
  const description = (Array.isArray(raw?.description) ? raw.description.join("\n") : text(raw?.description, 10000))
    .trim()
    .slice(0, 10000);
  if (!title) errors.push("title is required");
  if (!company) errors.push("company is required");
  if (!location) errors.push("location is required");
  if (!JOB_CATEGORIES.includes(category)) errors.push(`category must be one of: ${JOB_CATEGORIES.join(", ")}`);
  if (description.length < 80) errors.push("description must be at least 80 characters");

  const type = raw?.type == null ? null : text(raw.type, 30);
  if (type !== null && !JOB_TYPES.has(type)) errors.push("type must be FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE or null");

  const { deadline, applicationUrl } = parseApplicationDetails(raw, errors);

  if (errors.length) return { errors };
  return {
    job: {
      sourceId: `owner-${id}`,
      title,
      company,
      location,
      category,
      type,
      description,
      deadline,
      applicationUrl,
      sourceUrl: null,
      source: "daraja",
      language: "en",
      moderationStatus: "PUBLISHED",
      moderationNote: "Published by the Daraja owner from content/vacancies.",
      moderatedAt: now,
      active: !deadline || deadline.getTime() >= now.getTime(),
    },
  };
}

module.exports = { parseApplicationDetails, parseOwnerVacancy };
