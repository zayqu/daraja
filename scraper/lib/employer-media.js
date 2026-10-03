const registry = require("../config/employer-media.json");
const { fetchSourcePageMetadata } = require("./source-page");

function normalizeEmployerName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EMPLOYER_HOMEPAGES = new Map();
for (const entry of registry.employers || []) {
  if (!entry?.homepage) continue;
  for (const name of entry.names || []) {
    const key = normalizeEmployerName(name);
    if (key) EMPLOYER_HOMEPAGES.set(key, entry.homepage);
  }
}

function getEmployerHomepage(company) {
  return EMPLOYER_HOMEPAGES.get(normalizeEmployerName(company)) || null;
}

async function enrichJobsWithOfficialEmployerMedia(
  jobs,
  { fetchFn = fetch } = {}
) {
  if (!Array.isArray(jobs) || jobs.length === 0) return jobs;

  const metadataByHomepage = new Map();

  for (const job of jobs) {
    if (job.companyLogo) continue;

    const homepage = getEmployerHomepage(job.company);
    if (!homepage) continue;

    if (!metadataByHomepage.has(homepage)) {
      metadataByHomepage.set(
        homepage,
        await fetchSourcePageMetadata(homepage, { fetchFn })
      );
    }

    const media = metadataByHomepage.get(homepage);
    if (!media) continue;

    job.companyLogo = job.companyLogo || media.companyLogo || null;
    job.representativeImage =
      job.representativeImage || media.representativeImage || null;
  }

  return jobs;
}

module.exports = {
  enrichJobsWithOfficialEmployerMedia,
  getEmployerHomepage,
  normalizeEmployerName,
};
