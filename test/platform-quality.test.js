const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

test("global response headers enforce the browser security baseline", async () => {
  const { default: config } = await import("../next.config.mjs");
  const entries = await config.headers();
  const headers = Object.fromEntries(
    entries[0].headers.map(({ key, value }) => [key, value])
  );

  assert.equal(entries[0].source, "/(.*)");
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(headers["Content-Security-Policy"], /object-src 'none'/);
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(
    headers["Permissions-Policy"],
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  assert.match(headers["Strict-Transport-Security"], /max-age=31536000/);
});

test("robots rules protect private endpoints and publish the sitemap", async () => {
  const { default: robots } = await import("../app/robots.js");
  const result = robots();

  assert.deepEqual(result.rules[0].disallow, ["/api/", "/alerts/"]);
  assert.equal(
    result.sitemap,
    "https://www.ajira.daraja.co.tz/sitemap.xml"
  );
});

test("public sitemap includes employer entry points only when enabled", async () => {
  const { default: sitemap } = await import("../app/sitemap.js");
  const previousFlag = process.env.EMPLOYER_PORTAL_ENABLED;
  try {
    delete process.env.EMPLOYER_PORTAL_ENABLED;
    const urls = sitemap().map((entry) => entry.url);

    assert.deepEqual(urls, [
      "https://www.ajira.daraja.co.tz",
      "https://www.ajira.daraja.co.tz/jobs",
      "https://www.ajira.daraja.co.tz/about",
      "https://www.ajira.daraja.co.tz/editorial-policy",
      "https://www.ajira.daraja.co.tz/contact",
      "https://www.ajira.daraja.co.tz/privacy",
      "https://www.ajira.daraja.co.tz/terms",
    ]);

    process.env.EMPLOYER_PORTAL_ENABLED = "true";
    assert.ok(
      sitemap().some(
        (entry) => entry.url === "https://www.ajira.daraja.co.tz/post-job"
      )
    );
  } finally {
    if (previousFlag === undefined) delete process.env.EMPLOYER_PORTAL_ENABLED;
    else process.env.EMPLOYER_PORTAL_ENABLED = previousFlag;
  }
});

test("disabled employer entry points are not advertised publicly", async () => {
  const nav = await readFile(
    path.join(__dirname, "..", "components", "PublicSiteNav.js"),
    "utf8"
  );
  const siteNav = await readFile(
    path.join(__dirname, "..", "components", "SiteNav.js"),
    "utf8"
  );
  const home = await readFile(
    path.join(__dirname, "..", "app", "page.js"),
    "utf8"
  );
  const jobsPage = await readFile(
    path.join(__dirname, "..", "app", "jobs", "page.js"),
    "utf8"
  );
  const jobPage = await readFile(
    path.join(__dirname, "..", "app", "jobs", "[id]", "page.js"),
    "utf8"
  );

  assert.match(nav, /showEmployerCta=\{employerPortalEnabled\(\)\}/);
  assert.match(siteNav, /showEmployerCta \? \(/);
  assert.match(home, /const employerEnabled = employerPortalEnabled\(\)/);
  assert.equal((home.match(/\{employerEnabled && \(/g) || []).length, 2);
  assert.match(jobsPage, /showEmployerCta=\{employerPortalEnabled\(\)\}/);
  assert.match(jobPage, /showEmployerCta=\{employerPortalEnabled\(\)\}/);
});

test("every public page provides a valid target for the global skip link", async () => {
  const pages = [
    "app/page.js",
    "app/jobs/JobsPageClient.js",
    "app/jobs/[id]/JobDetailPageClient.js",
    "app/post-job/page.js",
    "app/privacy/page.js",
    "app/alerts/unsubscribe/page.js",
    "app/alerts/unsubscribed/page.js",
    "components/ContentPage.js",
  ];

  for (const page of pages) {
    const source = await readFile(path.join(__dirname, "..", page), "utf8");
    assert.match(source, /<main[\s\S]*?id="main-content"/, page);
  }
});

test("company information pages use the accessible shared content layout", async () => {
  for (const page of [
    "app/about/page.js",
    "app/contact/page.js",
    "app/editorial-policy/page.js",
    "app/terms/page.js",
  ]) {
    const source = await readFile(path.join(__dirname, "..", page), "utf8");
    assert.match(source, /import ContentPage/);
    assert.match(source, /<ContentPage/);
  }
});

test("AdSense publisher authorization is available at the standard path", async () => {
  const adsText = await readFile(
    path.join(__dirname, "..", "public", "ads.txt"),
    "utf8"
  );

  assert.equal(
    adsText.trim(),
    "google.com, pub-5101856964689063, DIRECT, f08c47fec0942fa0"
  );
});

test("advertising remains consent-gated and isolated from application actions", async () => {
  const slot = await readFile(
    path.join(__dirname, "..", "components", "AdSenseSlot.js"),
    "utf8"
  );
  const jobs = await readFile(
    path.join(__dirname, "..", "app", "jobs", "JobsPageClient.js"),
    "utf8"
  );

  assert.match(slot, /consent !== "accepted"/);
  assert.match(slot, /isValidAdSenseSlot/);
  assert.match(slot, /className="adsense-placement"/);
  assert.match(jobs, /Sponsored job-listing advertisement/);
  assert.doesNotMatch(slot, /Apply/);
});

test("Google services use consent mode and privacy-gated Web Vitals", async () => {
  const controls = await readFile(
    path.join(__dirname, "..", "components", "PrivacyControls.js"),
    "utf8"
  );
  const vitals = await readFile(
    path.join(__dirname, "..", "components", "WebVitals.js"),
    "utf8"
  );

  for (const permission of [
    "ad_storage",
    "analytics_storage",
    "ad_user_data",
    "ad_personalization",
  ]) {
    assert.match(controls, new RegExp(permission));
  }
  assert.match(controls, /'denied'/);
  assert.match(vitals, /useReportWebVitals/);
  assert.match(vitals, /CONSENT_STORAGE_KEY/);
});

test("company and legal information is linked from every page", async () => {
  const layout = await readFile(
    path.join(__dirname, "..", "app", "layout.js"),
    "utf8"
  );
  const footer = await readFile(
    path.join(__dirname, "..", "components", "SiteFooterLinks.js"),
    "utf8"
  );

  assert.match(layout, /<SiteFooterLinks \/>/);
  for (const pathName of [
    "/about",
    "/editorial-policy",
    "/contact",
    "/privacy",
    "/terms",
  ]) {
    assert.match(footer, new RegExp(`"${pathName}"`));
  }
});

test("public pages do not depend on runtime Google Fonts imports", async () => {
  const pages = [
    "app/page.js",
    "app/jobs/page.js",
    "app/jobs/[id]/page.js",
    "app/post-job/page.js",
  ];

  for (const page of pages) {
    const source = await readFile(path.join(__dirname, "..", page), "utf8");
    assert.doesNotMatch(source, /fonts\.googleapis\.com/, page);
  }
});
