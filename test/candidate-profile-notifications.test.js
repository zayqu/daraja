const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("candidate profile page reuses the protected profile API contract", async () => {
  const page = await read("app/account/profile/page.js");
  const form = await read("components/CandidateProfileForm.js");
  const route = await read("app/api/candidate/profile/route.js");
  const shape = await read("lib/candidate-profile.js");

  assert.match(page, /if \(!candidateCareerEnabled\(\)\) notFound\(\)/);
  assert.match(page, /callbackUrl=\/account\/profile/);
  assert.match(page, /candidateProfileSelect/);
  assert.match(form, /fetch\("\/api\/candidate\/profile"/);
  assert.match(form, /method: "PUT"/);
  assert.match(form, /CV and document uploads remain unavailable/);
  assert.match(route, /candidateProfileSelect/);
  assert.match(shape, /candidateProfileFormValue/);
});

test("notification centre is authenticated and does not fabricate unread state", async () => {
  const page = await read("app/account/notifications/page.js");
  const nav = await read("components/SiteNav.js");

  assert.match(page, /callbackUrl=\/account\/notifications/);
  assert.match(page, /You are all caught up/);
  assert.match(page, /will not show fake unread/);
  assert.match(nav, /notificationCount = 0/);
  assert.match(nav, /notificationCount > 0/);
  assert.match(nav, /\/account\/notifications/);
  assert.match(nav, /href="\/account"/);
});
