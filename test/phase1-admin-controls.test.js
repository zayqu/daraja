import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("role changes require a labelled explicit Save and confirmation for every role", () => {
  const control = read("components/admin/UserRoleSelect.js");
  const page = read("app/admin/users/page.js");
  assert.match(control, /Save role/);
  assert.match(control, /window\.confirm\(/);
  assert.match(control, /selectedRole !== savedRole/);
  assert.match(control, /onClick=\{save\}/);
  assert.doesNotMatch(control, /onChange=\{\(event\) => change\(/);
  assert.match(page, /userName=\{user\.name \|\| user\.email\}/);
});

test("sources without a configured adapter are listed as planned", () => {
  const page = read("app/admin/sources/page.js");
  assert.match(page, /planned\.map\(\(source\) =>/);
  assert.match(page, /reader not configured/);
  assert.match(page, /catalog\.length/);
});

test("source form provides saved feedback while preventing duplicate in-flight submits", () => {
  const form = read("components/admin/SourceControls.js");
  assert.match(form, /Source added successfully/);
  assert.match(form, /role="status"/);
  assert.match(form, /disabled=\{busy\}/);
  assert.match(form, /setValues\(EMPTY\)/);
});

test("sources from existing jobs remain discoverable even without catalog registration", () => {
  const page = read("app/admin/sources/page.js");
  assert.match(page, /registeredIds/);
  assert.match(page, /unregistered\.map/);
  assert.match(page, /Sources found in existing jobs/);
});

test("duplicate source creation offers a link to the existing record", () => {
  const route = read("app/api/admin/sources/route.js");
  const form = read("components/admin/SourceControls.js");
  const page = read("app/admin/sources/page.js");
  assert.match(route, /existingSourceId/);
  assert.match(form, /Open existing source/);
  assert.match(page, /source-\$\{source\.id\}/);
});

test("mobile account access is available regardless of role", () => {
  const nav = read("components/SiteNav.js");
  const account = read("app/account/page.js");
  assert.match(nav, /showCandidateProfile \|\| account\?\.signedIn/);
  assert.match(account, /signOut/);
});

test("successful category creation clears fields and shows a status message", () => {
  const create = read("components/admin/CategoryControls.js").split("// One row of the category list")[0];
  assert.match(create, /setName\(""\)/);
  assert.match(create, /setKeywords\(""\)/);
  assert.match(create, /added successfully/);
  assert.match(create, /role="status"/);
});

test("source edit does not dismiss its confirmation message immediately", () => {
  const source = read("components/admin/SourceControls.js");
  const form = source.split("// Test / Edit / Delete")[0];
  assert.match(form, /Source updated successfully/);
  assert.doesNotMatch(form, /^\s*onDone\?\.\(\);/m);
});

test("all account subpages use role-aware candidate career navigation", () => {
  for (const path of [
    "app/account/notifications/page.js",
    "app/account/alerts/page.js",
    "app/account/privacy/page.js",
  ]) {
    const source = read(path);
    assert.match(source, /candidateCareerEnabled\(\) && session\.user\.role === "JOB_SEEKER"/);
    assert.match(source, /showCareer=\{careerEnabled\}/);
  }
});
