const { createHash } = require("node:crypto");

const MAX_SLUG_BASE_LENGTH = 100;

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createJobSlug({ title, company, identity }) {
  if (identity === undefined || identity === null || String(identity).trim() === "") {
    throw new TypeError("A stable job identity is required to create a slug.");
  }

  const titlePart = slugify(title) || "job";
  const companyPart = slugify(company);
  const readableBase = companyPart
    ? `${titlePart}-at-${companyPart}`
    : titlePart;
  const base = readableBase
    .slice(0, MAX_SLUG_BASE_LENGTH)
    .replace(/-+$/g, "");
  const uniqueSuffix = createHash("sha256")
    .update(String(identity))
    .digest("hex")
    .slice(0, 12);

  return `${base}-${uniqueSuffix}`;
}

module.exports = {
  MAX_SLUG_BASE_LENGTH,
  createJobSlug,
  slugify,
};
