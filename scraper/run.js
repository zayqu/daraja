require("dotenv").config();

const catalog = require("./config/source-catalog.json");
const { sendJobAlertDigests } = require("./lib/alerts");
const {
  archiveExpiredJobs,
  createPrismaClient,
  saveJobs,
} = require("./lib/store");
const {
  createHealthReport,
  sanitizeError,
  writeHealthReport,
} = require("./lib/health");
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

function assertRunHealth(summaries, failures) {
  if (!summaries.length) {
    throw new Error(`All enabled sources failed: ${JSON.stringify(failures)}`);
  }

  if (failures.length) {
    throw new Error(
      `Some sources failed; ${summaries.length} successful source result(s) ` +
      `were preserved: ${JSON.stringify(failures)}`
    );
  }
}

async function runScrapers({ dryRun = false, requestedSources = new Set() } = {}) {
  const startedAt = new Date();
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
  const warnings = [];
  const lifecycle = { archivedExpired: 0 };
  let alerts = null;

  try {
    if (!dryRun) {
      try {
        lifecycle.archivedExpired = await archiveExpiredJobs(prisma);
        console.log(
          `Lifecycle: ${lifecycle.archivedExpired} expired ` +
          `vacanc${lifecycle.archivedExpired === 1 ? "y" : "ies"} archived`
        );
      } catch (error) {
        failures.push({
          source: "job-lifecycle",
          error: sanitizeError(error.message),
        });
        console.error("Job lifecycle maintenance failed:", error);
      }
    }

    for (const source of enabledSources) {
      console.log(`Starting ${source.name}${dryRun ? " (dry run)" : ""}...`);
      const sourceStartedAt = Date.now();
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
        const sourceHealth = jobs.health || {};
        summaries.push({
          ...summary,
          ...sourceHealth,
          durationMs: Date.now() - sourceStartedAt,
        });
        if (sourceHealth.unresolved) {
          warnings.push({
            source: source.id,
            warning:
              `${sourceHealth.unresolved} of ${sourceHealth.discovered} ` +
              "discovered official vacancy links could not be resolved",
          });
        }
        console.log(JSON.stringify(summary));
      } catch (error) {
        failures.push({
          source: source.id,
          error: sanitizeError(error.message),
        });
        console.error(`${source.name} failed:`, error);
      }
    }
    if (!dryRun && summaries.length) {
      try {
        alerts = await sendJobAlertDigests(prisma);
      } catch (error) {
        failures.push({
          source: "job-alerts",
          error: sanitizeError(error.message),
        });
        console.error("Job alert delivery failed:", error);
      }
    }
  } finally {
    const report = createHealthReport({
      startedAt,
      dryRun,
      lifecycle,
      summaries,
      failures,
      warnings,
      alerts,
    });
    try {
      writeHealthReport(report);
      console.log(`SCRAPER_HEALTH ${JSON.stringify(report)}`);
    } finally {
      await prisma?.$disconnect();
    }
  }

  assertRunHealth(summaries, failures);
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

module.exports = { assertRunHealth, getRequestedSources, runScrapers };
