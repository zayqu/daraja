const SITE_URL = "https://www.ajira.daraja.co.tz";

export default function sitemap() {
  const updatedAt = new Date();

  return [
    { url: SITE_URL, lastModified: updatedAt, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/jobs`, lastModified: updatedAt, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/post-job`, lastModified: updatedAt, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: updatedAt, changeFrequency: "yearly", priority: 0.3 },
  ];
}
