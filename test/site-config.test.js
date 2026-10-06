const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile, readdir } = require("node:fs/promises");
const path = require("node:path");

const root = path.join(__dirname, "..");

async function collectFiles(folder, extensions) {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath, extensions)));
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      files.push(fullPath);
    }
  }
  return files;
}

test("public site identity is centralized and environment-overridable", async () => {
  const config = await readFile(path.join(root, "lib", "site-config.js"), "utf8");
  const layout = await readFile(path.join(root, "app", "layout.js"), "utf8");
  const robots = await readFile(path.join(root, "app", "robots.js"), "utf8");
  const sitemap = await readFile(path.join(root, "app", "sitemap.js"), "utf8");

  assert.match(config, /NEXT_PUBLIC_SITE_ORIGIN/);
  assert.match(config, /NEXT_PUBLIC_WHATSAPP_CHANNEL_URL/);
  assert.match(config, /NEXT_PUBLIC_COOKIE_DOMAIN/);
  assert.match(layout, /metadataBase: new URL\(SITE_ORIGIN\)/);
  assert.match(robots, /absoluteSiteUrl\("\/sitemap\.xml"\)/);
  assert.match(sitemap, /SITE_ORIGIN/);
});

test("public UI does not duplicate Daraja origin or WhatsApp channel literals", async () => {
  const roots = ["app", "components"].map((folder) => path.join(root, folder));
  const files = (
    await Promise.all(roots.map((folder) => collectFiles(folder, [".js", ".jsx"])))
  ).flat();

  for (const file of files) {
    const relative = path.relative(root, file);
    const source = await readFile(file, "utf8");

    assert.doesNotMatch(
      source,
      /https:\/\/(?:www\.)?ajira\.daraja\.co\.tz/,
      `${relative} must use lib/site-config instead of a literal Daraja origin`
    );
    assert.doesNotMatch(
      source,
      /https:\/\/whatsapp\.com\/channel\/0029Vanw1OQ1CYoYdxl32g3V/,
      `${relative} must use lib/site-config instead of a literal WhatsApp channel`
    );
  }
});

test("scraper HTTP identity is centralized", async () => {
  const runtime = await readFile(
    path.join(root, "scraper", "lib", "runtime-config.js"),
    "utf8"
  );
  assert.match(runtime, /DARAJA_SCRAPER_USER_AGENT/);
  assert.match(runtime, /SITE_ORIGIN/);

  const scraperRoots = [
    path.join(root, "scraper", "lib"),
    path.join(root, "scraper", "sources"),
  ];
  const files = (
    await Promise.all(
      scraperRoots.map((folder) => collectFiles(folder, [".js"]))
    )
  ).flat();

  for (const file of files) {
    const relative = path.relative(root, file);
    if (relative === path.join("scraper", "lib", "runtime-config.js")) continue;
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /DarajaJobsBot\/1\.0 \(\+https:\/\//,
      `${relative} must use scraper/lib/runtime-config instead of a literal user agent`
    );
  }
});


test("shared WhatsApp config imports use the exported symbol exactly", async () => {
  for (const relative of [
    path.join("components", "JobAlerts.js"),
    path.join("components", "SiteFooter.js"),
    path.join("components", "ui", "MobileDock.js"),
    path.join("app", "jobs", "[id]", "JobDetailPageClient.js"),
  ]) {
    const source = await readFile(path.join(root, relative), "utf8");
    assert.doesNotMatch(source, /WHATSAPP_CHANNEL_URL_URL/);
    assert.match(source, /WHATSAPP_CHANNEL_URL/);
  }
});
