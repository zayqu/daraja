import ownerVacancy from "./owner-vacancy.js";

const { parseApplicationDetails } = ownerVacancy;

export const EMPLOYER_JOB_TYPES = new Set(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]);

// Statuses an employer may still edit and send (again) for review. Live
// vacancies change only through an administrator.
export const EMPLOYER_EDITABLE_STATUSES = new Set(["DRAFT", "PENDING_REVIEW", "REJECTED"]);

const clean = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function wholeNumber(value, min, max) {
  const text = String(value ?? "").replace(/[\s,]/g, "");
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return number >= min && number <= max ? number : null;
}

const formatTsh = (value) => value.toLocaleString("en-GB");

// The optional extras from the Figma Post a job form: experience, number of
// openings and a monthly salary range that is only stored when the employer
// chooses to show it (D-029: stated facts only, nothing guessed).
function parseExtras(body, problems) {
  const experienceMinYears = body?.experience === "" || body?.experience == null ? null : wholeNumber(body.experience, 0, 40);
  if (body?.experience !== "" && body?.experience != null && experienceMinYears === null) problems.push("choose the experience needed");
  const openings = body?.openings === "" || body?.openings == null ? null : wholeNumber(body.openings, 1, 500);
  if (body?.openings !== "" && body?.openings != null && openings === null) problems.push("openings must be a number from 1 to 500");

  let salary = null;
  if (body?.showSalary === true) {
    const min = wholeNumber(body.salaryMin, 1, 1_000_000_000);
    const max = body?.salaryMax === "" || body?.salaryMax == null ? null : wholeNumber(body.salaryMax, 1, 1_000_000_000);
    if (!min) problems.push("enter the monthly salary, or switch off Show on the job");
    else if (body?.salaryMax && !max) problems.push("the highest salary must be a number");
    else if (max && max < min) problems.push("the highest salary must not be lower than the lowest");
    else salary = max && max !== min ? `TSh ${formatTsh(min)} – ${formatTsh(max)} a month` : `TSh ${formatTsh(min)} a month`;
  }
  return { experienceMinYears, experienceMaxYears: null, openings, salary };
}

// Reads an employer's vacancy form. Creating (POST /api/employer/jobs) and
// editing (PATCH /api/employer/jobs/[id]) share these rules. Nothing may be
// stored while `problems` is not empty.
export function parseEmployerVacancy(body, { categories, now = new Date() }) {
  const problems = [];
  const { deadline, applicationUrl } = parseApplicationDetails(body, problems);
  if (!deadline) problems.push("closing date is required");
  else if (deadline.getTime() < now.getTime()) problems.push("closing date must be today or later");

  const data = {
    title: clean(body?.title, 160),
    location: clean(body?.location, 160),
    description: clean(body?.description, 10000),
    category: clean(body?.category, 100),
    type: clean(body?.type, 30) || "FULL_TIME",
    deadline,
    applicationUrl,
    ...parseExtras(body, problems),
  };

  if (!data.title || !data.location || !data.description || !data.category) {
    problems.push("title, location, category and description are required");
  } else if (!categories.includes(data.category) || !EMPLOYER_JOB_TYPES.has(data.type)) {
    problems.push("choose a supported category and job type");
  }

  return { data, problems };
}

// A draft only needs a title; whatever else is filled in must still be valid.
// Drafts never go live, and sending one for review runs parseEmployerVacancy.
export function parseEmployerDraft(body, { categories, now = new Date() }) {
  const { data, problems } = parseEmployerVacancy(body, { categories, now });
  const incomplete = new Set([
    "closing date is required",
    "applyEmail or applyUrl is required",
    "title, location, category and description are required",
    "enter the monthly salary, or switch off Show on the job",
  ]);
  const remaining = problems.filter((problem) => !incomplete.has(problem));
  if (!data.title) remaining.unshift("give the job a title before saving a draft");
  if (data.category && !categories.includes(data.category)) remaining.push("choose a supported category");
  if (!EMPLOYER_JOB_TYPES.has(data.type)) remaining.push("choose a supported job type");
  return { data, problems: [...new Set(remaining)].filter((problem) => problem !== "choose a supported category and job type") };
}

// Reads "TSh 1,800,000 – 2,400,000 a month" back into the form's numbers.
function salaryValues(salary) {
  const numbers = String(salary || "").match(/\d[\d,]*/g)?.map((value) => value.replace(/,/g, "")) || [];
  return { showSalary: numbers.length > 0, salaryMin: numbers[0] || "", salaryMax: numbers[1] || "" };
}

// The vacancy form's starting values when an employer edits a vacancy.
export function vacancyFormValues(job) {
  const mailto = typeof job.applicationUrl === "string" && job.applicationUrl.startsWith("mailto:");
  const email = mailto ? decodeURIComponent(job.applicationUrl.slice(7).split("?")[0]) : "";
  return {
    title: job.title || "",
    location: job.location || "",
    category: job.category || "",
    type: job.type || "FULL_TIME",
    description: job.description || "",
    deadline: job.deadline
      ? new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Dar_es_Salaam" }).format(job.deadline)
      : "",
    applyMethod: mailto || !job.applicationUrl ? "email" : "link",
    applyEmail: email,
    applyUrl: mailto ? "" : job.applicationUrl || "",
    experience: Number.isInteger(job.experienceMinYears) ? String(job.experienceMinYears) : "",
    openings: Number.isInteger(job.openings) ? String(job.openings) : "",
    ...salaryValues(job.salary),
  };
}

// How an employer sees each vacancy's state. `key` drives the list filters.
// A published vacancy whose closing date has passed is closed, exactly as the
// public job board treats it (lib/job-query.js).
export function vacancyState(job, now = new Date()) {
  if (job.moderationStatus === "PUBLISHED") {
    const open = job.active && (!job.deadline || job.deadline.getTime() >= now.getTime());
    return open
      ? { key: "live", label: "Live", tone: "green" }
      : { key: "closed", label: "Closed", tone: "gray" };
  }
  if (job.moderationStatus === "PENDING_REVIEW") return { key: "review", label: "In review", tone: "amber" };
  if (job.moderationStatus === "REJECTED") return { key: "changes", label: "Not approved", tone: "red" };
  if (job.moderationStatus === "ARCHIVED") return { key: "closed", label: "Closed", tone: "gray" };
  return { key: "draft", label: "Draft", tone: "blue" };
}
