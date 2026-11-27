import ownerVacancy from "./owner-vacancy.js";

const { parseApplicationDetails } = ownerVacancy;

export const EMPLOYER_JOB_TYPES = new Set(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]);

// Statuses an employer may still edit and send (again) for review. Live
// vacancies change only through an administrator.
export const EMPLOYER_EDITABLE_STATUSES = new Set(["DRAFT", "PENDING_REVIEW", "REJECTED"]);

const clean = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

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
  };

  if (!data.title || !data.location || !data.description || !data.category) {
    problems.push("title, location, category and description are required");
  } else if (!categories.includes(data.category) || !EMPLOYER_JOB_TYPES.has(data.type)) {
    problems.push("choose a supported category and job type");
  }

  return { data, problems };
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
