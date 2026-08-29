const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("protected write boundary rejects cross-site requests and bounds JSON payloads", () => {
  const security = read("lib/request-security.js");

  assert.match(security, /sec-fetch-site/);
  assert.match(security, /fetchSite === "cross-site"/);
  assert.match(security, /allowedOrigins\(request\)/);
  assert.match(security, /process\.env\.AUTH_URL/);
  assert.match(security, /process\.env\.NEXTAUTH_URL/);
  assert.doesNotMatch(security, /x-forwarded-host/);
  assert.match(security, /Content-Type must be application\/json/);
  assert.match(security, /new TextEncoder\(\)\.encode\(raw\)\.byteLength > maxBytes/);
  assert.match(security, /status,.*headers/s);
  assert.match(security, /429/);
  assert.match(security, /Retry-After/);
});

test("privileged mutations can require an explicit canonical origin", () => {
  const security = read("lib/request-security.js");

  assert.match(security, /requireOrigin = false/);
  assert.match(security, /if \(!origin && requireOrigin\)/);
  assert.match(security, /Request origin required\./);
  assert.match(security, /allowedOrigins\(request\)\.has\(new URL\(origin\)\.origin\)/);
});

test("protected account, employer and admin writes use the shared boundary", () => {
  const jsonWriteRoutes = [
    "app/api/candidate/profile/route.js",
    "app/api/candidate/applications/route.js",
    "app/api/candidate/applications/[id]/route.js",
    "app/api/candidate/saved-jobs/route.js",
    "app/api/employer/profile/route.js",
    "app/api/employer/jobs/route.js",
    "app/api/employer/jobs/[id]/route.js",
    "app/api/admin/employers/[id]/route.js",
    "app/api/admin/jobs/[id]/moderate/route.js",
  ];

  for (const file of jsonWriteRoutes) {
    const source = read(file);
    assert.match(source, /readProtectedJson/);
    assert.doesNotMatch(source, /await request\.json\(\)/);
  }

  const alerts = read("app/api/job-alerts/route.js");
  assert.match(alerts, /readProtectedJson/);
  assert.match(alerts, /protectMutation/);
  assert.doesNotMatch(alerts, /await request\.json\(\)/);
});

test("admin moderation writes require explicit origin and a tighter abuse budget", () => {
  const adminRoutes = [
    "app/api/admin/employers/[id]/route.js",
    "app/api/admin/jobs/[id]/moderate/route.js",
  ];

  for (const file of adminRoutes) {
    const source = read(file);
    assert.match(source, /isAdmin\(actor\)/);
    assert.match(source, /requireOrigin: true/);
    assert.match(source, /limit: 20/);
    assert.match(source, /maxBytes: 4_096/);
    assert.match(source, /auditEvent\.create/);
  }
});

test("authentication POST requests use the shared mutation boundary", () => {
  const route = read("app/api/auth/[...nextauth]/route.js");
  assert.match(route, /export const GET = handlers\.GET/);
  assert.match(route, /export async function POST\(request\)/);
  assert.match(route, /protectMutation\(request/);
  assert.match(route, /scope: "authentication"/);
  assert.match(route, /return handlers\.POST\(request\)/);
});

test("existing browser clients send JSON for protected employer writes", () => {
  const profile = read("components/EmployerProfileForm.js");
  const vacancy = read("components/EmployerVacancyForm.js");

  assert.match(profile, /"Content-Type": "application\/json"/);
  assert.match(vacancy, /"Content-Type": "application\/json"/);
});
