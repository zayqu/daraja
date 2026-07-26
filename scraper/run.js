require("dotenv").config();

const catalog = require("./config/source-catalog.json");
const { sendJobAlertDigests } = require("./lib/alerts");
const { createPrismaClient, saveJobs } = require("./lib/store");
const { collectAjiraJobs } = require("./sources/ajira");
const { collectAjiraWebJobs } = require("./sources/ajiraweb");
const { collectReliefWebJobs } = require("./sources/reliefweb");

const adapters = {
  ajira: collectAjiraJobs,
  ajiraweb: collectAjiraWebJobs,
  reliefweb: collectReliefWebJobs,
};

function getRequestedSources(args) {
  const requested = args
    .filter((argument) => argument.startsWith("--source="))
    .flatMap((argument) => argument.slice("--source=".length).split(","))
    .filter(Boolean);
  return new Set(requested);
}

async function runScrapers({ dryRun = false, requestedSources = new Set() } = {}) {
  const enabledSources = catalog.sources.filter(
    (source) =>
      source.enabled &&
      source.adapter &&
      (!requestedSources.size || requestedSources.has(source.id))
  );
  if (!enabledSources.length) {
    throw new Error("No enabled scraper source matched the request.");
  }

  const prisma = dryRun ? null : createPrismaClient();
  const summaries = [];
  const failures = [];

  try {
    for (const source of enabledSources) {
      console.log(`Starting ${source.name}${dryRun ? " (dry run)" : ""}...`);
      try {
        const collect = adapters[source.adapter];
        if (!collect) throw new Error(`Unknown adapter: ${source.adapter}`);
        const jobs = await collect();
        const summary = dryRun
          ? {
              source: source.id,
              found: jobs.length,
              sample: jobs.slice(0, 3).map(
                ({ title, company, deadline, sourceUrl }) => ({
                  title,
                  company,
                  deadline,
                  sourceUrl,
                })
              ),
            }
          : await saveJobs(prisma, jobs, source.id);
        summaries.push(summary);
        console.log(JSON.stringify(summary));
      } catch (error) {
        failures.push({ source: source.id, error: error.message });
        console.error(`${source.name} failed:`, error);
      }
    }
    if (!dryRun) {
      await sendJobAlertDigests(prisma);
    }
  } finally {
    await prisma?.$disconnect();
  }

  if (!summaries.length) {
    throw new Error(`All enabled sources failed: ${JSON.stringify(failures)}`);
  }
  if (failures.length) {
    console.warn(`Some sources failed; successful sources were preserved: ${JSON.stringify(failures)}`);
  }
  return summaries;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  runScrapers({
    dryRun: args.includes("--dry-run"),
    requestedSources: getRequestedSources(args),
  }).catch((error) => {
    console.error("Scraper run failed:", error);
    process.exitCode = 1;
  });
}

module.exports = { getRequestedSources, runScrapers };
