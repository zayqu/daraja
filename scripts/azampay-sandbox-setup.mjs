#!/usr/bin/env node
// Prepares the SEPARATE database of the AzamPay sandbox test site (the PR #226
// Vercel preview; see docs/AZAMPAY-STAGING-READINESS.md). Run only by
// .github/workflows/azampay-sandbox-setup.yml:
//
//   node scripts/azampay-sandbox-setup.mjs check   refuse anything but the empty test database
//   node scripts/azampay-sandbox-setup.mjs seed    test admin, verified test employer, one test vacancy
//
// It never prints connection strings or passwords.

import pg from "pg";

export const SANDBOX_DATABASE_NAME = "daraja_sandbox";
export const SANDBOX_EMPLOYER_EMAIL = "sandbox-employer@example.com";
export const SANDBOX_JOB_SLUG = "sandbox-test-vacancy";
const MAX_EXISTING_ROWS = 25; // the live database has far more users and jobs

/** Why this connection string must not be used, or null when it is the test database. */
export function sandboxTargetProblem(connectionString) {
  let url;
  try {
    url = new URL(String(connectionString || ""));
  } catch {
    return "SANDBOX_DATABASE_URL is missing or is not a connection string.";
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    return "SANDBOX_DATABASE_URL must be a PostgreSQL connection string.";
  }
  if (decodeURIComponent(url.pathname.replace(/^\//, "")) !== SANDBOX_DATABASE_NAME) {
    return `The test database must be named ${SANDBOX_DATABASE_NAME}; refusing any other database.`;
  }
  return null;
}

/** Refuses a database that already holds real data (more than a handful of users or jobs). */
export function existingDataProblem(counts) {
  const big = Object.entries(counts).filter(([, count]) => count > MAX_EXISTING_ROWS);
  return big.length
    ? `This database already has ${big.map(([table, count]) => `${count} ${table} rows`).join(" and ")}; it is not the empty test database.`
    : null;
}

async function tableCounts(connectionString) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const { rows } = await client.query(
      "select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1)",
      [["User", "Job"]],
    );
    const counts = {};
    for (const { table_name: table } of rows) {
      const result = await client.query(`select count(*)::int as n from "${table}"`);
      counts[table] = result.rows[0].n;
    }
    return counts;
  } finally {
    await client.end();
  }
}

async function check(connectionString) {
  const problem = sandboxTargetProblem(connectionString) ||
    existingDataProblem(await tableCounts(connectionString));
  if (problem) throw new Error(problem);
  console.log(`OK: ${SANDBOX_DATABASE_NAME} is a separate, empty test database.`);
}

async function seed(connectionString) {
  await check(connectionString);
  const [{ hashPassword, normalizeEmail, passwordProblem }, { PrismaClient }, { PrismaPg }] =
    await Promise.all([
      import("../lib/password-crypto.js"),
      import("@prisma/client"),
      import("@prisma/adapter-pg"),
    ]);
  const password = process.env.SANDBOX_TEST_PASSWORD || "";
  const weak = passwordProblem(password);
  if (weak) throw new Error(`SANDBOX_TEST_PASSWORD: ${weak}`);
  const adminEmail = normalizeEmail(process.env.SANDBOX_ADMIN_EMAIL || "admin@daraja.co.tz");
  if (!adminEmail) throw new Error("SANDBOX_ADMIN_EMAIL is not a valid email address.");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const now = new Date();
    const passwordHash = await hashPassword(password);
    const account = (email, role, name) => prisma.user.upsert({
      where: { email },
      update: { role, emailVerified: now, password: passwordHash, suspendedAt: null },
      create: { email, name, role, emailVerified: now, password: passwordHash },
    });
    await account(adminEmail, "ADMIN", "Sandbox admin");
    const employerUser = await account(SANDBOX_EMPLOYER_EMAIL, "EMPLOYER", "Sandbox employer");
    const employer = await prisma.employer.upsert({
      where: { userId: employerUser.id },
      update: { verified: true, verificationStatus: "VERIFIED" },
      create: {
        userId: employerUser.id, companyName: "Daraja Sandbox Test Employer",
        verified: true, verificationStatus: "VERIFIED",
      },
    });
    const deadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await prisma.job.upsert({
      where: { slug: SANDBOX_JOB_SLUG },
      update: { active: true, moderationStatus: "PUBLISHED", deadline, employerId: employer.id },
      create: {
        slug: SANDBOX_JOB_SLUG,
        title: "Sandbox test vacancy (not a real job)",
        company: employer.companyName,
        location: "Dar es Salaam",
        description: "Test vacancy on the separate AzamPay sandbox test site. It is not a real job and is never shown on Ajira.",
        category: "Other", source: "daraja", employerId: employer.id,
        active: true, moderationStatus: "PUBLISHED", deadline,
      },
    });
    // The employer portal is a site setting; switch it on in the test database only.
    await prisma.siteSetting.upsert({
      where: { key: "feature.employerPortal" },
      update: { value: true },
      create: { key: "feature.employerPortal", value: true },
    });
    console.log(`Test admin: ${adminEmail}`);
    console.log(`Test employer: ${SANDBOX_EMPLOYER_EMAIL} (verified, one live test vacancy)`);
    console.log("Both use the password saved in the SANDBOX_TEST_PASSWORD secret.");
  } finally {
    await prisma.$disconnect();
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const command = process.argv[2];
  const connectionString = process.env.DATABASE_URL;
  const run = command === "check" ? check : command === "seed" ? seed : null;
  if (!run) {
    console.error("Usage: node scripts/azampay-sandbox-setup.mjs check|seed");
    process.exit(2);
  }
  run(connectionString).catch((error) => {
    // Messages above never include the connection string or password.
    console.error(`Stopped: ${error.message}`);
    process.exit(1);
  });
}
