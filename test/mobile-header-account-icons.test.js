const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("mobile header offers sign-in to visitors and the bell to candidates", async () => {
  const publicNav = await read("components/PublicSiteNav.js");
  const nav = await read("components/SiteNav.js");
  const styles = await read("components/SiteNav.module.css");

  assert.match(publicNav, /showCandidateProfile=\{candidateCareerEnabled\(\)\}/);
  // Visitors: a sign-in shortcut. Signed-in users reach their account from
  // the dock's Profile/Account/More tab, so the header does not repeat it.
  assert.match(nav, /!account\.signedIn \? \(\s*<Link\s+href="\/auth\/signin"/);
  assert.match(nav, /aria-label="Sign in"/);
  assert.match(nav, /<NavIcon name="user" \/>/);
  assert.doesNotMatch(nav, /aria-label="Account"/);
  // Candidates keep the notifications bell.
  assert.match(nav, /\}\)\.role === "JOB_SEEKER" \? \(\s*<Link\s+href="\/account\/notifications"/);
  assert.match(nav, /aria-label="Notifications"/);
  assert.match(nav, /<NavIcon name="bell" \/>/);
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
