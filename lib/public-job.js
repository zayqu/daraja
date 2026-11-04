import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import legacySlug from "@/lib/legacy-job-slug";
import { PUBLIC_JOBS_CACHE_SECONDS, PUBLIC_JOBS_CACHE_TAG } from "@/lib/public-jobs";

const { findJobByLegacySlug } = legacySlug;

export const PUBLIC_JOB_SELECT = {
  id: true,
  slug: true,
  title: true,
  company: true,
  location: true,
  description: true,
  category: true,
  type: true,
  salary: true,
  experienceMinYears: true,
  experienceMaxYears: true,
  openings: true,
  deadline: true,
  sourceUrl: true,
  applicationUrl: true,
  companyLogo: true,
  representativeImage: true,
  source: true,
  createdAt: true,
};

function isRetryableDatabaseError(error) {
  return error?.code === "P1001" || error?.meta?.driverAdapterError?.name === "DriverAdapterError";
}

async function queryPublicJob(identifier) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      let job = await prisma.job.findFirst({
        where: {
          active: true,
          moderationStatus: "PUBLISHED",
          OR: [{ id: identifier }, { slug: identifier }],
        },
        select: PUBLIC_JOB_SELECT,
      });

      if (!job) {
        job = await findJobByLegacySlug(prisma, identifier, PUBLIC_JOB_SELECT);
      }

      return job || null;
    } catch (error) {
      lastError = error;
      if (!isRetryableDatabaseError(error) || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 120));
    }
  }

  throw lastError;
}

const readCachedPublicJob = unstable_cache(
  queryPublicJob,
  ["public-job-detail"],
  {
    revalidate: PUBLIC_JOBS_CACHE_SECONDS,
    tags: [PUBLIC_JOBS_CACHE_TAG],
  }
);

export async function findPublicJob(identifier) {
  return readCachedPublicJob(identifier);
}

// Closed vacancies (archived after their deadline or withdrawn) keep their
// public URL so links shared on WhatsApp, search results and bookmarks show a
// "this job has closed" page with alternatives instead of a bare 404.
export const CLOSED_JOB_SELECT = {
  id: true,
  slug: true,
  title: true,
  company: true,
  location: true,
  category: true,
  deadline: true,
};

async function queryClosedPublicJob(identifier) {
  return prisma.job.findFirst({
    where: {
      active: false,
      moderationStatus: "PUBLISHED",
      OR: [{ id: identifier }, { slug: identifier }],
    },
    select: CLOSED_JOB_SELECT,
  });
}

const readCachedClosedPublicJob = unstable_cache(
  queryClosedPublicJob,
  ["closed-public-job-detail"],
  {
    revalidate: PUBLIC_JOBS_CACHE_SECONDS,
    tags: [PUBLIC_JOBS_CACHE_TAG],
  }
);

export async function findClosedPublicJob(identifier) {
  try {
    return await readCachedClosedPublicJob(identifier);
  } catch (error) {
    console.error("Closed job lookup failed:", error);
    return null;
  }
}

export function serializePublicJob(job) {
  if (!job) return null;
  return {
    ...job,
    deadline: job.deadline?.toISOString?.() || job.deadline || null,
    createdAt: job.createdAt?.toISOString?.() || job.createdAt || null,
    featured: false,
  };
}
