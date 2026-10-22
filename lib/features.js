import prisma from "./prisma.js";

// Site-wide switches and rules. Administrators edit them in /admin/settings
// (SiteSetting table); environment variables are the fallback when a value
// has never been set. Values are cached for 30 seconds and refreshed in the
// background, so the sync getters below stay cheap to call anywhere.

export const SITE_SETTINGS = {
  "feature.employerPortal": {
    label: "Employer portal",
    help: "Employers can sign up, create a company profile and post vacancies.",
    type: "boolean",
    env: () => process.env.EMPLOYER_PORTAL_ENABLED === "true",
  },
  "feature.candidateCareer": {
    label: "CV builder and career tools",
    help: "Candidates can build CVs and use the career workspace.",
    type: "boolean",
    env: () => process.env.CANDIDATE_CAREER_ENABLED === "true",
  },
  "ads.monetag": {
    label: "Monetag ads",
    help: "Show Monetag ads to all visitors. Keep off while AdSense is reviewing the site.",
    type: "boolean",
    env: () => process.env.NEXT_PUBLIC_MONETAG_ENABLED === "true",
  },
  "email.accountFrom": {
    label: "Account email sender",
    help: "Sender for sign-up confirmation and password reset emails, e.g. Daraja <no-reply@daraja.co.tz>.",
    type: "text",
    env: () => process.env.ACCOUNT_EMAIL_FROM || process.env.JOB_ALERTS_FROM_EMAIL || "",
  },
  "review.blockPhrases": {
    label: "Block vacancies that mention",
    help: "One phrase per line. Matching scraped vacancies are rejected automatically.",
    type: "list",
    env: () => [],
  },
  "review.holdPhrases": {
    label: "Hold for review vacancies that mention",
    help: "One phrase per line. Matching vacancies wait for an administrator before going live.",
    type: "list",
    env: () => [],
  },
};

const TTL_MS = 30_000;
const cache = globalThis.__darajaSiteSettings || { values: {}, loadedAt: 0, loading: null };
globalThis.__darajaSiteSettings = cache;

function refresh() {
  if (cache.loading) return cache.loading;
  cache.loading = prisma.siteSetting
    .findMany({ select: { key: true, value: true } })
    .then((rows) => {
      cache.values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    })
    .catch((error) => console.error("Site settings unavailable; using environment defaults:", error.message))
    .finally(() => {
      cache.loadedAt = Date.now();
      cache.loading = null;
    });
  return cache.loading;
}

// Await this where a fresh value matters (root layout, admin pages).
export async function loadSiteSettings() {
  if (Date.now() - cache.loadedAt > TTL_MS) await refresh();
  return cache.values;
}

export function invalidateSiteSettings() {
  cache.loadedAt = 0;
}

export function siteSetting(key) {
  const definition = SITE_SETTINGS[key];
  if (Date.now() - cache.loadedAt > TTL_MS) refresh();
  return Object.hasOwn(cache.values, key) ? cache.values[key] : definition?.env();
}

export const employerPortalEnabled = () => siteSetting("feature.employerPortal") === true;

export const candidateCareerEnabled = () => siteSetting("feature.candidateCareer") === true;

export const monetagEnabled = () => siteSetting("ads.monetag") === true;
