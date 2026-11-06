// PR-only migration integration: synthetic records in disposable CI PostgreSQL.
// This never runs against Neon or production. Every write is rolled back.
import assert from "node:assert/strict";
import { Client } from "pg";

const url = process.env.DATABASE_URL || "";
if (!url.includes("/daraja_migration_ci?")) {
  throw new Error("Refusing database integration checks outside the disposable CI database");
}
const db = new Client({ connectionString: url });
await db.connect();
try {
  await db.query("BEGIN");
  const stamp = "synthetic-campaign-ci-";
  for (const suffix of ["a", "b"]) {
    await db.query(
      'INSERT INTO "User" ("id", "email", "role", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
      [stamp + "user-" + suffix, stamp + suffix + "@example.invalid", "EMPLOYER"],
    );
    await db.query(
      'INSERT INTO "Employer" ("id", "userId", "companyName", "verified", "verificationStatus", "updatedAt", "createdAt") VALUES ($1, $2, $3, true, $4, NOW(), NOW())',
      [stamp + "employer-" + suffix, stamp + "user-" + suffix, "Synthetic partner " + suffix, "VERIFIED"],
    );
  }
  await db.query(
    'INSERT INTO "Job" ("id", "slug", "title", "company", "location", "description", "category", "source", "employerId", "updatedAt", "createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())',
    [stamp + "job-a", stamp + "job-a", "Synthetic approved vacancy", "Synthetic partner a",
      "Dar es Salaam", "Synthetic testing only", "General", "daraja", stamp + "employer-a"],
  );
  for (const suffix of ["a", "b"]) {
    await db.query(
      'INSERT INTO "DistributionCampaign" ("id", "campaignKey", "employerId", "jobId", "vacancyTitle", "partnerType", "destinationMode", "destinationUrl", "approvedByPartnerAt", "updatedAt", "createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW(),NOW())',
      [stamp + "campaign-" + suffix, "daraja_pilot_synthetic_" + suffix, stamp + "employer-" + suffix,
        suffix === "a" ? stamp + "job-a" : null,
        "Synthetic approved vacancy " + suffix, "RECRUITMENT_AGENCY", "PARTNER_DIRECT",
        "https://example.invalid/careers/" + suffix],
    );
  }
  const scoped = await db.query(
    'SELECT "campaignKey" FROM "DistributionCampaign" WHERE "employerId" = $1',
    [stamp + "employer-a"],
  );
  assert.deepEqual(scoped.rows.map((r) => r.campaignKey), ["daraja_pilot_synthetic_a"]);
  const initial = await db.query(
    'SELECT "outboundRedirects", "ga4Sessions", "reportedApplications" FROM "DistributionCampaign" WHERE "id" = $1',
    [stamp + "campaign-a"],
  );
  assert.equal(initial.rows[0].outboundRedirects, 0);
  assert.equal(initial.rows[0].ga4Sessions, null);
  assert.equal(initial.rows[0].reportedApplications, null);

  await db.query("SAVEPOINT duplicate_campaign");
  let duplicateRejected = false;
  try {
    await db.query(
      'INSERT INTO "DistributionCampaign" ("id", "campaignKey", "employerId", "vacancyTitle", "partnerType", "destinationUrl", "approvedByPartnerAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())',
      [stamp + "duplicate", "daraja_pilot_synthetic_a", stamp + "employer-b",
        "Synthetic duplicate", "RECRUITMENT_AGENCY", "https://example.invalid/duplicate"],
    );
  } catch (error) {
    duplicateRejected = error.code === "23505";
  }
  await db.query("ROLLBACK TO SAVEPOINT duplicate_campaign");
  assert(duplicateRejected, "Campaign keys must be globally unique");

  await db.query('DELETE FROM "Job" WHERE "id" = $1', [stamp + "job-a"]);
  const afterJob = await db.query(
    'SELECT "jobId" FROM "DistributionCampaign" WHERE "id" = $1', [stamp + "campaign-a"],
  );
  assert.equal(afterJob.rows[0].jobId, null, "Deleting an optional Ajira listing must retain the campaign");

  await db.query('DELETE FROM "Employer" WHERE "id" = $1', [stamp + "employer-a"]);
  const erased = await db.query(
    'SELECT count(*)::int AS count FROM "DistributionCampaign" WHERE "employerId" = $1',
    [stamp + "employer-a"],
  );
  assert.equal(erased.rows[0].count, 0, "Employer account erasure must remove its campaign records");
  const untouched = await db.query(
    'SELECT count(*)::int AS count FROM "DistributionCampaign" WHERE "employerId" = $1',
    [stamp + "employer-b"],
  );
  assert.equal(untouched.rows[0].count, 1, "Erasure of one partner cannot erase another's records");
  console.log("Synthetic campaign tenancy, defaults, uniqueness and erasure checks passed.");
} finally {
  await db.query("ROLLBACK");
  await db.end();
}
