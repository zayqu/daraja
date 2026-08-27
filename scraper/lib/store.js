const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { createJobWithPositionSlug } = require("../../lib/job-slug");

const AUTHORITATIVE_SNAPSHOT_SOURCES = new Set([
  "ajira",
  "ajiraweb",
  "nmb-bank-careers",
  "standardbank-tanzania",
]);

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required unless --dry-run is used.");
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

function normalizeTitle(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isGenericJobTitle(value, { company, source } = {}) {
  const title = normalizeTitle(value);
  const isRetiredInstitutionHomepage =
    source === "tanzania-financial-institutions" &&
    title.length > 0 &&
    title.toLocaleLowerCase("en") ===
      normalizeTitle(company).toLocaleLowerCase("en");

  return (
    !title ||
    title.length < 4 ||
    /^(?:email|physical|postal|online|manual|website|portal|walk[ -]?in)\s+application(?:\s+method)?$/i.test(title) ||
    /^(?:how to apply|application method|apply now|view|view details|details|vacancies?|jobs?|home|read more|reset|swahili|english)$/i.test(title) ||
    /^(?:vacancies?|jobs?)\s+(?:and|&)\s+(?:tenders?|opportunities)$/i.test(title) ||
    /^(?:working at|why join)\b/i.test(title) ||
    /^(?:careers?|vacancies?|jobs?)\s+(?:overview|page|portal)$/i.test(title) ||
    isRetiredInstitutionHomepage
  );
}

async function archiveGenericJobTitles(prisma) {
  if (typeof prisma?.job?.findMany !== "function") return 0;
  const activeJobs = await prisma.job.findMany({
    where: { active: true },
    select: { id: true, title: true, company: true, source: true },
  });
  const invalidIds = activeJobs
    .filter((job) => isGenericJobTitle(job.title, job))
    .map((job) => job.id);

  if (!invalidIds.length) return 0;
  const result = await prisma.job.updateMany({
    where: { id: { in: invalidIds } },
    data: { active: false },
  });
  return result.count;
}

async function archiveExpiredJobs(prisma, now = new Date()) {
  const result = await prisma.job.updateMany({
    where: {
      active: true,
      deadline: { lt: now },
    },
    data: { active: false },
  });
  return result.count;
}

async function archiveMissingSourceJobs(prisma, jobs, source) {
  if (!AUTHORITATIVE_SNAPSHOT_SOURCES.has(source)) return 0;
  if (!Array.isArray(jobs) || jobs.length === 0) return 0;

  const currentSourceIds = [...new Set(
    jobs
      .map((job) => String(job?.sourceId || "").trim())
      .filter(Boolean)
  )];
  if (!currentSourceIds.length) return 0;

  const result = await prisma.job.updateMany({
    where: {
      source,
      active: true,
      sourceId: { notIn: currentSourceIds },
    },
    data: { active: false },
  });
  return result.count;
}

function getCandidateSources(source) {
  if (source === "standardbank-tanzania") {
    return { in: ["standardbank-tanzania", "ajiraweb"] };
  }
  if (source === "nmb-bank-careers") {
    return { in: ["nmb-bank-careers", "nmb-bank"] };
  }
  return source;
}

async function findExistingJob(prisma, job, source) {
  return prisma.job.findFirst({
    where: {
      source: getCandidateSources(source),
      OR: [
        { sourceId: job.sourceId },
        {
          title: job.title,
          company: job.company,
          deadline: job.deadline,
        },
      ],
    },
    select: { id: true },
  });
}

async function saveJobs(prisma, jobs, source) {
  const now = new Date();
  let created = 0;
  let updated = 0;

  for (const job of jobs) {
    const existing = await findExistingJob(prisma, job, source);

    if (existing) {
      await prisma.job.update({
        where: { id: existing.id },
        data: job,
        select: { id: true },
      });
      updated += 1;
    } else {
      try {
        await createJobWithPositionSlug(
          prisma,
          job,
          `${source}:${job.sourceId}`
        );
        created += 1;
      } catch (error) {
        if (error?.code !== "P2002") throw error;

        const concurrent = await findExistingJob(prisma, job, source);
        if (!concurrent) throw error;
        await prisma.job.update({
          where: { id: concurrent.id },
          data: job,
          select: { id: true },
        });
        updated += 1;
      }
    }
  }

  const expired = await prisma.job.updateMany({
    where: {
      source,
      active: true,
      deadline: { lt: now },
    },
    data: { active: false },
  });
  const missingFromSourceArchived = await archiveMissingSourceJobs(
    prisma,
    jobs,
    source
  );
  const invalidTitlesArchived = await archiveGenericJobTitles(prisma);

  return {
    source,
    found: jobs.length,
    created,
    updated,
    archived:
      expired.count + missingFromSourceArchived + invalidTitlesArchived,
    missingFromSourceArchived,
    invalidTitlesArchived,
  };
}

module.exports = {
  archiveExpiredJobs,
  archiveGenericJobTitles,
  archiveMissingSourceJobs,
  createPrismaClient,
  findExistingJob,
  getCandidateSources,
  isGenericJobTitle,
  saveJobs,
};
