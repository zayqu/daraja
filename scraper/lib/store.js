const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { createJobWithPositionSlug } = require("../../lib/job-slug");
const { decidePublication, sourcePolicy } = require("./job-policy");

const AUTHORITATIVE_SNAPSHOT_SOURCES = new Set([
  "ajira",
  "ajiraweb",
  "nmb-bank-careers",
  "standardbank-tanzania",
  "empower-tanzania",
  "shugulika-tanzania",
  "career-options-africa-tanzania",
  "cvpeople-tanzania",
  "qsourcing-tanzania",
  "ekazi-exact-manpower",
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
    /^(?:\d+\s+)?(?:new\s+)?jobs?\s+(?:at|from|with)\b/i.test(title) ||
    /^(?:latest\s+)?(?:job|vacancy)\s+opportunities?\s+(?:at|from|with)\b/i.test(title) ||
    /^vacancies?\s+(?:at|from|with)\b/i.test(title) ||
    /\bmultiple\s+(?:job\s+)?positions?\b/i.test(title) ||
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

async function archiveMissingSourceJobs(
  prisma,
  jobs,
  source,
  { archiveEmptySnapshot = false } = {}
) {
  if (!AUTHORITATIVE_SNAPSHOT_SOURCES.has(source)) return 0;
  if (!Array.isArray(jobs)) return 0;

  const currentSourceIds = [...new Set(
    jobs
      .map((job) => String(job?.sourceId || "").trim())
      .filter(Boolean)
  )];

  if (!currentSourceIds.length) {
    if (!archiveEmptySnapshot) return 0;
    const result = await prisma.job.updateMany({
      where: {
        source,
        active: true,
      },
      data: { active: false },
    });
    return result.count;
  }

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

const EXISTING_SELECT = {
  id: true,
  source: true,
  moderationStatus: true,
  moderatedById: true,
};

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
  const exact = await prisma.job.findFirst({
    where: {
      source,
      sourceId: job.sourceId,
    },
    select: EXISTING_SELECT,
  });
  if (exact) return exact;

  return prisma.job.findFirst({
    where: {
      source: getCandidateSources(source),
      title: job.title,
      company: job.company,
      deadline: job.deadline,
    },
    select: EXISTING_SELECT,
  });
}

function sameDayRange(value) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  const start = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  return { gte: start, lt: new Date(start.getTime() + 86400000) };
}

// The same vacancy published by another source: same position, same employer
// and the same closing day (or no deadline on either side).
async function findCrossSourceDuplicate(prisma, job, source) {
  if (typeof prisma?.job?.findMany !== "function") return null;
  const candidates = await prisma.job.findMany({
    where: {
      source: { not: source },
      active: true,
      moderationStatus: { not: "REJECTED" },
      title: { equals: job.title, mode: "insensitive" },
      company: { equals: job.company, mode: "insensitive" },
      deadline: sameDayRange(job.deadline),
    },
    select: EXISTING_SELECT,
    take: 5,
  });
  if (!Array.isArray(candidates) || !candidates.length) return null;
  return candidates.reduce((best, candidate) =>
    sourcePolicy(candidate.source).precedence < sourcePolicy(best.source).precedence
      ? candidate
      : best
  );
}

// Moderation fields for a write. New records take the policy decision; existing
// records keep their status (an administrator's decision is never overwritten)
// unless a blocking signal now appears on an automatically published record.
function moderationData(decision, existing) {
  if (!existing) {
    return {
      moderationStatus: decision.status,
      moderationNote: decision.note,
    };
  }
  if (
    decision.status === "REJECTED" &&
    !existing.moderatedById &&
    existing.moderationStatus !== "REJECTED"
  ) {
    return {
      moderationStatus: "REJECTED",
      moderationNote: decision.note,
    };
  }
  return {};
}

async function saveJobs(
  prisma,
  jobs,
  source,
  { archiveEmptySnapshot = false } = {}
) {
  const now = new Date();
  const counts = {
    created: 0,
    updated: 0,
    heldForReview: 0,
    blocked: 0,
    crossSourceDuplicates: 0,
  };
  const ownPrecedence = sourcePolicy(source).precedence;

  const write = async (existing, job, decision) => {
    const data = { ...job, ...moderationData(decision, existing) };
    await prisma.job.update({
      where: { id: existing.id },
      data,
      select: { id: true },
    });
    counts.updated += 1;
    if (data.moderationStatus === "REJECTED") counts.blocked += 1;
  };

  for (const job of jobs) {
    const decision = decidePublication(job, source);
    const existing = await findExistingJob(prisma, job, source);

    if (existing) {
      await write(existing, job, decision);
      continue;
    }

    const duplicate = await findCrossSourceDuplicate(prisma, job, source);
    if (duplicate) {
      if (sourcePolicy(duplicate.source).precedence <= ownPrecedence) {
        // A more authoritative source already lists this vacancy.
        counts.crossSourceDuplicates += 1;
        continue;
      }
      // This source outranks the current listing: it becomes canonical.
      await write(duplicate, job, decision);
      counts.crossSourceDuplicates += 1;
      continue;
    }

    try {
      await createJobWithPositionSlug(
        prisma,
        { ...job, ...moderationData(decision, null) },
        `${source}:${job.sourceId}`
      );
      counts.created += 1;
      if (decision.status === "PENDING_REVIEW") counts.heldForReview += 1;
      if (decision.status === "REJECTED") counts.blocked += 1;
    } catch (error) {
      if (error?.code !== "P2002") throw error;

      const concurrent = await findExistingJob(prisma, job, source);
      if (!concurrent) throw error;
      await write(concurrent, job, decision);
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
    source,
    { archiveEmptySnapshot }
  );
  const invalidTitlesArchived = await archiveGenericJobTitles(prisma);

  return {
    source,
    found: jobs.length,
    ...counts,
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
  findCrossSourceDuplicate,
  findExistingJob,
  getCandidateSources,
  isGenericJobTitle,
  saveJobs,
};
