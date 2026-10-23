const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("sign in and create account share one Daraja auth layout", async () => {
  const signIn = await read("app/auth/signin/page.js");
  const signUp = await read("app/auth/signup/page.js");
  const layout = await read("components/auth/AuthLayout.js");
  const styles = await read("app/auth/auth.module.css");

  for (const page of [signIn, signUp]) {
    assert.match(page, /<AuthLayout/);
    assert.match(page, /authProviders\.includes\("google"\)/);
    assert.match(page, /authProviders\.includes\("linkedin"\)/);
    assert.match(page, /<GoogleButton/);
    assert.match(page, /<LinkedInButton/);
    assert.doesNotMatch(page, /<style>/);
  }
  assert.match(signIn, /<LoginForm/);
  assert.match(signIn, /safeRedirectPath/);
  assert.match(signUp, /<SignupForm/);
  assert.match(layout, /<PublicSiteNav \/>/);
  assert.match(layout, /SurfaceCard/);
  assert.match(styles, /\.split/);
});

test("password pages exist and the email-link sign-in is retired", async () => {
  for (const page of ["check-email", "forgot-password", "reset-password"]) {
    const source = await read(`app/auth/${page}/page.js`);
    assert.match(source, /<AuthLayout/);
  }
  const auth = await read("auth.js");
  assert.doesNotMatch(auth, /providers\/resend/);
  assert.doesNotMatch(auth, /verifyRequest/);
});

test("sign-up offers employer accounts only when the employer portal is on", async () => {
  const signUp = await read("app/auth/signup/page.js");
  const form = await read("components/auth/SignupForm.js");
  assert.match(signUp, /employerEnabled = employerPortalEnabled\(\)/);
  assert.match(form, /\{employerEnabled \? \(/);
});


test("LinkedIn sign-in is identity-only and does not request posting permission", async () => {
  const auth = await read("auth.js");
  const button = await read("components/auth/LinkedInButton.js");
  assert.match(auth, /scope: "openid profile email"/);
  assert.doesNotMatch(auth, /w_member_social/);
  assert.match(button, /signIn\("linkedin"/);
  assert.match(button, /Continue with LinkedIn/);
});
