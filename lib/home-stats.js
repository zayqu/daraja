import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { buildPublicJobWhere } from "@/lib/job-query";

export const HOME_STATS_CACHE_SECONDS = 300;

const readHomeStats = unstable_cache(
  async () => {
    const where = buildPublicJobWhere("active", new Date());

    const [liveJobs, employers, sources] = await Promise.all([
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
    ]);

    return {
      liveJobs,
      employers: employers.length,
      sources: sources.length,
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
    };
  }
}
