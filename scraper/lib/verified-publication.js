const { isFieldLabelTitle } = require("./job-policy");
const { parseDeadline } = require("./jobs");

// Original-source evidence is supplied by an adapter after it has opened
// the vacancy itself. A search result, recruiter summary or email link alone
// is not sufficient evidence for automatic publication.
const PLACEHOLDERS = /^(?:employer in tanzania|unknown|not specified|n\/a|government of tanzania)$/i;
const GENERIC_DESCRIPTION = /^(?:visit|view|see|check|apply|this humanitarian or development vacancy is listed)/i;

function safeOriginalUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password &&
      host !== "localhost" && !host.endsWith(".local") &&
      !/^(?:127\.|10\.|192\.168\.|169\.254\.)/.test(host);
  } catch {
    return false;
  }
}

function validateVacancy(job, now = new Date()) {
  const reasons = [];
  const title = String(job?.title || "").trim();
  const company = String(job?.company || "").trim();
  const description = String(job?.description || "").trim();
  const deadline = job?.deadline instanceof Date
    ? job.deadline : parseDeadline(job?.deadline);
  const evidence = job?.originalEvidence;

  if (title.length < 4 || isFieldLabelTitle(title)) reasons.push("job position is missing or is a metadata label");
  if (company.length < 3 || PLACEHOLDERS.test(company)) reasons.push("named hiring organization is missing");
  if (!deadline || Number.isNaN(deadline.getTime())) reasons.push("original vacancy has no valid closing date");
  else if (deadline.getTime() < now.getTime()) reasons.push("closing date has passed");
  if (description.length < 80 || GENERIC_DESCRIPTION.test(description)) reasons.push("substantive job description is missing");
  if (!evidence?.verified || !evidence?.deadlineVerified ||
      !safeOriginalUrl(evidence.originalUrl)) {
    reasons.push("vacancy, description and closing date have not been verified at the original source");
  }
  const destination = String(job?.applicationUrl || job?.sourceUrl || "").trim();
  if (!destination || (!safeOriginalUrl(destination) && !/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/i.test(destination))) {
    reasons.push("valid original application destination is missing");
  }
  return { eligible: reasons.length === 0, reasons };
}

function originalEditorialSummary(job) {
  const company = String(job.company).trim();
  const title = String(job.title).trim();
  const location = String(job.location || "").trim();
  const date = new Date(job.deadline);
  const closing = new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(date);
  const place = location ? ` in ${location}` : "";
  const count = Number(job.openings);
  const openings = Number.isInteger(count) && count > 0
    ? ` The notice lists ${count} opening${count === 1 ? "" : "s"}.` : "";
  const type = {
    FULL_TIME: "full-time", PART_TIME: "part-time", CONTRACT: "contract",
    INTERNSHIP: "internship", FREELANCE: "freelance",
  }[job.type];
  const kind = type ? ` This is listed as a ${type} opportunity.` : "";

  // Independently worded editorial overview. Do not copy the employer's
  // paragraphs or invent duties, salary, qualifications or experience.
  return [
    "Opportunity overview",
    `${company} has advertised a vacancy for ${title}${place}.${openings}${kind}`,
    "",
    "Job description",
    `The official vacancy notice describes the ${title} position at ${company}. Review the original notice for its precise responsibilities, eligibility requirements and supporting documents; those details take precedence over this summary.`,
    "",
    "Closing date",
    `Applications close on ${closing}, according to the verified original vacancy.`,
    "",
    "How to apply",
    "Use the original employer or institution application destination linked to this listing. Confirm the final requirements before submitting an application.",
  ].join("\n");
}

function prepareVerifiedVacancies(jobs, now = new Date()) {
  const accepted = [];
  const held = [];
  for (const job of jobs) {
    const quality = validateVacancy(job, now);
    if (!quality.eligible) {
      held.push({ title: job.title, sourceId: job.sourceId, reasons: quality.reasons });
      accepted.push({
        ...job,
        reviewReasons: [...(job.reviewReasons || []), ...quality.reasons],
      });
      continue;
    }
    accepted.push({ ...job, description: originalEditorialSummary(job) });
  }
  return { jobs: accepted, held };
}

module.exports = {
  validateVacancy,
  originalEditorialSummary,
  prepareVerifiedVacancies,
};
