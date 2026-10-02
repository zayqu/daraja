const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("root layout mounts the shared mobile dock with iPhone safe-area support", async () => {
  const layout = await read("app/layout.js");
  const dock = await read("components/ui/MobileDock.js");
  const styles = await read("components/ui/MobileDock.module.css");

  assert.match(layout, /MobileDock/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(dock, /aria-label="Mobile navigation"/);
  assert.match(dock, /Home/);
  assert.match(dock, /Jobs/);
  assert.doesNotMatch(dock, /\/account\/notifications/);
  assert.doesNotMatch(dock, /\/account\/profile/);
  assert.match(dock, /Internships/);
  assert.match(dock, /More/);
  assert.match(dock, /PRIVACY_SETTINGS_EVENT/);
  assert.match(dock, /Privacy choices/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /backdrop-filter:/);
  assert.match(styles, /--dock-item-count/);
  assert.doesNotMatch(styles, /linear-gradient|radial-gradient/);
});

test("mobile dock owns public navigation without exposing protected workspaces", async () => {
  const routeRules = await read("lib/mobile-navigation.js");
  const siteNav = await read("components/SiteNav.js");
  const siteNavStyles = await read("components/SiteNav.module.css");

  assert.match(routeRules, /pathname\.startsWith\("\/admin"\)/);
  assert.match(routeRules, /pathname\.startsWith\("\/employer"\)/);
  assert.match(routeRules, /pathname\.startsWith\("\/post-job"\)/);
  assert.match(routeRules, /pathname\.startsWith\("\/auth\/"\)/);
  assert.match(siteNav, /mobileDockEnabledPath/);
  assert.match(siteNav, /styles\.dockManaged/);
  assert.match(siteNavStyles, /\.dockManaged \.toggle/);
  assert.match(siteNavStyles, /\.dockManaged \.links/);
});

test("mobile dock uses centralized Daraja design tokens", async () => {
  const tokens = await read("styles/tokens.css");
  const styles = await read("components/ui/MobileDock.module.css");

  assert.match(tokens, /--mobile-dock-max:/);
  assert.match(tokens, /--mobile-dock-radius:/);
  assert.match(tokens, /--mobile-dock-height:/);
  assert.match(styles, /var\(--mobile-dock-max\)/);
  assert.match(styles, /var\(--mobile-dock-radius\)/);
  assert.match(styles, /var\(--mobile-dock-height\)/);
});
