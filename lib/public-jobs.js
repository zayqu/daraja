import prisma from "@/lib/prisma";
import { buildPublicJobWhere } from "@/lib/job-query";

export const PUBLIC_JOBS_PAGE_SIZE = 20;

const PUBLIC_JOB_SELECT = {
  id: true,
  slug: true,
  title: true,
  company: true,
  location: true,
  category: true,
  type: true,
  salary: true,
  deadline: true,
  source: true,
  sourceUrl: true,
  featured: true,
  language: true,
  createdAt: true,
};

function buildPublicJobsWhere(filters, now = new Date()) {
  const where = buildPublicJobWhere(filters.status, now);

  if (filters.category) where.category = filters.category;
  if (filters.source) where.source = filters.source;
  if (filters.type) where.type = filters.type;
  if (filters.location) {
    where.location = {
      contains: filters.location,
      mode: "insensitive",
    };
  }

  if (filters.search) {
    const searchConditions = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { company: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];

    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchConditions }];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }

  return where;
}

export async function readPublicJobs({
  page = 1,
  limit = PUBLIC_JOBS_PAGE_SIZE,
  search = "",
  category = "",
  location = "",
  type = "",
  source = "",
  status = "active",
} = {}) {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isSafeInteger(limit)
    ? Math.min(Math.max(limit, 1), 50)
    : PUBLIC_JOBS_PAGE_SIZE;

  const where = buildPublicJobsWhere({
    search,
    category,
    location,
    type,
    source,
    status,
  });

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      select: PUBLIC_JOB_SELECT,
    }),
    prisma.job.count({ where }),
  ]);

  return {
    jobs,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    },
  };
}
