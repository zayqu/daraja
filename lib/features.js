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
  "channel.followers": {
    label: "WhatsApp Channel followers",
    help: "Manual fallback follower count. A separately verified public rounded count takes priority when available.",
    type: "number",
    env: () => 11000,
  },
  "channel.publicAudience": {
    label: "Verified public Channel audience snapshot",
    help: "Read-only snapshot from the public WhatsApp Channel page, when an authorized sync is enabled.",
    type: "snapshot",
    env: () => null,
  },
  "ads.monetag": {
    label: "Monetag ads",
    help: "Show Monetag ads (In-Page Push and Vignette) to all visitors on Ajira.",
    type: "boolean",
    env: () => process.env.NEXT_PUBLIC_MONETAG_ENABLED === "true",
  },
  "promo.price": {
    label: "Featured job price (TZS)",
    help: "Price shown on the Advertise page for one job promoted on the WhatsApp Channel and featured on Ajira.",
    type: "number",
    env: () => 30000,
  },
  "promo.days": {
    label: "Featured period (days)",
    help: "How many days a paid job stays Featured at the top of Ajira.",
    type: "number",
    env: () => 14,
  },
  "promo.whatsapp": {
    label: "Bookings WhatsApp number",
    help: "Number employers message to book, in international format, e.g. +255712345678. Leave empty to hide the WhatsApp button.",
    type: "text",
    format: "phone",
    env: () => "",
  },
  "promo.lipaNamba": {
    label: "M-Pesa Lipa Namba",
    help: "Lipa Namba employers pay to. Leave empty to share payment details privately instead.",
    type: "text",
    format: "digits",
    env: () => "",
  },
  "promo.lipaName": {
    label: "Lipa Namba account name",
    help: "Business name employers will see when paying, so they can confirm it is Daraja.",
    type: "text",
    format: "plain",
    env: () => "",
  },
  "email.accountFrom": {
    label: "Account email sender",
    help: "Sender for sign-up confirmation and password reset emails, e.g. Daraja <no-reply@daraja.co.tz>.",
    type: "text",
    format: "email",
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
