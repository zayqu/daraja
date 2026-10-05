const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("mobile header owns notification and account icon actions", async () => {
  const publicNav = await read("components/PublicSiteNav.js");
  const nav = await read("components/SiteNav.js");
  const styles = await read("components/SiteNav.module.css");

  assert.match(publicNav, /showCandidateProfile=\{candidateCareerEnabled\(\)\}/);
  assert.match(nav, /href="\/account\/notifications"/);
  assert.match(nav, /aria-label="Notifications"/);
  assert.match(nav, /<NavIcon name="bell" \/>/);
  assert.match(nav, /href="\/account\/profile"/);
  assert.match(nav, /aria-label="Account"/);
  assert.match(nav, /<NavIcon name="user" \/>/);
  assert.match(styles, /\.mobileAccountActions/);
  assert.match(styles, /\.mobileIconButton/);
  assert.match(styles, /\.dockManaged\.nav\s*\{/);
  assert.match(styles, /position:\s*sticky/);
  assert.match(styles, /top:\s*0/);
});

test("mobile account actions are icon-only and keep future unread badge support", async () => {
  const nav = await read("components/SiteNav.js");

  assert.doesNotMatch(nav, />Notifications<\/Link>/);
  assert.doesNotMatch(nav, />Profile<\/Link>/);
  assert.match(nav, /notificationCount = 0/);
  assert.match(nav, /notificationCount > 0/);
  assert.match(nav, /mobileBadge/);
});
