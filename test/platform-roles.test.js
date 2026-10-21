import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { isOwnerEmail, ownerEmails, roleHome } from "../lib/platform-roles.js";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("only the configured owner email is recognised as the owner", () => {
  const saved = process.env.DARAJA_OWNER_EMAILS;
  delete process.env.DARAJA_OWNER_EMAILS;
  try {
    assert.deepEqual(ownerEmails(), ["admin@daraja.co.tz"]);
    assert.equal(isOwnerEmail("Admin@Daraja.co.tz "), true);
    assert.equal(isOwnerEmail("someone@daraja.co.tz"), false);
    assert.equal(isOwnerEmail(""), false);
    process.env.DARAJA_OWNER_EMAILS = "boss@example.com";
    assert.equal(isOwnerEmail("admin@daraja.co.tz"), false);
    assert.equal(isOwnerEmail("boss@example.com"), true);
  } finally {
    if (saved === undefined) delete process.env.DARAJA_OWNER_EMAILS;
    else process.env.DARAJA_OWNER_EMAILS = saved;
  }
});

test("each role opens its own dashboard", () => {
  assert.equal(roleHome("ADMIN"), "/admin");
  assert.equal(roleHome("EMPLOYER", { employerPortal: true }), "/employer");
  assert.equal(roleHome("EMPLOYER", { employerPortal: false }), "/account");
  assert.equal(roleHome("JOB_SEEKER"), "/account");
  assert.equal(roleHome(undefined), "/account");
});

test("the owner admin grant is audited and the account page routes by role", () => {
  const auth = read("auth.js");
  assert.match(auth, /isOwnerEmail\(user\.email\)/);
  assert.match(auth, /OWNER_ADMIN_GRANTED/);
  const account = read("app/account/page.js");
  assert.match(account, /roleHome\(session\.user\.role/);
  assert.match(account, /if \(home !== "\/account"\) redirect\(home\)/);
});

test("admin panel works without the employer portal and still requires ADMIN", () => {
  const page = read("app/admin/page.js");
  assert.doesNotMatch(page, /if \(!employerPortalEnabled\(\)\) notFound\(\)/);
  assert.match(page, /if \(!isAdmin\(actor\)\) notFound\(\)/);
  assert.match(page, /<AdminUserRoles/);
  const moderate = read("app/api/admin/jobs/[id]/moderate/route.js");
  assert.doesNotMatch(moderate, /employerPortalEnabled/);
});

test("role changes are admin-only, audited and cannot touch self or owner", () => {
  const route = read("app/api/admin/users/[id]/route.js");
  assert.match(route, /isAdmin\(actor\)/);
  assert.match(route, /id === actor\.id/);
  assert.match(route, /isOwnerEmail\(target\.email\)/);
  assert.match(route, /USER_ROLE_CHANGED/);
  assert.match(route, /ALLOWED\.has\(role\)/);
});
