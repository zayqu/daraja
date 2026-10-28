import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { JOB_CATEGORIES, categorySlug } from "@/lib/job-categories";
import { buildPublicJobWhere } from "@/lib/job-query";

export const PUBLIC_JOBS_PAGE_SIZE = 20;
export const PUBLIC_JOBS_CACHE_SECONDS = 300;
export const PUBLIC_JOBS_CACHE_TAG = "public-jobs";

const PUBLIC_JOB_SELECT = {
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
  source: true,
  sourceUrl: true,
  applicationUrl: true,
  companyLogo: true,
  representativeImage: true,
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

const readCachedPublicJobs = unstable_cache(
  async ({
    page,
    limit,
    search,
    category,
    location,
    type,
    source,
    status,
  }) => {
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
        skip: (page - 1) * limit,
        take: limit,
        select: PUBLIC_JOB_SELECT,
      }),
      prisma.job.count({ where }),
    ]);

    return {
      jobs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  },
  ["public-jobs"],
  {
    revalidate: PUBLIC_JOBS_CACHE_SECONDS,
    tags: [PUBLIC_JOBS_CACHE_TAG],
  }
);

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

  return readCachedPublicJobs({
    page: safePage,
    limit: safeLimit,
    search,
    category,
    location,
    type,
    source,
    status,
  });
}

const FALLBACK_CATEGORIES = JOB_CATEGORIES.map((name, sortOrder) => ({
  name,
  slug: categorySlug(name),
  keywords: [],
  sortOrder,
  isFallback: name === "General",
}));

const readCachedCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true, slug: true, keywords: true, sortOrder: true, isFallback: true },
    }),
  ["public-categories"],
  { revalidate: PUBLIC_JOBS_CACHE_SECONDS, tags: [PUBLIC_JOBS_CACHE_TAG] }
);

// The live category list (Category table, managed from /admin/categories).
// Falls back to the seed list if the database is unreachable or empty.
export async function getCategoryList() {
  try {
    const rows = await readCachedCategories();
    return rows.length ? rows : FALLBACK_CATEGORIES;
  } catch (error) {
    console.error("Categories unavailable; using the built-in list:", error.message);
    return FALLBACK_CATEGORIES;
  }
}

export async function getCategoryNames() {
  return (await getCategoryList()).map((category) => category.name);
}
