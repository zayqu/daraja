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
    assert.match(page, /authProviders\.includes\("apple"\)/);
    assert.match(page, /<GoogleButton/);
    assert.match(page, /<LinkedInButton/);
    assert.match(page, /<AppleButton/);
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


test("new candidates continue to protected profile setup without changing employer login", async () => {
  const signUp = await read("app/auth/signup/page.js");
  const verify = await read("app/api/account/verify-email/route.js");
  const signIn = await read("app/auth/signin/page.js");
  const login = await read("app/api/account/login/route.js");

  assert.match(signUp, /candidateCareerEnabled\(\) \? "\/account\/profile" : "\/account"/);
  assert.match(signUp, /callbackUrl=\{candidateStart\}/);
  assert.match(signUp, /socialEmployer=/);
  assert.match(signUp, /callbackUrl="\/employer"/);
  assert.match(verify, /user\.role === "JOB_SEEKER" && candidateCareerEnabled\(\)/);
  assert.match(verify, /new URL\(destination, url\)/);
  assert.match(verify, /startSession\(response, request, user\.id\)/);
  assert.match(login, /safeRedirectPath\(body\.callbackUrl, home\)/);
  assert.match(signIn, /safeRedirectPath\(params\?\.callbackUrl, ""\)/);
});


test("Apple sign-in is opt-in, requires both credentials, and never silently links accounts", async () => {
  const auth = await read("auth.js");
  const button = await read("components/auth/AppleButton.js");
  const signup = await read("app/auth/signup/page.js");
  const signin = await read("app/auth/signin/page.js");
  const styles = await read("app/auth/auth.module.css");

  assert.match(auth, /next-auth\/providers\/apple/);
  assert.match(auth, /AUTH_APPLE_ENABLED === "true"/);
  assert.match(auth, /process\.env\.AUTH_APPLE_ID/);
  assert.match(auth, /process\.env\.AUTH_APPLE_SECRET/);
  assert.match(auth, /allowDangerousEmailAccountLinking: false/);
  assert.doesNotMatch(auth, /\["google", "linkedin", "apple"\]/);
  assert.match(button, /signIn\("apple", \{ redirectTo: callbackUrl \}\)/);
  assert.match(signin, /appleEnabled \? \(/);
  assert.match(signin, /callbackUrl=\{callbackUrl \|\| "\/account"\}/);
  assert.match(signup, /callbackUrl=\{candidateStart\}/);
  assert.match(styles, /\.apple \{/);
  assert.match(await read("components/auth/LoginForm.js"), /\/api\/account\/login/);
});


test("Apple form POST is restricted to the exact configured Auth.js callback", async () => {
  const route = await read("app/api/auth/[...nextauth]/route.js");
  assert.match(route, /AUTH_APPLE_ENABLED === "true"/);
  assert.match(route, /url\.pathname === "\/api\/auth\/callback\/apple"/);
  assert.match(route, /application\/x-www-form-urlencoded/);
  assert.match(route, /https:\/\/appleid\.apple\.com/);
  assert.match(route, /handlers\.POST\(request\)/);
  assert.match(route, /protectMutation\(request/);
  assert.match(route, /status: 403/);
});
