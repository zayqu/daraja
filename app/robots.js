import { SITE_ORIGIN, absoluteSiteUrl } from "@/lib/site-config";

export default function robots() {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/alerts/"],
    }],
    sitemap: absoluteSiteUrl("/sitemap.xml"),
    host: SITE_ORIGIN,
  };
}
