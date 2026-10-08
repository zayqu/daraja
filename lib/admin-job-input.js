const { JOB_CATEGORIES } = require("./job-categories");

// Validates the administrator's "Post / edit a vacancy" form. The same rules
// apply to new owner vacancies and to corrections of scraped vacancies.

const JOB_TYPES = new Set(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EAT_END_OF_DAY = "T23:59:59+03:00";

function text(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Turns "jobs@acme.co.tz" or "https://acme.co.tz/careers" (plus an optional
// email subject) into the stored applicationUrl.
function applicationUrlFrom(applyTo, subject) {
  if (!applyTo) return { applicationUrl: null };
  const email = applyTo.replace(/^mailto:/i, "");
  if (EMAIL.test(email)) {
    return {
      applicationUrl: `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`,
    };
  }
  if (/^https?:\/\/[^\s]+$/i.test(applyTo)) return { applicationUrl: applyTo };
  return { error: "How to apply must be an email address or a link starting with https://" };
}

// Splits a stored applicationUrl back into the form's two fields.
function applyFieldsFrom(applicationUrl) {
  if (!applicationUrl) return { applyTo: "", emailSubject: "" };
  if (!applicationUrl.startsWith("mailto:")) return { applyTo: applicationUrl, emailSubject: "" };
  try {
    const url = new URL(applicationUrl);
    return {
      applyTo: decodeURIComponent(url.pathname),
      emailSubject: url.searchParams.get("subject") || "",
    };
  } catch {
    return { applyTo: applicationUrl.slice("mailto:".length), emailSubject: "" };
  }
}

// "2026-10-21" (Tanzania date) for a stored deadline.
function deadlineFieldFrom(deadline) {
  if (!deadline) return "";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

// Returns { data } ready for Prisma, or { errors } listing every problem.
function parseAdminJobInput(raw, { now = new Date() } = {}) {
  const errors = [];
  const title = text(raw?.title, 160);
  const company = text(raw?.company, 160);
  const location = text(raw?.location, 160);
  const category = text(raw?.category, 100);
  const description = text(raw?.description, 10000);
  const salary = text(raw?.salary, 160) || null;
  if (!title) errors.push("Position title is required");
  if (!company) errors.push("Employer is required");
  if (!location) errors.push("Location is required");
  if (!JOB_CATEGORIES.includes(category)) errors.push("Choose a category");
  if (description.length < 80) errors.push("Description must be at least 80 characters");

  const typeValue = text(raw?.type, 30);
  const type = typeValue || null;
  if (type && !JOB_TYPES.has(type)) errors.push("Choose a supported job type");

  let deadline = null;
  const deadlineValue = text(raw?.deadline, 10);
  if (deadlineValue) {
    deadline = /^\d{4}-\d{2}-\d{2}$/.test(deadlineValue)
      ? new Date(`${deadlineValue}${EAT_END_OF_DAY}`)
      : null;
    if (!deadline || Number.isNaN(deadline.getTime())) errors.push("Deadline must be a valid date");
  }

  const apply = applicationUrlFrom(text(raw?.applyTo, 2000), text(raw?.emailSubject, 200));
  if (apply.error) errors.push(apply.error);
  if (!apply.error && !apply.applicationUrl) errors.push("How to apply is required");

  const visible = raw?.visible !== false;

  if (errors.length) return { errors };
  return {
    data: {
      title,
      company,
      location,
      category,
      type,
      salary,
      description,
      deadline,
      applicationUrl: apply.applicationUrl,
      active: visible && (!deadline || deadline.getTime() >= now.getTime()),
    },
  };
}

module.exports = {
  applyFieldsFrom,
  deadlineFieldFrom,
  parseAdminJobInput,
};
