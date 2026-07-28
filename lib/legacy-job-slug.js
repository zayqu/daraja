const { createJobSlug, createMigratedJobSlug } = require("./job-slug");

const LEGACY_SLUG_PATTERN = /-[a-f0-9]{12}$/;

async function findJobByLegacySlug(prisma, identifier, select) {
  if (!LEGACY_SLUG_PATTERN.test(identifier) || !identifier.includes("-at-")) {
    return null;
  }

  const jobs = await prisma.job.findMany({
    where: { active: true },
    select: {
      id: true,
      source: true,
      sourceId: true,
      title: true,
      company: true,
      ...select,
    },
  });

  const matched = jobs.find((job) => {
    const generatedSlugs = [
      createMigratedJobSlug({
        title: job.title,
        company: job.company,
        id: job.id,
      }),
    ];
    const identities = [
      job.sourceId ? `${job.source}:${job.sourceId}` : null,
      job.id,
    ].filter(Boolean);
    generatedSlugs.push(...identities.map((identity) =>
      createJobSlug({
        title: job.title,
        company: job.company,
        identity,
      })
    ));
    return generatedSlugs.includes(identifier);
  });
  if (!matched) return null;
  const { sourceId: _, ...job } = matched;
  return job;
}

module.exports = { findJobByLegacySlug, LEGACY_SLUG_PATTERN };
