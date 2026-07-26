const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required unless --dry-run is used.");
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

async function saveJobs(prisma, jobs, source) {
  const now = new Date();
  let created = 0;
  let updated = 0;

  for (const job of jobs) {
    const existing = await prisma.job.findFirst({
      where: {
        source,
        OR: [
          { sourceId: job.sourceId },
          {
            title: job.title,
            company: job.company,
            deadline: job.deadline,
          },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.job.update({
        where: { id: existing.id },
        data: job,
      });
      updated += 1;
    } else {
      await prisma.job.create({ data: job });
      created += 1;
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

  let retiredUnverified = { count: 0 };
  if (source === "ajiraweb") {
    retiredUnverified = await prisma.job.updateMany({
      where: {
        source,
        active: true,
        sourceId: { notIn: jobs.map((job) => job.sourceId) },
      },
      data: { active: false },
    });
  }

  return {
    source,
    found: jobs.length,
    created,
    updated,
    archived: expired.count + retiredUnverified.count,
  };
}

module.exports = { createPrismaClient, saveJobs };
