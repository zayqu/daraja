import legacySlug from "@/lib/legacy-job-slug";

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

export async function findPublicJob(prisma, identifier) {
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
