const DEFAULT_SITE_ORIGIN = "https://ajira.daraja.co.tz";

function normalizeOrigin(value) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_SITE_ORIGIN;

  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return DEFAULT_SITE_ORIGIN;
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

const SITE_ORIGIN = normalizeOrigin(
  process.env.SITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_ORIGIN
);

const SCRAPER_USER_AGENT =
  String(process.env.DARAJA_SCRAPER_USER_AGENT || "").trim() ||
  `DarajaJobsBot/1.0 (+${SITE_ORIGIN})`;

module.exports = {
  SCRAPER_USER_AGENT,
  SITE_ORIGIN,
};
