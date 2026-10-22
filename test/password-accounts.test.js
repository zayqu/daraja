import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  hashPassword,
  normalizeEmail,
  passwordProblem,
  safeRedirectPath,
  sessionCookieName,
  verifyPassword,
} from "../lib/password-crypto.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("passwords are salted scrypt hashes that only verify with the right password", async () => {
  const first = await hashPassword("Daraja2026");
  const second = await hashPassword("Daraja2026");
  assert.match(first, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("Daraja2026", first), true);
  assert.equal(await verifyPassword("daraja2026", first), false);
  assert.equal(await verifyPassword("Daraja2026", null), false);
  assert.equal(await verifyPassword("Daraja2026", "plain-text"), false);
});

test("password and email rules", () => {
  assert.equal(passwordProblem("short1"), "Use at least 8 characters.");
  assert.equal(passwordProblem("onlyletters"), "Use letters and at least one number.");
  assert.equal(passwordProblem("12345678"), "Use letters and at least one number.");
  assert.equal(passwordProblem("Daraja2026"), null);
  assert.equal(normalizeEmail("  Name@Example.COM "), "name@example.com");
  assert.equal(normalizeEmail("not-an-email"), "");
});

test("session cookie name follows Auth.js secure-cookie naming", () => {
  const saved = { AUTH_URL: process.env.AUTH_URL, NEXTAUTH_URL: process.env.NEXTAUTH_URL };
  delete process.env.AUTH_URL;
  delete process.env.NEXTAUTH_URL;
  try {
    const plain = new Request("http://localhost:3000/api/account/login");
    assert.equal(sessionCookieName(plain), "authjs.session-token");
    const proxied = new Request("http://127.0.0.1:3000/api/account/login", {
      headers: { "x-forwarded-proto": "https" },
    });
    assert.equal(sessionCookieName(proxied), "__Secure-authjs.session-token");
    process.env.AUTH_URL = "https://ajira.daraja.co.tz";
    assert.equal(sessionCookieName(plain), "__Secure-authjs.session-token");
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("redirects after sign-in stay on Daraja", () => {
  assert.equal(safeRedirectPath("/admin"), "/admin");
  assert.equal(safeRedirectPath("//evil.example"), "/account");
  assert.equal(safeRedirectPath("https://evil.example"), "/account");
  assert.equal(safeRedirectPath("/\\evil.example"), "/account");
});

test("account routes are protected, rate limited and never create admins", () => {
  for (const name of ["login", "register", "forgot-password", "reset-password", "resend-verification"]) {
    const route = read(`app/api/account/${name}/route.js`);
    assert.match(route, /readProtectedJson/);
    assert.match(route, /requireOrigin: true/);
    assert.doesNotMatch(route, /await request\.json\(\)/);
  }
  const register = read("app/api/account/register/route.js");
  assert.doesNotMatch(register, /"ADMIN"/);
  assert.match(register, /emailVerified \|\| existing\._count\.accounts > 0/);
  const login = read("app/api/account/login/route.js");
  assert.match(login, /if \(!user\.emailVerified\)/);
  assert.match(login, /if \(user\.suspendedAt\)/);
  const reset = read("app/api/account/reset-password/route.js");
  assert.match(reset, /session\.deleteMany\(\{ where: \{ userId: user\.id \} \}\)/);
});

test("one-time tokens are stored hashed and replaced on reissue", () => {
  const lib = read("lib/password-auth.js");
  assert.match(lib, /token: hashToken\(token\)/);
  assert.match(lib, /verificationToken\.deleteMany\(\{ where: \{ identifier \} \}\)/);
});

test("suspended accounts cannot sign in with Google either", () => {
  const auth = read("auth.js");
  assert.match(auth, /if \(existing\?\.suspendedAt\) return false/);
  assert.match(auth, /password: null/);
});
