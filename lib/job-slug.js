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

function createMigratedJobSlug({ title, company, id }) {
  const titlePart = slugify(title) || "job";
  const companyPart = slugify(company);
  const readableBase = companyPart
    ? `${titlePart}-at-${companyPart}`
    : titlePart;
  const base = readableBase
    .slice(0, MAX_SLUG_BASE_LENGTH)
    .replace(/-+$/g, "");
  const uniqueSuffix = createHash("md5")
    .update(String(id))
    .digest("hex")
    .slice(0, 12);
  return `${base}-${uniqueSuffix}`;
}

function createPositionSlug(title) {
  return (slugify(title) || "job")
    .slice(0, MAX_SLUG_BASE_LENGTH)
    .replace(/-+$/g, "");
}

async function createUniquePositionSlug(prisma, {
  title,
  company,
  identity,
  excludeId,
}) {
  const positionSlug = createPositionSlug(title);
  const companySlug = slugify(company);
  const candidates = [
    positionSlug,
    companySlug
      ? `${positionSlug}-at-${companySlug}`.slice(0, MAX_SLUG_BASE_LENGTH)
      : null,
    `${positionSlug}-${createHash("sha256")
      .update(String(identity))
      .digest("hex")
      .slice(0, 8)}`,
  ].filter(Boolean);

  for (const slug of candidates) {
    const collision = await prisma.job.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!collision) return slug;
  }

  throw new Error("A unique job URL could not be generated.");
}

async function createJobWithPositionSlug(prisma, data, identity) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = await createUniquePositionSlug(prisma, {
      title: data.title,
      company: data.company,
      identity,
    });
    try {
      return await prisma.job.create({ data: { ...data, slug } });
    } catch (error) {
      if (error?.code !== "P2002") throw error;
      lastError = error;
    }
  }
  throw lastError || new Error("A unique job URL could not be reserved.");
}

module.exports = {
  MAX_SLUG_BASE_LENGTH,
  createJobSlug,
  createMigratedJobSlug,
  createPositionSlug,
  createJobWithPositionSlug,
  createUniquePositionSlug,
  slugify,
};
