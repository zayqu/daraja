// HTTP smoke and redirect-counter test against a disposable local PostgreSQL DB.
// Requires the isolated GitHub Actions postgres:17 service. No production credentials.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { Client } from "pg";
import { setTimeout as delay } from "node:timers/promises";

const databaseUrl = process.env.DATABASE_URL || "";
if (!databaseUrl.includes("@127.0.0.1:5432/daraja_migration_ci?")) {
  throw new Error("HTTP campaign tests require the disposable local CI database");
}

const baseUrl = "http://127.0.0.1:3166";
const id = "synthetic-http-campaign-";
const db = new Client({ connectionString: databaseUrl });
const server = spawn(process.execPath, [
  "node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3166",
], {
  env: {
    ...process.env,
    EMPLOYER_PORTAL_ENABLED: "true",
    AUTH_SECRET: "synthetic-disposable-ci-secret-long-enough-for-testing",
    AUTH_TRUST_HOST: "true",
    AUTH_URL: baseUrl,
    NEXTAUTH_URL: baseUrl,
    NEXT_PUBLIC_SITE_ORIGIN: baseUrl,
    NEXT_TELEMETRY_DISABLED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let diagnostic = "";
for (const stream of [server.stdout, server.stderr]) {
  stream.on("data", (chunk) => {
    diagnostic = (diagnostic + chunk.toString()).slice(-3000);
  });
}

async function request(path, userAgent = "Mozilla/5.0 test-browser", sessionToken = null) {
  return fetch(baseUrl + path, {
    redirect: "manual",
    headers: { "user-agent": userAgent, ...(sessionToken ? { cookie: `authjs.session-token=${sessionToken}` } : {}) },
    signal: AbortSignal.timeout(15000),
  });
}

async function ready() {
  for (let i = 0; i < 75; i++) {
    if (server.exitCode !== null) throw new Error("Next.js exited before readiness: " + diagnostic);
    try {
      const response = await request("/advertise");
      if (response.ok) return;
    } catch {}
    await delay(1500);
  }
  throw new Error("Next.js failed to become ready: " + diagnostic);
}

await db.connect();
try {
  await db.query(
    'INSERT INTO "User" ("id", "email", "role", "createdAt", "updatedAt") VALUES ($1,$2,$3,NOW(),NOW())',
    [id + "user", id + "user@example.invalid", "EMPLOYER"],
  );
  await db.query(
    'INSERT INTO "Employer" ("id", "userId", "companyName", "verified", "verificationStatus", "updatedAt", "createdAt") VALUES ($1,$2,$3,true,$4,NOW(),NOW())',
    [id + "employer", id + "user", "Synthetic agency", "VERIFIED"],
  );
  await db.query(
    'INSERT INTO "DistributionCampaign" ("id","campaignKey","employerId","vacancyTitle","partnerType","destinationMode","destinationUrl","approvedByPartnerAt","status","publishedAt","updatedAt","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,NOW(),NOW(),NOW())',
    [id + "campaign", "daraja_pilot_synthetichttp", id + "employer", "Synthetic agency role",
      "RECRUITMENT_AGENCY", "PARTNER_DIRECT", "https://example.invalid/careers/test?ref=owned", "LIVE"],
  );

  await db.query(
    'INSERT INTO "User" ("id", "email", "role", "createdAt", "updatedAt") VALUES ($1,$2,$3,NOW(),NOW())',
    [id + "other-user", id + "other@example.invalid", "EMPLOYER"],
  );
  await db.query(
    'INSERT INTO "Employer" ("id", "userId", "companyName", "verified", "verificationStatus", "updatedAt", "createdAt") VALUES ($1,$2,$3,true,$4,NOW(),NOW())',
    [id + "other-employer", id + "other-user", "Synthetic separate agency", "VERIFIED"],
  );
  await db.query(
    'INSERT INTO "DistributionCampaign" ("id","campaignKey","employerId","vacancyTitle","partnerType","destinationMode","destinationUrl","approvedByPartnerAt","status","publishedAt","updatedAt","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,NOW(),NOW(),NOW())',
    [id + "other-campaign", "daraja_pilot_syntheticother", id + "other-employer",
      "Synthetic other confidential vacancy", "RECRUITMENT_AGENCY", "PARTNER_DIRECT",
      "https://example.invalid/careers/other", "LIVE"],
  );
  for (const [suffix, userId] of [["agency", id + "user"], ["other", id + "other-user"]]) {
    await db.query(
      'INSERT INTO "Session" ("id", "sessionToken", "userId", "expires") VALUES ($1,$2,$3,NOW()+interval \'1 hour\')',
      [id + "session-" + suffix, id + "session-token-" + suffix, userId],
    );
  }

  await ready();

  const admin = await request("/admin/distribution-campaigns");
  assert([302, 303, 307, 308].includes(admin.status), "Signed-out admin must redirect to sign in, got " + admin.status);

  const privateReport = await request("/employer/campaigns");
  assert([302, 303, 307, 308].includes(privateReport.status),
    "Signed-out employer reporting must redirect to sign in, got " + privateReport.status);

  const agencyToken = id + "session-token-agency";
  const otherToken = id + "session-token-other";
  const agencyPage = await request("/employer/campaigns", undefined, agencyToken);
  assert.equal(agencyPage.status, 200, "Verified agency must access its private campaign dashboard");
  const agencyBody = await agencyPage.text();
  assert(agencyBody.includes("Synthetic agency role"), "Own campaign must appear");
  assert(!agencyBody.includes("Synthetic other confidential vacancy"), "Other agency campaigns must not appear");
  const otherPage = await request("/employer/campaigns", undefined, otherToken);
  assert.equal(otherPage.status, 200, "Other verified agency must access its own dashboard");
  const otherBody = await otherPage.text();
  assert(otherBody.includes("Synthetic other confidential vacancy"));
  assert(!otherBody.includes("Synthetic agency role"), "Other agency must not see the first partner's campaign");

  const ownReport = await request("/employer/campaigns/" + id + "campaign/report", undefined, agencyToken);
  assert.equal(ownReport.status, 200, "Own printable report must be accessible");
  const otherReport = await request("/employer/campaigns/" + id + "other-campaign/report", undefined, agencyToken);
  assert.equal(otherReport.status, 404, "Other agency's private report must return 404");
  const adminAsPartner = await request("/admin/distribution-campaigns", undefined, agencyToken);
  assert.notEqual(adminAsPartner.status, 200, "Employer must never access administrator controls");

  const missing = await request("/r/daraja_pilot_notfoundhttp");
  assert.equal(missing.status, 404, "Nonexistent campaign must be unavailable");

  const bot = await request("/r/daraja_pilot_synthetichttp", "Googlebot/2.1");
  assert.equal(bot.status, 302);
  let count = await db.query('SELECT "outboundRedirects" FROM "DistributionCampaign" WHERE "id"=$1', [id + "campaign"]);
  assert.equal(count.rows[0].outboundRedirects, 0, "Bot previews must not be counted");

  const referral = await request("/r/daraja_pilot_synthetichttp");
  assert.equal(referral.status, 302);
  const location = new URL(referral.headers.get("location"));
  assert.equal(location.origin, "https://example.invalid");
  assert.equal(location.pathname, "/careers/test");
  assert.equal(location.searchParams.get("ref"), "owned");
  assert.equal(location.searchParams.get("utm_campaign"), "daraja_pilot_synthetichttp");
  assert.equal(location.searchParams.get("utm_medium"), "whatsapp_channel");
  assert.equal(referral.headers.get("referrer-policy"), "no-referrer");
  assert.match(referral.headers.get("cache-control") || "", /no-store/);
  count = await db.query('SELECT "outboundRedirects" FROM "DistributionCampaign" WHERE "id"=$1', [id + "campaign"]);
  assert.equal(count.rows[0].outboundRedirects, 1, "One human-like redirect request must be counted once");

  await db.query('UPDATE "Employer" SET "verificationStatus"=$1 WHERE "id"=$2', ["SUSPENDED", id + "employer"]);
  const suspendedReport = await request("/employer/campaigns/" + id + "campaign/report", undefined, agencyToken);
  assert.equal(suspendedReport.status, 404, "Suspended partner must lose private report access");
  const suspended = await request("/r/daraja_pilot_synthetichttp");
  assert.equal(suspended.status, 404);
  await db.query('UPDATE "Employer" SET "verificationStatus"=$1 WHERE "id"=$2', ["VERIFIED", id + "employer"]);
  await db.query('UPDATE "DistributionCampaign" SET "status"=$1 WHERE "id"=$2', ["CLOSED", id + "campaign"]);
  const closed = await request("/r/daraja_pilot_synthetichttp");
  assert.equal(closed.status, 404);

  console.log("Synthetic HTTP auth gate, redirect, UTM, bot exclusion, tenancy state and closure smoke checks passed.");
} finally {
  server.kill("SIGTERM");
  await db.query('DELETE FROM "Employer" WHERE "id"=$1', [id + "employer"]).catch(() => {});
  await db.query('DELETE FROM "Employer" WHERE "id"=$1', [id + "other-employer"]).catch(() => {});
  await db.query('DELETE FROM "User" WHERE "id"=$1', [id + "user"]).catch(() => {});
  await db.query('DELETE FROM "User" WHERE "id"=$1', [id + "other-user"]).catch(() => {});
  await db.end();
}
