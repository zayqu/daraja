const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("candidate authentication uses the shared Daraja UI without changing provider logic", async () => {
  const signIn = await read("app/auth/signin/page.js");
  const verify = await read("app/auth/verify-request/page.js");
  const styles = await read("app/auth/auth.module.css");

  assert.match(signIn, /authProviders\.includes\("google"\)/);
  assert.match(signIn, /authProviders\.includes\("resend"\)/);
  assert.match(signIn, /signIn\("google"/);
  assert.match(signIn, /signIn\("resend"/);
  assert.match(signIn, /safeCallback/);
  assert.match(signIn, /<PublicSiteNav \/>/);
  assert.match(signIn, /import styles from "\.\.\/auth\.module\.css"/);
  assert.doesNotMatch(signIn, /<style>/);

  assert.match(verify, /<PublicSiteNav \/>/);
  assert.match(verify, /one-time sign-in link/i);
  assert.match(verify, /import styles from "\.\.\/auth\.module\.css"/);
  assert.doesNotMatch(verify, /<style>/);

  assert.match(styles, /\.hero/);
  assert.match(styles, /\.cardWrap/);
  assert.match(styles, /@media \(max-width: 640px\)/);
});
