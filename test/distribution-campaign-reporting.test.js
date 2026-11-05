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
  assert.match(read("app/r/[campaignKey]/route.js"), /"utm_campaign"/);
  assert.match(read("app/r/[campaignKey]/route.js"), /"whatsapp_channel"/);
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

test("campaign deletion cannot block employer account erasure", () => {
  const schema = read("prisma/schema.prisma");
  const sql = read("prisma/migrations/20261105120000_distribution_campaign_reporting/migration.sql");
  const deletion = read("lib/account-deletion.js");
  assert.match(schema, /employer Employer @relation\(fields: \[employerId\], references: \[id\], onDelete: Cascade\)/);
  assert.match(schema, /job\s+Job\?\s+@relation\(fields: \[jobId\], references: \[id\], onDelete: SetNull\)/);
  assert.match(sql, /REFERENCES "Employer"\("id"\) ON DELETE CASCADE/);
  assert.match(sql, /REFERENCES "Job"\("id"\) ON DELETE SET NULL/);
  assert.match(deletion, /await tx\.employer\.delete/);
});

test("suspended or unverified partners cannot see private reporting", () => {
  for (const p of ["app/employer/campaigns/page.js", "app/employer/campaigns/[id]/report/page.js"]) {
    assert.match(read(p), /actor\.employer\.verificationStatus !== "VERIFIED"/);
  }
});

test("partner outbound redirect is approved, non-indexable, bot-aware and free of applicant data", () => {
  const route = read("app/r/[campaignKey]/route.js");
  assert.match(route, /CAMPAIGN_KEY\.test\(campaignKey\)/);
  assert.match(route, /campaign\.destinationMode !== "PARTNER_DIRECT"/);
  assert.match(route, /campaign\.status !== "LIVE"/);
  assert.match(route, /verificationStatus !== "VERIFIED"/);
  assert.match(route, /destination\.protocol !== "https:"/);
  assert.match(route, /outboundRedirects: \{ increment: 1 \}/);
  assert.match(route, /request\.method === "GET"/);
  assert.match(route, /isLikelyHumanNavigation/);
  assert.match(route, /"Cache-Control", "private, no-store"/);
  assert.match(route, /"Referrer-Policy", "no-referrer"/);
  assert.match(route, /"X-Robots-Tag", "noindex, nofollow"/);
  assert.doesNotMatch(route, /cookies\(\)|request\.headers\.get\("cookie"\)|request\.headers\.get\("x-forwarded-for"\)/);
});

test("isolated CI migration check never uses the production database secret", () => {
  const workflow = read(".github/workflows/cpanel-staging-build.yml");
  assert.match(workflow, /validate-isolated-migrations:/);
  assert.match(workflow, /postgres:17/);
  assert.match(workflow, /DATABASE_URL: postgresql:\/\/migration_ci:/);
  assert.match(workflow, /Apply all migrations to empty, isolated PostgreSQL/);
});
