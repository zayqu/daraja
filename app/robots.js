export default function robots() {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/alerts/"],
    }],
    sitemap: "https://www.ajira.daraja.co.tz/sitemap.xml",
    host: "https://www.ajira.daraja.co.tz",
  };
}
