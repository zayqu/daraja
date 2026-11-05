const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const read = (file) => readFile(path.join(__dirname, "..", file), "utf8");

test("pilot page makes no outcome guarantees and keeps candidate applications with employer", async () => {
  const page = await read("app/advertise/page.js");
  assert.match(page, /channel\.followers/);
  assert.match(page, /followersLabel/);
  assert.doesNotMatch(page, /10,166 followers/);
  assert.match(page, /1,000–3,000 views/);
  assert.match(page, /none is guaranteed/);
  assert.match(page, /official application route/);
  assert.doesNotMatch(page, /<form/);
  assert.doesNotMatch(page, /mailto:/);
  assert.match(page, /employerPortalEnabled/);
  assert.match(page, /href="\/employer"/);
});

test("pilot attribution uses a validated WhatsApp campaign and does not fake applications", async () => {
  const detail = await read("app/jobs/[id]/JobDetailPageClient.js");
  assert.match(detail, /utm_source/);
  assert.match(detail, /utm_medium/);
  assert.match(detail, /\^daraja_pilot_/);
  assert.match(detail, /trackEvent\("apply_job"/);
  assert.match(detail, /campaign_id: campaignId/);
  assert.doesNotMatch(detail, /completed_applications:|hire_count:/);
});

test("pilot operating playbook separates Apply clicks from completed applications", async () => {
  const playbook = await read("docs/WHATSAPP-RECRUITMENT-PILOT.md");
  assert.match(playbook, /employer.reported|employer-reported/i);
  assert.match(playbook, /not a completed application/i);
  assert.match(playbook, /restore point/i);
  assert.match(playbook, /production deployment/i);
});

test("channel audience figure is admin-maintained rather than a claimed live API count", async () => {
  const features = await read("lib/features.js");
  const settings = await read("app/admin/settings/page.js");
  const endpoint = await read("app/api/admin/settings/route.js");
  const field = await read("components/admin/SettingField.js");
  assert.match(features, /"channel.followers"/);
  assert.match(features, /type: "number"/);
  assert.match(features, /not an automatic live feed/);
  assert.match(settings, /"channel.followers"/);
  assert.match(endpoint, /Number.isSafeInteger/);
  assert.match(field, /setting.type === "number"/);
});
