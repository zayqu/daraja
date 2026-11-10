// Strict public-document discovery from the PSRS vacancies archive.
// A document link is only a *candidate* original notice until the actual
// PDF is read and the individual vacancy/closing date are checked.
const OFFICIAL_HOST = "www.ajira.go.tz";
const DOWNLOAD_PATTERN = /^\/api\/v1\/vacancies\/attachment\/token\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/download$/i;
const VACANCY_TITLE = /^TANGAZO LA NAFASI (?:ZA|YA) KAZI\b/i;

function officialPdfUrl(value) {
  try {
    const url = new URL(String(value || ""), "https://" + OFFICIAL_HOST);
    if (url.protocol !== "https:" || url.hostname !== OFFICIAL_HOST ||
        url.username || url.password || url.search || url.hash ||
        !DOWNLOAD_PATTERN.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function archiveCandidates(actions) {
  if (!Array.isArray(actions)) return [];
  const candidates = [];
  const seen = new Set();
  // This reflects the rendered archive DOM order:
  // title button, optional Preview button, Download anchor. A new title
  // always terminates the previous card, preventing cross-card attribution.
  let title = null;
  let consumed = true;
  for (const action of actions) {
    const label = String(action?.text || "").replace(/\s+/g, " ").trim();
    if (label.toUpperCase().startsWith("TANGAZO LA ")) {
      title = VACANCY_TITLE.test(label) ? label : null;
      consumed = false;
      continue;
    }
    if (!title || consumed || action?.tag !== "a" ||
        !/^download$/i.test(label)) continue;
    const url = officialPdfUrl(action.href);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    candidates.push({
      announcement: title,
      documentUrl: url,
      // Do not equate the notice date with the vacancy deadline.
      evidenceStatus: "PENDING_DOCUMENT_REVIEW",
    });
    consumed = true;
  }
  return candidates;
}

module.exports = { officialPdfUrl, archiveCandidates };
