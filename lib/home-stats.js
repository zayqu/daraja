import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { buildPublicJobWhere } from "@/lib/job-query";
import { currentVisitorPeriod } from "@/lib/visitor-counter";

export const HOME_STATS_CACHE_SECONDS = 300;

const readHomeStats = unstable_cache(
  async () => {
    const where = buildPublicJobWhere("active", new Date());

    const visitorPeriod = currentVisitorPeriod();
    const [liveJobs, employers, sources, visitorCounter] = await Promise.all([
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
      prisma.visitorCounter
        .findUnique({
          where: { period: visitorPeriod },
          select: {
            totalVisits: true,
            newVisitors: true,
            returningVisitors: true,
            pageViews: true,
          },
        })
        .catch(() => null),
    ]);

    return {
      liveJobs,
      employers: employers.length,
      sources: sources.length,
      traffic: {
        totalVisits: visitorCounter?.totalVisits || 0,
        newVisitors: visitorCounter?.newVisitors || 0,
        returningVisitors: visitorCounter?.returningVisitors || 0,
        pageViews: visitorCounter?.pageViews || 0,
      },
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
      traffic: {
        totalVisits: 0,
        newVisitors: 0,
        returningVisitors: 0,
        pageViews: 0,
      },
    };
  }
}
