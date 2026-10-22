// Seed and fallback list. The live list is the Category table, managed from
// /admin/categories and read through getCategoryList() in lib/public-jobs.js.
export const JOB_CATEGORIES = [
  "Government",
  "NGO & Development",
  "Banking & Finance",
  "Technology",
  "Creative, Design & Media",
  "Health",
  "Education",
  "Engineering",
  "Sales & Marketing",
  "Accounting & Audit",
  "HR & Administration",
  "Legal",
  "Logistics & Transport",
  "Hospitality & Tourism",
  "Agriculture",
  "Mining, Energy, Oil & Gas",
  "Manufacturing",
  "Construction & Real Estate",
  "Security & Protective Services",
  "Internships & Graduate Programs",
  "General",
];

export const EXPERIENCE_LEVELS = [
  "Entry level",
  "Mid level",
  "Senior level",
  "Management",
];

export const WORK_ARRANGEMENTS = ["On-site", "Hybrid", "Remote"];

// Stable URL slug for a category name ("Banking & Finance" ->
// "banking-and-finance"). Stored on the Category row when it is created.
export function categorySlug(category) {
  return String(category || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
