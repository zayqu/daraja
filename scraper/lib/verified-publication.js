const { isFieldLabelTitle, feeSignal } = require("./job-policy");
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
  if (feeSignal([title, description].join("\\n"))) reasons.push("source notice includes a candidate-payment risk requiring rejection");
  const destination = String(job?.applicationUrl || job?.sourceUrl || "").trim();
  if (!destination || (!safeOriginalUrl(destination) && !/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/i.test(destination))) {
    reasons.push("valid original application destination is missing");
  }
  return { eligible: reasons.length === 0, reasons };
}

// Uniform editorial structure; position-specific evidence is taken from each
// verified original. This deterministic formatter does not claim to be a
// semantic paraphraser and never invents duties, credentials, or salaries.
const SECTION_RULES = [
  ["Responsibilities", /^(?:principal\s+)?(?:duties(?:\s+and\s+responsibilities)?|responsibilities|key\s+accountabilities|tasks)\s*:?\s*$/i],
  ["Qualifications", /^(?:minimum\s+|required\s+)?(?:qualifications?(?:\s+required)?|education|academic\s+requirements|knowledge\s+and\s+skills|skills\s+and\s+qualifications)\s*:?\s*$/i],
  ["Experience", /^(?:work\s+)?(?:experience|professional\s+experience)\s*:?\s*$/i],
  ["Application instructions", /^(?:how\s+to\s+apply|application\s+(?:procedure|instructions|process|method)|submission\s+instructions)\s*:?\s*$/i],
  ["Role summary", /^(?:job\s+purpose|job\s+description|job\s+summary|role\s+(?:overview|purpose|summary)|position\s+summary)\s*:?\s*$/i],
];
function sectionFor(value) {
  const heading = String(value || "").replace(/[\s:#]+$/, "").trim();
  return SECTION_RULES.find((entry) => entry[1].test(heading))?.[0] || null;
}
function cleanFact(value) {
  return String(value || "").replace(/^[\s•*\-–—\d.)]+/, "")
    .replace(/\s+/g, " ").trim();
}
function sourceFacts(description) {
  const sections = new Map();
  let current = "Role summary";
  for (const rawLine of String(description || "").split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = sectionFor(line);
    if (heading) {
      current = heading;
      continue;
    }
    const inline = line.match(/^([^:]{3,38}):\s+(.+)$/);
    const inlineSection = inline && sectionFor(inline[1]);
    if (inlineSection) current = inlineSection;
    const fact = cleanFact(inlineSection ? inline[2] : line);
    if (!fact || fact.length < 15 ||
      /^(?:apply\s+now|click\s+here|read\s+more|login\s+to\s+apply)$/i.test(fact)) continue;
    const bucket = sections.get(current) || [];
    const excerpt = fact.split(/\s+/).slice(0, 24).join(" ").replace(/[,;:\s]+$/, "");
    const snippet = excerpt + (fact.length > excerpt.length ? "…" : "");
    if (!bucket.some((existing) => existing.toLowerCase() === snippet.toLowerCase())) {
      bucket.push(snippet);
      sections.set(current, bucket);
    }
  }
  return sections;
}
function originalEditorialSummary(job) {
  const company = String(job.company).trim();
  const title = String(job.title).trim();
  const location = String(job.location || "").trim();
  const deadline = job.deadline instanceof Date ? job.deadline : parseDeadline(job.deadline);
  const closing = new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(deadline);
  const type = {
    FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract",
    INTERNSHIP: "Internship", FREELANCE: "Freelance",
  }[job.type];
  const count = Number(job.openings);
  const destination = job.applicationUrl || job.sourceUrl;
  const sections = sourceFacts(job.description);
  const lines = ["Job position", title, "", "Hiring organization", company];
  if (location) lines.push("", "Job location", location);
  if (type) lines.push("", "Employment type", type);
  if (Number.isInteger(count) && count > 0) lines.push("", "Number of positions", String(count));
  lines.push("", "Job overview",
    company + " is inviting applications for " + title + (location ? " in " + location : "") + ". The role is advertised in the organization's verified vacancy notice.");
  for (const name of ["Role summary", "Responsibilities", "Qualifications", "Experience"]) {
    const facts = sections.get(name) || [];
    if (!facts.length) continue;
    lines.push("", name === "Role summary" ? "Job description" : name);
    for (const fact of facts.slice(0, 4)) lines.push("• From the official notice: " + fact);
  }
  lines.push("", "Application deadline", closing, "", "How to apply",
    "Apply through the original employer destination: " + destination,
    "Consult the original vacancy for the full document and submission requirements.");
  const instructions = sections.get("Application instructions") || [];
  for (const fact of instructions.slice(0, 2)) lines.push("• Original application guidance: " + fact);
  lines.push("", "Original vacancy", job.originalEvidence.originalUrl);
  return lines.join("\n");
}

// Similarity is a conservative flag for human review, not a plagiarism score.
// Five-word runs detect substantial copy/paste without penalizing a shared
// employer name or an unavoidably identical role title.
function wordRuns(value, length = 5) {
  const words = String(value || "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/).filter(Boolean);
  const runs = [];
  for (let i = 0; i + length <= words.length; i += 1) {
    runs.push(words.slice(i, i + length).join(" "));
  }
  return runs;
}
function sourceOverlap(source, editorial) {
  const originalRuns = new Set(wordRuns(source));
  const generatedRuns = wordRuns(editorial);
  if (!originalRuns.size || !generatedRuns.length) return 0;
  return generatedRuns.filter((run) => originalRuns.has(run)).length / generatedRuns.length;
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
    const editorial = originalEditorialSummary(job);
    const overlap = sourceOverlap(job.description, editorial);
    if (overlap > 0.25) {
      const reason = "editorial draft retains substantial original-source phrasing and requires an originality review";
      held.push({ title: job.title, sourceId: job.sourceId, reasons: [reason] });
      accepted.push({
        ...job,
        description: editorial,
        reviewReasons: [...(job.reviewReasons || []), reason],
      });
      continue;
    }
    accepted.push({ ...job, description: editorial });
  }
  return { jobs: accepted, held };
}

module.exports = {
  validateVacancy,
  originalEditorialSummary,
  prepareVerifiedVacancies,
  sourceOverlap,
};
