import { employerPortalEnabled } from "../lib/features.js";
import { SITE_ORIGIN } from "../lib/site-config.js";
import { CAREER_GUIDES } from "../lib/career-guides.js";
import { SECTOR_GUIDES } from "../lib/sector-guides.js";

// Rebuilt hourly on the server so new and expired jobs stay current.
export const revalidate = 3600;

const MAX_JOB_URLS = 5000;

export function staticSitemapEntries() {
  const updatedAt = new Date();

  const entries = [
    { url: SITE_ORIGIN, lastModified: updatedAt, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_ORIGIN}/jobs`, lastModified: updatedAt, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_ORIGIN}/career-guides`, lastModified: updatedAt, changeFrequency: "monthly", priority: 0.7 },
    ...CAREER_GUIDES.map((guide) => ({
      url: `${SITE_ORIGIN}/career-guides/${guide.slug}`,
      lastModified: updatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    })),
    { url: `${SITE_ORIGIN}/sectors`, lastModified: updatedAt, changeFrequency: "monthly", priority: 0.6 },
    ...SECTOR_GUIDES.map((sector) => ({
      url: `${SITE_ORIGIN}/sectors/${sector.slug}`,
      lastModified: updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    })),
    { url: `${SITE_ORIGIN}/about`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_ORIGIN}/editorial-policy`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_ORIGIN}/contact`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_ORIGIN}/privacy`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_ORIGIN}/terms`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.3 },
  ];

  if (employerPortalEnabled()) {
    entries.splice(2, 0, {
      url: `${SITE_ORIGIN}/post-job`,
      lastModified: updatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  return entries;
}

async function jobSitemapEntries() {
  try {
    const [{ default: prisma }, { buildPublicJobWhere }] = await Promise.all([
      import("../lib/prisma.js"),
      import("../lib/job-query.js"),
    ]);
    const jobs = await prisma.job.findMany({
      where: buildPublicJobWhere("active"),
      orderBy: { createdAt: "desc" },
      take: MAX_JOB_URLS,
      select: { slug: true, updatedAt: true },
    });
    return jobs.map((job) => ({
      url: `${SITE_ORIGIN}/jobs/${job.slug}`,
      lastModified: job.updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
    }));
  } catch (error) {
    console.error("Sitemap job read failed:", error);
    return [];
  }
}

export default async function sitemap() {
  return [...staticSitemapEntries(), ...(await jobSitemapEntries())];
}
