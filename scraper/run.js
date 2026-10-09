require("dotenv").config();

const catalog = require("./config/source-catalog.json");
const bankCatalog = require("./config/bank-source-catalog.json");
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
const { collectCrdbJobs } = require("./sources/crdb");
const { collectNmbJobs } = require("./sources/nmb");
const { collectReliefWebJobs } = require("./sources/reliefweb");
const { collectStandardBankJobs } = require("./sources/standardbank");
const { collectVerifiedAgencyJobs } = require("./sources/verified-agency");
const { summarizeClassifications } = require("./lib/categories");
const {
  createPageRenderer,
  deepenApplicationUrl,
} = require("./lib/source-page");

// Apply must open where the application starts, not another description
// page, so every source's application link is followed to its deepest
// working destination before saving.
async function deepenApplicationUrls(jobs, { render, concurrency = 4 } = {}) {
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next];
      next += 1;
      const seedUrl = job.applicationUrl || job.sourceUrl;
      if (!seedUrl || seedUrl.startsWith("mailto:")) continue;
      try {
        const resolvedUrl = await deepenApplicationUrl(seedUrl, { render });
        if (job.applicationUrl || resolvedUrl !== job.sourceUrl) {
          job.applicationUrl = resolvedUrl;
        }
      } catch {
        // Keep the verified link the adapter found, or leave it unresolved.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
}
const {
  enrichJobsWithOfficialEmployerMedia,
} = require("./lib/employer-media");

const adapters = {
  ajira: () => collectAjiraJobs(),
  ajiraweb: () => collectAjiraWebJobs(),
  crdb: () => collectCrdbJobs(),
  nmb: () => collectNmbJobs(),
  reliefweb: () => collectReliefWebJobs(),
  standardbank: () => collectStandardBankJobs(),
  "verified-agency": (source, { renderer }) =>
    collectVerifiedAgencyJobs(source, { render: renderer.render }),
};

function getSourceCatalog() {
  const sources = new Map();
  for (const source of [...catalog.sources, ...bankCatalog.sources]) {
    sources.set(source.id, source);
  }
  return [...sources.values()];
}

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
  const enabledSources = getSourceCatalog().filter(
    (source) =>
      source.enabled &&
      source.adapter &&
      (!requestedSources.size || requestedSources.has(source.id))
  );
  if (!enabledSources.length) {
    throw new Error("No enabled scraper source matched the request.");
  }

  const prisma = dryRun ? null : createPrismaClient();
  const renderer = createPageRenderer();
  const summaries = [];
  const failures = [];
  const warnings = [];
  const lifecycle = { archivedExpired: 0 };
  const mediaSearchBudget = {
    remaining: Number.parseInt(
      process.env.EMPLOYER_MEDIA_SEARCH_BUDGET || "8",
      10
    ),
  };
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
        const jobs = await collect(source, { renderer });
        await deepenApplicationUrls(jobs, { render: renderer.render });
        await enrichJobsWithOfficialEmployerMedia(jobs, {
          source: source.id,
          prisma,
          searchBudget: mediaSearchBudget,
          blockedHosts: source.publishPolicy?.hideSourceBranding
            ? source.discovery?.allowedHosts || []
            : [],
        });
        const sourceHealth = jobs.health || {};
        const summary = dryRun
          ? {
              source: source.id,
              found: jobs.length,
              sample: jobs.slice(0, 3).map(
                ({
                  title,
                  company,
                  deadline,
                  sourceUrl,
                  applicationUrl,
                  companyLogo,
                  representativeImage,
                }) => ({
                  title,
                  company,
                  deadline,
                  sourceUrl,
                  applicationUrl,
                  companyLogo,
                  representativeImage,
                })
              ),
            }
          : sourceHealth.preserveExisting && jobs.length === 0
            ? {
                source: source.id,
                found: 0,
                created: 0,
                updated: 0,
                archived: 0,
                preserved: true,
              }
            : await saveJobs(prisma, jobs, source.id, {
                archiveEmptySnapshot:
                  sourceHealth.archiveEmptySnapshot === true,
              });
        summaries.push({
          ...summary,
          ...sourceHealth,
          classification: summarizeClassifications(jobs),
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
        if (sourceHealth.preserveExisting && jobs.length === 0) {
          warnings.push({
            source: source.id,
            warning:
              "No verified vacancies were discovered; existing records were preserved",
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
      await renderer.close().catch(() => {});
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
  }).then(
    () => process.exit(0),
    (error) => {
      console.error("Scraper run failed:", error);
      process.exit(1);
    }
  );
}

module.exports = {
  assertRunHealth,
  getRequestedSources,
  getSourceCatalog,
  runScrapers,
};
