const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { createUniquePositionSlug } = require("../lib/job-slug");

async function normalizeJobSlugs(prisma) {
  const jobs = await prisma.job.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      company: true,
      source: true,
      sourceId: true,
      slug: true,
    },
  });

  let updated = 0;
  for (const job of jobs) {
    const slug = await createUniquePositionSlug(prisma, {
      title: job.title,
      company: job.company,
      identity: `${job.source}:${job.sourceId || job.id}`,
      excludeId: job.id,
    });
    if (slug !== job.slug) {
      await prisma.job.update({
        where: { id: job.id },
        data: { slug },
      });
      updated += 1;
    }
  }
  return { found: jobs.length, updated };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    console.log(await normalizeJobSlugs(prisma));
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { normalizeJobSlugs };
