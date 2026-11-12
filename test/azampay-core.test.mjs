import test from "node:test";
import assert from "node:assert/strict";
import {
  azamPayAvailability,
  validateTzs,
  newAzamPayReference,
  createApprovedPaymentIntent,
  assessVerifiedPayment,
  isSerializationConflict, isUniqueConflict,
} from "../lib/payments/azampay-core.mjs";

const makeIntent = () => createApprovedPaymentIntent({
  bookingId: "booking_12345", approved: true, amountTzs: 30000,
});
function verified(intent, overrides = {}) {
  return {
    authentic: true,
    authoritative: true,
    reference: intent.reference,
    bookingId: intent.bookingId,
    amountTzs: intent.amountTzs,
    currency: "TZS",
    merchantId: "MAZIKU",
    expectedMerchantId: "MAZIKU",
    status: "SUCCESS",
    ...overrides,
  };
}

test("defaults off and requires independent production approval", () => {
  assert.equal(azamPayAvailability({}).enabled, false);
  assert.equal(azamPayAvailability({ AZAMPAY_ENABLED: "true" }).mode, "sandbox");
  assert.equal(azamPayAvailability({ AZAMPAY_ENABLED: "true" }).enabled, true);
  assert.equal(azamPayAvailability({ AZAMPAY_ENABLED: "true", AZAMPAY_MODE: "production" }).enabled, false);
  assert.equal(azamPayAvailability({
    AZAMPAY_ENABLED: "true", AZAMPAY_MODE: "production", AZAMPAY_PRODUCTION_APPROVED: "true",
  }).enabled, true);
});

test("rejects floating-point and otherwise unsafe amounts", () => {
  for (const amount of [-1, 0, 3.5, "30000", NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateTzs(amount));
  }
  assert.equal(validateTzs(30000), 30000);
});

test("creates unique, opaque references", () => {
  assert.notEqual(newAzamPayReference(), newAzamPayReference());
});

test("will not prepare payment for unapproved booking or unsupported currency", () => {
  assert.throws(() => createApprovedPaymentIntent({
    bookingId: "booking_12345", approved: false, amountTzs: 30000,
  }));
  assert.throws(() => createApprovedPaymentIntent({
    bookingId: "booking_12345", approved: true, amountTzs: 30000, currency: "USD",
  }));
});

test("marks verified matching status paid once", () => {
  const intent = makeIntent();
  const verification = verified(intent);
  assert.equal(assessVerifiedPayment({ intent, verification, expectedMerchantId: "MAZIKU" }).action, "MARK_PAID");
  assert.equal(assessVerifiedPayment({
    intent, verification, expectedMerchantId: "MAZIKU", currentStatus: "SUCCESS",
  }).action, "NOOP");
});

test("rejects unverified, forged, mismatched and unsupported statuses", () => {
  const intent = makeIntent();
  for (const overrides of [
    { authentic: false }, { authoritative: false }, { reference: "bad" },
    { bookingId: "other" }, { amountTzs: 1 }, { currency: "USD" },
    { merchantId: "OTHER" }, { status: "PAID" },
  ]) {
    assert.notEqual(assessVerifiedPayment({
      intent, verification: verified(intent, overrides), expectedMerchantId: "MAZIKU",
    }).action, "MARK_PAID");
  }
});

test("does not silently reverse terminal payment state", () => {
  const intent = makeIntent();
  assert.equal(assessVerifiedPayment({
    intent, verification: verified(intent, { status: "FAILED" }), expectedMerchantId: "MAZIKU", currentStatus: "SUCCESS",
  }).action, "REVIEW");
  assert.equal(assessVerifiedPayment({
    intent, verification: verified(intent, { status: "REFUNDED" }), expectedMerchantId: "MAZIKU", currentStatus: "SUCCESS",
  }).action, "REVIEW");
});

test("serialization and unique conflicts are recognised in engine and pg-adapter forms", () => {
  assert.equal(isSerializationConflict({ code: "P2034" }), true);
  assert.equal(isSerializationConflict({ name: "DriverAdapterError", cause: { kind: "TransactionWriteConflict", originalCode: "40001" } }), true);
  assert.equal(isSerializationConflict({ code: "P2010", meta: { driverAdapterError: { cause: { originalCode: "40001" } } } }), true);
  for (const other of [undefined, null, {}, new Error("network"), { code: "P2002" }, { cause: { originalCode: "23505" } }]) {
    assert.equal(isSerializationConflict(other), false);
  }
  assert.equal(isUniqueConflict({ code: "P2002" }), true);
  assert.equal(isUniqueConflict({ cause: { kind: "UniqueConstraintViolation", originalCode: "23505" } }), true);
  for (const other of [undefined, {}, { code: "P2034" }, { cause: { originalCode: "40001" } }]) {
    assert.equal(isUniqueConflict(other), false);
  }
});
