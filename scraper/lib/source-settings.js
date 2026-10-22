const catalog = require("../config/source-catalog.json");
const bankCatalog = require("../config/bank-source-catalog.json");

// The source catalogue (catalogue files merged by id), plus the on/off
// switches administrators set in /admin/sources. A switch only matters for a
// source that has a tested adapter; without one nothing can be collected.
function getSourceCatalog() {
  const sources = new Map();
  for (const source of [...catalog.sources, ...bankCatalog.sources]) {
    sources.set(source.id, source);
  }
  return [...sources.values()];
}

function applySourceSettings(sources, settings = []) {
  const overrides = new Map(settings.map((setting) => [setting.sourceId, setting.enabled]));
  return sources.map((source) =>
    overrides.has(source.id) && source.adapter
      ? { ...source, enabled: overrides.get(source.id), adminOverride: true }
      : source
  );
}

async function loadSourceSettings(prisma) {
  if (!prisma?.scraperSourceSetting) return [];
  try {
    return await prisma.scraperSourceSetting.findMany({ select: { sourceId: true, enabled: true } });
  } catch (error) {
    console.error("Source settings unavailable; using catalogue defaults:", error.message);
    return [];
  }
}

module.exports = { applySourceSettings, getSourceCatalog, loadSourceSettings };
