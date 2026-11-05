const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const read = (p) => readFileSync(path.join(__dirname, "..", p), "utf8");

test("campaign mutations require admin, consent, verified partner and official approved destination", () => {
  const route = read("app/api/admin/distribution-campaigns/route.js");
  assert.match(route, /isAdmin\(actor\)/);
  assert.match(route, /requireOrigin: true/);
  assert.match(route, /partnerApproved !== true/);
  assert.match(route, /approvalReference/);
  assert.match(route, /verificationStatus !== "VERIFIED"/);
  assert.match(route, /job\.employerId !== body\.employerId/);
  assert.match(route, /const jobId = typeof body\.jobId/);
  assert.match(route, /body\.destinationMode === "AJIRA_LANDING" && !jobId/);
  assert.match(route, /new URL\(body\.destinationUrl\)/);
  assert.match(route, /moderationStatus !== "PUBLISHED"/);
  assert.match(route, /destination\.protocol !== "https:"/);
  assert.match(route, /auditEvent\.create/);
});

test("agency campaign can send applicants directly to their own ATS", () => {
  const schema = read("prisma/schema.prisma");
  const editor = read("components/admin/DistributionCampaignManager.js");
  assert.match(schema, /model DistributionCampaign/);
  assert.match(schema, /destinationUrl\s+String/);
  assert.match(schema, /vacancyTitle\s+String/);
  assert.match(schema, /jobId\s+String\?/);
  assert.match(schema, /destinationMode\s+String/);
  assert.match(editor, /PARTNER_DIRECT/);
  assert.match(editor, /AJIRA_LANDING/);
  assert.match(editor, /utm_campaign/);
  assert.match(editor, /whatsapp_channel/);
  assert.match(editor, /Direct to partner website \/ ATS/);
  assert.match(editor, /destinationMode === "AJIRA_LANDING" \?/);
});

test("reports are tenant-isolated, missing values are unavailable, and GA4 cannot be invented", () => {
  const report = read("app/employer/campaigns/[id]/report/page.js");
  const list = read("app/employer/campaigns/page.js");
  const mutations = read("app/api/admin/distribution-campaigns/route.js");
  assert.match(report, /employerId: actor\.employer\.id/);
  assert.match(list, /employerId: actor\.employer\.id/);
  assert.match(report, /"Unavailable"/);
  assert.match(mutations, /"ga4Sessions"/);
  assert.match(mutations, /GA4 statistics must come from a verified integration/);
  assert.match(report, /partner-reported/);
  assert.match(report, /not a recruitment agent/);
});

test("schema migration adds a separate private campaign table without touching applicants", () => {
  const sql = read("prisma/migrations/20261105120000_distribution_campaign_reporting/migration.sql");
  assert.match(sql, /CREATE TABLE "DistributionCampaign"/);
  assert.match(sql, /FOREIGN KEY \("employerId"\)/);
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE|DELETE FROM|ALTER TABLE "Application"/);
});

test("public advertising copy does not compete with recruitment agency ATS", () => {
  const page = read("app/advertise/page.js");
  assert.match(page, /Recruitment agencies and employers retain their own application websites/);
  assert.match(page, /directly to your official careers website or ATS/);
  assert.match(page, /We do not collect candidates or act as a recruiter/);
});
