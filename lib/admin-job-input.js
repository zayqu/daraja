import { JOB_CATEGORIES } from "@/lib/job-categories";
import ownerVacancy from "@/lib/owner-vacancy";

const { parseApplicationDetails } = ownerVacancy;

export const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"];

const clean = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// Validates the admin job form. Returns { data } ready for Prisma or { error }.
export function parseAdminJob(body) {
  const problems = [];
  const data = {
    title: clean(body.title, 160),
    company: clean(body.company, 160),
    location: clean(body.location, 160),
    category: clean(body.category, 100),
    type: clean(body.type, 30) || null,
    salary: clean(body.salary, 160) || null,
    description: clean(body.description, 20000),
  };
  if (!data.title) problems.push("title is required");
  if (!data.company) problems.push("company is required");
  if (!data.location) problems.push("location is required");
  if (!JOB_CATEGORIES.includes(data.category)) problems.push("choose a category");
  if (data.type && !JOB_TYPES.includes(data.type)) problems.push("choose a job type");
  if (data.description.length < 40) problems.push("description must be at least 40 characters");

  const { deadline, applicationUrl } = parseApplicationDetails(body, problems);
  if (problems.length) return { error: `Check the job: ${problems.join("; ")}.` };
  return { data: { ...data, deadline, applicationUrl } };
}

// A deadline as the YYYY-MM-DD day in East Africa Time, for the date input.
export function deadlineInputValue(value) {
  if (!value) return "";
  const date = new Date(new Date(value).getTime() + 3 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

// Splits a stored application link back into the form's email / link fields.
export function applicationFields(applicationUrl) {
  if (typeof applicationUrl === "string" && applicationUrl.startsWith("mailto:")) {
    const [address, query = ""] = applicationUrl.slice(7).split("?");
    return { applyEmail: decodeURIComponent(address), applyUrl: "", emailSubject: new URLSearchParams(query).get("subject") || "" };
  }
  return { applyEmail: "", applyUrl: applicationUrl || "", emailSubject: "" };
}
