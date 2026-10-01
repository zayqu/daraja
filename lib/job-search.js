import { JOB_CATEGORIES } from "./job-categories.js";

const JOB_STATUSES = new Set(["active", "expired", "all"]);
export const JOB_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "FREELANCE",
];
const JOB_TYPE_SET = new Set(JOB_TYPES);

export const MAX_JOB_SEARCH_LENGTH = 160;
export const MAX_JOB_LOCATION_LENGTH = 100;

export function normalizeJobSearchTerm(value) {
  return typeof value === "string"
    ? value.trim().slice(0, MAX_JOB_SEARCH_LENGTH)
    : "";
}

export function normalizeJobLocation(value) {
  return typeof value === "string"
    ? value.trim().slice(0, MAX_JOB_LOCATION_LENGTH)
    : "";
}

function toURLSearchParams(input) {
  if (input instanceof URLSearchParams) return input;
  if (typeof input === "string") return new URLSearchParams(input);

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input || {})) {
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (typeof firstValue === "string") params.set(key, firstValue);
  }
  return params;
}

export function normalizeJobsSearchParams(input) {
  const params = toURLSearchParams(input);
  const requestedPage = Number.parseInt(params.get("page") || "1", 10);
  const requestedCategory = params.get("category") || "";
  const requestedStatus = params.get("status") || "active";
  const requestedType = params.get("type") || "";

  return {
    search: normalizeJobSearchTerm(
      params.get("search") || params.get("q") || ""
    ),
    category: JOB_CATEGORIES.includes(requestedCategory)
      ? requestedCategory
      : "",
    location: normalizeJobLocation(params.get("location") || ""),
    type: JOB_TYPE_SET.has(requestedType) ? requestedType : "",
    status: JOB_STATUSES.has(requestedStatus) ? requestedStatus : "active",
    page: Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1,
  };
}

export function buildJobsUrl(values = {}) {
  const params = new URLSearchParams();
  const search = normalizeJobSearchTerm(values.search);
  const category = JOB_CATEGORIES.includes(values.category)
    ? values.category
    : "";
  const location = normalizeJobLocation(values.location);
  const type = JOB_TYPE_SET.has(values.type) ? values.type : "";
  const status = JOB_STATUSES.has(values.status) ? values.status : "active";
  const page = Number.isSafeInteger(values.page) && values.page > 0
    ? values.page
    : 1;

  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (location) params.set("location", location);
  if (type) params.set("type", type);
  if (status !== "active") params.set("status", status);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}
