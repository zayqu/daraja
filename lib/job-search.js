import { JOB_CATEGORIES } from "./job-categories.js";

const JOB_STATUSES = new Set(["active", "expired", "all"]);
export const MAX_JOB_SEARCH_LENGTH = 160;

export function normalizeJobSearchTerm(value) {
  return typeof value === "string"
    ? value.trim().slice(0, MAX_JOB_SEARCH_LENGTH)
    : "";
}

export function normalizeJobsSearchParams(input) {
  const params = input instanceof URLSearchParams
    ? input
    : new URLSearchParams(input || "");
  const requestedPage = Number.parseInt(params.get("page") || "1", 10);
  const requestedCategory = params.get("category") || "";
  const requestedStatus = params.get("status") || "active";

  return {
    search: normalizeJobSearchTerm(
      params.get("search") || params.get("q") || ""
    ),
    category: JOB_CATEGORIES.includes(requestedCategory)
      ? requestedCategory
      : "",
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
  const status = JOB_STATUSES.has(values.status) ? values.status : "active";
  const page = Number.isSafeInteger(values.page) && values.page > 0
    ? values.page
    : 1;

  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (status !== "active") params.set("status", status);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}
