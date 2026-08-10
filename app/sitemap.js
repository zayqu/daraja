import { employerPortalEnabled } from "../lib/features.js";

const SITE_URL = "https://www.ajira.daraja.co.tz";

export default function sitemap() {
  const updatedAt = new Date();

  const entries = [
    { url: SITE_URL, lastModified: updatedAt, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/jobs`, lastModified: updatedAt, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/editorial-policy`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/contact`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.3 },
  ];

  if (employerPortalEnabled()) {
    entries.splice(2, 0, {
      url: `${SITE_URL}/post-job`,
      lastModified: updatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  return entries;
}
