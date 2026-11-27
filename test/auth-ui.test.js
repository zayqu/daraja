const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function read(relativePath) {
  return readFile(path.join(__dirname, "..", relativePath), "utf8");
}

test("sign in and create account share the Figma split auth layout", async () => {
  const signIn = await read("app/auth/signin/page.js");
  const signUp = await read("app/auth/signup/page.js");
  const layout = await read("components/auth/AuthLayout.js");
  const styles = await read("app/auth/auth.module.css");

  for (const page of [signIn, signUp]) {
    assert.match(page, /<AuthLayout>/);
    assert.match(page, /SOCIAL_ORDER = \["google", "apple", "linkedin"\]/);
    assert.match(page, /authProviders\.includes\(provider\)/);
    assert.match(page, /<ProviderButton/);
    assert.doesNotMatch(page, /<style>/);
    assert.doesNotMatch(page, /Welcome back/i);
  }
  assert.match(signIn, /<LoginForm/);
  assert.match(signIn, /safeRedirectPath/);
  assert.match(signUp, /<SignupForm/);
  assert.match(layout, /brandPanel/);
  assert.match(layout, /\/images\/auth\/woman-job-seeker\.webp/);
  assert.match(layout, /href="\/privacy"/);
  assert.match(layout, /href="\/terms"/);
  assert.match(styles, /\.brandPanel \{/);
});

test("sign-in screens follow the owner's standing rules", async () => {
  const signIn = await read("app/auth/signin/page.js");
  const form = await read("components/auth/SignupForm.js");
  const email = await read("components/auth/EmailOption.js");
  const lastUsed = await read("components/auth/LastUsed.js");
  const login = await read("components/auth/LoginForm.js");

  // No Sign in / Sign up tabs; account type uses option cards, not a tablist.
  assert.doesNotMatch(form, /role="tablist"/);
  assert.doesNotMatch(signIn, /role="tab"/);
  // Email sits behind a "Continue with email" button with no visible fields by default.
  assert.match(email, /Continue with email/);
  assert.match(email, /useState\(defaultOpen\)/);
  assert.match(signIn, /<EmailOption defaultOpen=\{Boolean\(error\) \|\| social\.length === 0\}>/);
  assert.match(form, /<EmailOption label="Sign up with email"/);
  // "Last used" badge, remembered on this device only.
  assert.match(lastUsed, /Last used/);
  assert.match(lastUsed, /localStorage/);
  assert.match(login, /rememberSignInMethod\("email"\)/);
  assert.match(form, /rememberSignInMethod\("email"\)/);
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
  const button = await read("components/auth/ProviderButton.js");
  assert.match(auth, /scope: "openid profile email"/);
  assert.doesNotMatch(auth, /w_member_social/);
  assert.match(button, /signIn\(provider, \{ redirectTo: callbackUrl \}\)/);
  assert.match(button, /linkedin: "Continue with LinkedIn"/);
});


test("new candidates continue to protected profile setup without changing employer sign-up", async () => {
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
  const button = await read("components/auth/ProviderButton.js");
  const styles = await read("app/auth/auth.module.css");

  assert.match(auth, /next-auth\/providers\/apple/);
  assert.match(auth, /AUTH_APPLE_ENABLED === "true"/);
  assert.match(auth, /process\.env\.AUTH_APPLE_ID/);
  assert.match(auth, /process\.env\.AUTH_APPLE_SECRET/);
  assert.match(auth, /allowDangerousEmailAccountLinking: false/);
  assert.match(button, /apple: "Continue with Apple"/);
  assert.match(styles, /\.provider_apple \{/);
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
