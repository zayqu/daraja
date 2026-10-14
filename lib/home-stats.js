import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { buildPublicJobWhere } from "@/lib/job-query";

export const HOME_STATS_CACHE_SECONDS = 300;

const readHomeStats = unstable_cache(
  async () => {
    const where = buildPublicJobWhere("active", new Date());
    const [liveJobs, employers, sources, categoryGroups] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        select: { company: true },
        distinct: ["company"],
      }),
      prisma.job.findMany({
        where,
        select: { source: true },
        distinct: ["source"],
      }),
      prisma.job.groupBy({
        by: ["category"],
        where,
        _count: { _all: true },
      }),
    ]);

    const categoryCounts = {};
    for (const group of categoryGroups) {
      categoryCounts[group.category] = group._count._all;
    }

    return {
      liveJobs,
      employers: employers.length,
      sources: sources.length,
      categoryCounts,
    };
  },
  ["home-live-stats"],
  { revalidate: HOME_STATS_CACHE_SECONDS }
);

export async function getHomeStats() {
  try {
    return await readHomeStats();
  } catch (error) {
    console.error("Home stats unavailable:", error);
    return {
      liveJobs: 0,
      employers: 0,
      sources: 0,
      categoryCounts: {},
    };
  }
}

const LATEST_JOB_FIELDS = {
  id: true,
  slug: true,
  title: true,
  company: true,
  location: true,
  category: true,
  type: true,
  salary: true,
  experienceMinYears: true,
  experienceMaxYears: true,
  openings: true,
  deadline: true,
  companyLogo: true,
  representativeImage: true,
  featured: true,
  createdAt: true,
};

const readLatestJobs = unstable_cache(
  async () => {
    const jobs = await prisma.job.findMany({
      where: buildPublicJobWhere("active", new Date()),
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: LATEST_JOB_FIELDS,
    });
    // JobCard is a client component, so dates cross the boundary as strings.
    return jobs.map((job) => ({
      ...job,
      deadline: job.deadline ? job.deadline.toISOString() : null,
      createdAt: job.createdAt.toISOString(),
    }));
  },
  ["home-latest-jobs"],
  { revalidate: HOME_STATS_CACHE_SECONDS }
);

export async function getLatestJobs() {
  try {
    return await readLatestJobs();
  } catch (error) {
    console.error("Latest jobs unavailable:", error);
    return [];
  }
}
