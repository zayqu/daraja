const fs = require("node:fs");
const path = require("node:path");
const { createJobWithPositionSlug } = require("../lib/job-slug");
const { parseOwnerVacancy } = require("../lib/owner-vacancy");

// Publishes every vacancy in content/vacancies/*.json. Runs on merge to
// master (see .github/workflows/publish-owner-vacancies.yml). Safe to re-run:
// each file maps to one job by its file name, so a rerun updates, never
// duplicates. A slug is reserved once and kept so shared links keep working.

const VACANCY_DIR = path.join(__dirname, "..", "content", "vacancies");

function readVacancies(dir = VACANCY_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      return { file, ...parseOwnerVacancy(raw, file) };
    });
}

async function publishOwnerVacancies(prisma, vacancies) {
  const invalid = vacancies.filter((vacancy) => vacancy.errors);
  if (invalid.length) {
    throw new Error(
      invalid.map((vacancy) => `${vacancy.file}: ${vacancy.errors.join("; ")}`).join("\n")
    );
  }
  const results = [];
  for (const { file, job } of vacancies) {
    const existing = await prisma.job.findUnique({
      where: { source_sourceId: { source: job.source, sourceId: job.sourceId } },
      select: { id: true, slug: true },
    });
    let record;
    if (existing) {
      record = await prisma.job.update({ where: { id: existing.id }, data: job, select: { id: true, slug: true } });
    } else {
      const created = await createJobWithPositionSlug(prisma, job, job.sourceId);
      record = await prisma.job.findUnique({ where: { id: created.id }, select: { id: true, slug: true } });
    }
    await prisma.auditEvent.create({
      data: {
        action: existing ? "OWNER_VACANCY_UPDATED" : "OWNER_VACANCY_PUBLISHED",
        entityType: "Job",
        entityId: record.id,
        metadata: { file },
      },
    });
    results.push({ file, slug: record.slug, created: !existing, active: job.active });
  }
  return results;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const vacancies = readVacancies();
  // Loaded here so the pure functions above can be tested without a
  // generated Prisma client.
  const { PrismaClient } = require("@prisma/client");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    for (const result of await publishOwnerVacancies(prisma, vacancies)) {
      console.log(
        `${result.created ? "Published" : "Updated"} ${result.file}: https://ajira.daraja.co.tz/jobs/${result.slug}` +
        (result.active ? "" : " (deadline passed, kept closed)")
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = { publishOwnerVacancies, readVacancies };
