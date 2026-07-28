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

test("public sitemap contains the primary candidate and employer pages", async () => {
  const { default: sitemap } = await import("../app/sitemap.js");
  const urls = sitemap().map((entry) => entry.url);

  assert.deepEqual(urls, [
    "https://www.ajira.daraja.co.tz",
    "https://www.ajira.daraja.co.tz/jobs",
    "https://www.ajira.daraja.co.tz/post-job",
    "https://www.ajira.daraja.co.tz/privacy",
  ]);
});

test("every public page provides a valid target for the global skip link", async () => {
  const pages = [
    "app/page.js",
    "app/jobs/page.js",
    "app/jobs/[id]/page.js",
    "app/post-job/page.js",
    "app/privacy/page.js",
    "app/alerts/unsubscribe/page.js",
    "app/alerts/unsubscribed/page.js",
  ];

  for (const page of pages) {
    const source = await readFile(path.join(__dirname, "..", page), "utf8");
    assert.match(source, /<main[\s\S]*?id="main-content"/, page);
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
