const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("LinkedIn sharing is separated from normal sign-in permissions", () => {
  const auth = read("auth.js");
  const linkedin = read("lib/linkedin.js");
  assert.match(auth, /scope: "openid profile email"/);
  assert.doesNotMatch(auth, /w_member_social/);
  assert.match(linkedin, /LINKEDIN_CONNECT_SCOPES = "openid profile w_member_social"/);
  assert.match(linkedin, /\/oauth\/v2\/authorization/);
  assert.match(linkedin, /\/oauth\/v2\/accessToken/);
});

test("LinkedIn sharing tokens are encrypted and never exported", () => {
  const linkedin = read("lib/linkedin.js");
  const schema = read("prisma/schema.prisma");
  const exportSource = read("lib/account-data-export.js");
  assert.match(linkedin, /aes-256-gcm/);
  assert.match(linkedin, /LINKEDIN_TOKEN_ENCRYPTION_KEY/);
  assert.match(schema, /model LinkedInConnection/);
  assert.match(schema, /accessTokenCiphertext String/);
  assert.match(exportSource, /linkedinConnection:/);
  assert.doesNotMatch(exportSource, /accessTokenCiphertext: true/);
});

test("LinkedIn sharing uses state protection, explicit publish and same-origin mutation guards", () => {
  const connect = read("app/api/linkedin/connect/route.js");
  const callback = read("app/api/linkedin/callback/route.js");
  const share = read("app/api/linkedin/share/route.js");
  const disconnect = read("app/api/linkedin/connection/route.js");
  assert.match(connect, /randomBytes\(32\)/);
  assert.match(connect, /httpOnly: true/);
  assert.match(connect, /sameSite: "lax"/);
  assert.match(callback, /state !== expectedState/);
  assert.match(share, /readProtectedJson/);
  assert.match(share, /requireOrigin: true/);
  assert.match(share, /LINKEDIN_POST_PUBLISHED/);
  assert.match(disconnect, /protectMutation/);
  assert.match(disconnect, /requireOrigin: true/);
});

test("LinkedIn publishing follows the self-serve member sharing contract", () => {
  const linkedin = read("lib/linkedin.js");
  assert.match(linkedin, /https:\/\/api\.linkedin\.com\/v2\/ugcPosts/);
  assert.match(linkedin, /X-Restli-Protocol-Version/);
  assert.match(linkedin, /urn:li:person:/);
  assert.match(linkedin, /lifecycleState: "PUBLISHED"/);
  assert.match(linkedin, /MemberNetworkVisibility": "PUBLIC"/);
});

test("LinkedIn connection is part of canonical account erasure", () => {
  const deletion = read("lib/account-deletion.js");
  const migration = read("prisma/migrations/20261023110000_linkedin_sharing_connection/migration.sql");
  assert.match(deletion, /linkedInConnection\.deleteMany/);
  assert.match(migration, /ON DELETE CASCADE/);
});

test("LinkedIn account UI requires an explicit publish action", () => {
  const page = read("app/account/linkedin/page.js");
  const panel = read("components/LinkedInSharePanel.js");
  const account = read("app/account/page.js");
  assert.match(page, /LinkedIn sign-in and LinkedIn posting are separate permissions/);
  assert.match(panel, /Connect LinkedIn for sharing/);
  assert.match(panel, /Review complete — publish to LinkedIn/);
  assert.match(account, /href="\/account\/linkedin"/);
});
