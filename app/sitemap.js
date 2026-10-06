import { employerPortalEnabled } from "../lib/features.js";
import { SITE_ORIGIN } from "../lib/site-config.js";

export default function sitemap() {
  const updatedAt = new Date();

  const entries = [
    { url: SITE_ORIGIN, lastModified: updatedAt, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_ORIGIN}/jobs`, lastModified: updatedAt, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_ORIGIN}/about`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_ORIGIN}/editorial-policy`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_ORIGIN}/contact`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_ORIGIN}/privacy`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_ORIGIN}/terms`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.3 },
  ];

  if (employerPortalEnabled()) {
    entries.splice(2, 0, {
      url: `${SITE_ORIGIN}/post-job`,
      lastModified: updatedAt,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  return entries;
}
