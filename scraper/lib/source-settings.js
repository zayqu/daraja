const catalog = require("../config/source-catalog.json");
const bankCatalog = require("../config/bank-source-catalog.json");

// The source catalogue: the catalogue files (merged by id) are the seed, and
// rows in ScraperSourceSetting (managed in /admin/sources) edit, add or hide
// sources on top of them. A source only collects jobs when it has an adapter.

// Adapter for sources added from /admin: the configurable recruiter/careers
// site reader. The other adapters each read one specific website.
const ADAPTERS = ["verified-agency"];

function getSourceCatalog() {
  const sources = new Map();
  for (const source of [...catalog.sources, ...bankCatalog.sources]) {
    sources.set(source.id, source);
  }
  return [...sources.values()];
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

// One admin row applied to one catalogue entry (or to nothing, for a source
// added from /admin). Null columns keep the catalogue value.
function applyRow(base, row) {
  const merged = { ...(base || { id: row.sourceId }), ...plainObject(row.config) };
  if (row.name) merged.name = row.name;
  if (row.url) merged.url = row.url;
  if (row.adapter) merged.adapter = row.adapter;
  if (row.category) merged.category = row.category;
  if (typeof row.enabled === "boolean") merged.enabled = row.enabled;
  if (typeof row.autoPublish === "boolean") {
    merged.publishPolicy = { ...(merged.publishPolicy || {}), autoPublish: row.autoPublish };
  }
  if (Number.isInteger(row.precedence)) {
    merged.publishPolicy = { ...(merged.publishPolicy || {}), precedence: row.precedence };
  }
  // A source without a reader can never be switched on.
  if (!merged.adapter) merged.enabled = Boolean(base?.enabled);
  merged.adminOverride = true;
  merged.addedByAdmin = !base;
  merged.updatedAt = row.updatedAt || null;
  return merged;
}

function applySourceSettings(sources, settings = []) {
  const rows = new Map(settings.map((row) => [row.sourceId, row]));
  const result = [];
  for (const source of sources) {
    const row = rows.get(source.id);
    rows.delete(source.id);
    if (!row) result.push(source);
    else if (!row.deletedAt) result.push(applyRow(source, row));
  }
  for (const row of rows.values()) {
    if (!row.deletedAt && row.name && row.url) result.push(applyRow(null, row));
  }
  return result;
}

async function loadSourceSettings(prisma) {
  if (!prisma?.scraperSourceSetting) return [];
  try {
    return await prisma.scraperSourceSetting.findMany();
  } catch (error) {
    console.error("Source settings unavailable; using catalogue defaults:", error.message);
    return [];
  }
}

const PRIVATE_HOST =
  /^(?:localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.local$|.*\.internal$)/i;

function httpsUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:" || PRIVATE_HOST.test(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function lines(value, max = 20) {
  const list = Array.isArray(value) ? value : String(value || "").split(/[\n,]+/);
  return list.map((item) => String(item).trim()).filter(Boolean).slice(0, max);
}

function text(value, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Validates the /admin/sources form for a configurable (verified-agency)
// source. Returns { row } for ScraperSourceSetting, or { error }.
function parseSourceInput(body = {}, { existingIds = [] , isNew = false } = {}) {
  const problems = [];
  const name = text(body.name);
  const url = httpsUrl(body.url);
  const id = isNew
    ? text(body.id || name, 80)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : null;
  if (!name) problems.push("name is required");
  if (!url) problems.push("website address must be a public https:// address");
  if (isNew && (!id || id.length < 3)) problems.push("choose a short id (letters, numbers, hyphens)");
  if (isNew && existingIds.includes(id)) problems.push(`a source with id "${id}" already exists`);

  const listingPages = lines(body.listingPages).map(httpsUrl);
  if (listingPages.some((page) => !page)) problems.push("every listing page must be a public https:// address");
  const allowedHosts = lines(body.allowedHosts).map((host) => host.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
  if (url && !allowedHosts.length) allowedHosts.push(new URL(url).hostname.replace(/^www\./, ""));
  const detailPathPattern = text(body.detailPathPattern, 200);
  if (detailPathPattern) {
    try {
      new RegExp(detailPathPattern);
    } catch {
      problems.push("job link pattern is not a valid pattern");
    }
  }
  const mode = body.discoveryMode === "google" ? "google" : "listing";
  if (mode === "listing" && !listingPages.length && url) listingPages.push(url);
  const maxJobs = Math.min(Math.max(Number.parseInt(body.maxJobs, 10) || 50, 1), 200);

  if (problems.length) return { error: `Check the source: ${problems.join("; ")}.` };
  const config = {
    recruiterName: text(body.recruiterName) || name,
    countryFilter: text(body.countryFilter, 60) || "Tanzania",
    defaultLocation: text(body.defaultLocation, 120) || "Tanzania",
    requireDeadline: body.requireDeadline !== false,
    detailPageIsApplication: body.detailPageIsApplication === true,
    discovery: {
      mode,
      allowedHosts,
      ...(detailPathPattern ? { detailPathPattern } : {}),
      ...(mode === "listing" ? { listingPages } : { query: text(body.googleQuery, 200) }),
      maxJobs,
      concurrency: 4,
    },
    detail: {
      ...(text(body.titleSelector, 120) ? { titleSelector: text(body.titleSelector, 120) } : {}),
      ...(text(body.descriptionSelector, 120) ? { descriptionSelector: text(body.descriptionSelector, 120) } : {}),
    },
  };
  return {
    row: {
      ...(id ? { sourceId: id } : {}),
      name,
      url,
      adapter: "verified-agency",
      category: text(body.category, 80) || "professional_services_and_recruitment_firms",
      enabled: body.enabled === true,
      autoPublish: body.autoPublish === true,
      config,
    },
  };
}

module.exports = {
  ADAPTERS,
  applySourceSettings,
  getSourceCatalog,
  loadSourceSettings,
  parseSourceInput,
};
