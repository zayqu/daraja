import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("new payment ledger is separate from legacy floating-point Payment model", () => {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model Payment\s*\{[\s\S]*?amount\s+Float/);
  assert.match(schema, /model PromotionBooking\s*\{[\s\S]*?amountTzs\s+Int/);
  assert.match(schema, /model PaymentAttempt\s*\{[\s\S]*?amountTzs\s+Int/);
  assert.match(schema, /model PaymentEvent\s*\{/);
  assert.match(schema, /eventKey\s+String\s+@unique/);
  assert.match(schema, /reference\s+String\s+@unique/);
});

test("migration only adds new structures with amount, currency and environment constraints", () => {
  const sql = read("prisma/migrations/20261110143000_azampay_promotion_payment_ledger/migration.sql");
  assert.doesNotMatch(sql, /\b(DROP|TRUNCATE|DELETE|UPDATE)\b/i);
  for (const table of ["PromotionBooking", "PaymentAttempt", "PaymentEvent"]) {
    assert.match(sql, new RegExp(`CREATE TABLE "${table}"`));
  }
  assert.match(sql, /CHECK \("amountTzs" > 0\)/);
  assert.match(sql, /CHECK \("currency" = 'TZS'\)/);
  assert.match(sql, /CHECK \("environment" IN \('sandbox', 'production'\)\)/);
});

test("account deletion de-identifies booking owners and approval actor", () => {
  const source = read("lib/account-deletion.js");
  assert.match(source, /tx\.promotionBooking\.updateMany\(\{[\s\S]*?where: \{ ownerUserId: userId \}[\s\S]*?ownerUserId: deletionReference/);
  assert.match(source, /tx\.promotionBooking\.updateMany\(\{[\s\S]*?where: \{ approvedById: userId \}[\s\S]*?approvedById: null/);
});

test("account export includes sanitized promotion payment history without provider secrets", () => {
  const source = read("lib/account-data-export.js");
  assert.match(source, /prismaClient\.promotionBooking\.findMany\(/);
  assert.match(source, /promotionBookings,/);
  assert.match(source, /reference: true/);
  assert.doesNotMatch(source, /accessToken:\s*true|clientSecret:\s*true|cardNumber:\s*true/);
});
