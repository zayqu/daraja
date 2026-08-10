import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  entitlementDecision,
  limitsForPlan,
  planAvailableToRole,
  sandboxCheckoutEnabled,
} from "../lib/entitlements.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("plan limits are deterministic and unknown plans fall back to free", () => {
  assert.deepEqual(limitsForPlan("UNKNOWN"), limitsForPlan("FREE"));
  assert.deepEqual(entitlementDecision({ plan: "EMPLOYER_BASIC", key: "activeVacancies", used: 4 }), {
    allowed: true,
    limit: 5,
    remaining: 1,
  });
  assert.equal(entitlementDecision({ plan: "EMPLOYER_BASIC", key: "activeVacancies", used: 5 }).allowed, false);
  assert.equal(entitlementDecision({ plan: "FREE", key: "missing", used: 0 }).allowed, false);
});

test("paid plans are restricted to the matching account role", () => {
  assert.equal(planAvailableToRole("EMPLOYER_BASIC", "EMPLOYER"), true);
  assert.equal(planAvailableToRole("EMPLOYER_BASIC", "JOB_SEEKER"), false);
  assert.equal(planAvailableToRole("JOB_SEEKER_PREMIUM", "JOB_SEEKER"), true);
});

test("checkout is enabled only for the internal sandbox configuration", () => {
  const previous = {
    billing: process.env.BILLING_ENABLED,
    environment: process.env.PAYMENT_ENVIRONMENT,
    provider: process.env.SANDBOX_PAYMENT_PROVIDER,
  };
  try {
    process.env.BILLING_ENABLED = "true";
    process.env.PAYMENT_ENVIRONMENT = "sandbox";
    process.env.SANDBOX_PAYMENT_PROVIDER = "internal-test";
    assert.equal(sandboxCheckoutEnabled(), true);
    process.env.PAYMENT_ENVIRONMENT = "live";
    assert.equal(sandboxCheckoutEnabled(), false);
  } finally {
    for (const [key, value] of Object.entries({
      BILLING_ENABLED: previous.billing,
      PAYMENT_ENVIRONMENT: previous.environment,
      SANDBOX_PAYMENT_PROVIDER: previous.provider,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("sandbox checkout hashes idempotency keys and never creates a live payment", () => {
  const route = read("app/api/billing/checkout/route.js");
  const entitlements = read("lib/entitlements.js");
  assert.match(route, /createHash\("sha256"\)/);
  assert.match(route, /environment: "SANDBOX"/);
  assert.match(route, /provider: "internal-test"/);
  assert.match(route, /error\?\.code === "P2002"/);
  assert.doesNotMatch(route, /environment: "LIVE"/);
  assert.match(entitlements, /Test-only amounts/);
  assert.match(entitlements, /SANDBOX_PLAN_PRICES_MINOR/);
});

test("sandbox checkout rejects cross-site requests before creating records", () => {
  const route = read("app/api/billing/checkout/route.js");
  assert.match(route, /fetchSite === "cross-site"/);
  assert.match(route, /origin === `\$\{protocol\}:\/\/\$\{host\}`/);
  assert.match(route, /Cross-site checkout is not allowed/);
});

test("invoice reads are user scoped and payment responses exclude sensitive keys", () => {
  const access = read("lib/billing-access.js");
  const checkout = read("app/api/billing/checkout/route.js");
  assert.match(access, /where: \{ userId \}/);
  assert.doesNotMatch(checkout.match(/const paymentSelect = \{[\s\S]*?\};/)?.[0] || "", /idempotencyKey|reference/);
});

test("migration is additive, preserves legacy payments and blocks orphan relations", () => {
  const migration = read("prisma/migrations/20260802133000_entitlements_billing_foundation/migration.sql");
  assert.match(migration, /RAISE EXCEPTION 'Subscription contains orphan user references'/);
  assert.match(migration, /"environment" = 'LEGACY'/);
  assert.match(migration, /"amountMinor" INTEGER/);
  assert.match(migration, /Payment_idempotencyKey_key/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|TRUNCATE/);
});

test("the billing page is runtime dynamic so feature flags are not frozen at build time", () => {
  assert.match(read("app/account/billing/page.js"), /dynamic = "force-dynamic"/);
});
