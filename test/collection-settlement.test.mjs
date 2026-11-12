import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { settleVerifiedCollection } from "../lib/payments/collection-settlement.mjs";

const reference = `drj_${randomUUID()}`;
const now = () => new Date("2026-11-10T12:30:00Z");
const original = () => ({
  id: "attempt1", bookingId: "booking_12345", reference,
  provider: "AZAMPAY", status: "PENDING", providerTransactionId: null,
  amountTzs: 30000, currency: "TZS", environment: "sandbox",
  booking: {
    id: "booking_12345", status: "APPROVED", amountTzs: 30000,
    currency: "TZS",
  },
});
const proof = (overrides = {}) => ({
  authentic: true, authoritative: true,
  eventKey: "collection:receipt12345",
  providerTransactionId: "receipt12345",
  status: "SUCCESS", environment: "sandbox",
  reference, bookingId: "booking_12345", amountTzs: 30000,
  currency: "TZS", merchantId: "merchant123",
  ...overrides,
});
function scenario(overrides = {}) {
  let attempt = overrides.attempt === undefined ? original() : overrides.attempt;
  const eventRecords = new Map();
  const writes = [];
  let transactionCalls = 0;
  const tx = {
    paymentAttempt: {
      findUnique: async () => attempt,
      update: async ({ data }) => { writes.push("attempt"); attempt = { ...attempt, ...data }; },
    },
    paymentEvent: {
      findUnique: async ({ where }) => eventRecords.get(where.eventKey) || null,
      create: async ({ data }) => {
        writes.push("event");
        eventRecords.set(data.eventKey, { id: "event1", ...data });
      },
    },
    promotionBooking: {
      update: async ({ data }) => {
        writes.push("booking");
        attempt.booking = { ...attempt.booking, ...data };
      },
    },
  };
  const db = {
    $transaction: async (callback, opts) => {
      transactionCalls++;
      assert.equal(opts.isolationLevel, "Serializable");
      return callback(tx);
    },
  };
  return {
    db, writes, eventRecords,
    get transactionCalls() { return transactionCalls; },
    get attempt() { return attempt; },
  };
}
function invoke(s, overrides = {}) {
  const { verification, ...rest } = overrides;
  return settleVerifiedCollection({
    prisma: s.db, reference, expectedMerchantId: "merchant123",
    verifyCollection: async () => verification ?? proof(), now, ...rest,
  });
}

test("only verified matching server-to-server status settles and creates ledger event", async () => {
  const s = scenario();
  assert.deepEqual(await invoke(s), { action: "READY_FOR_ADMIN_FULFILMENT", reference });
  assert.deepEqual(s.writes, ["event", "attempt", "booking"]);
  assert.equal(s.attempt.status, "SUCCESS");
  assert.equal(s.attempt.booking.status, "PAID");
  assert.equal(s.attempt.booking.paidAt.toISOString(), now().toISOString());
  assert.equal(s.attempt.providerTransactionId, "receipt12345");
  assert.equal(s.eventRecords.size, 1);
});

test("replayed identical status never creates another event or fulfils again", async () => {
  const s = scenario();
  await invoke(s);
  assert.deepEqual(await invoke(s), { action: "ALREADY_PAID", reference });
  assert.equal(s.eventRecords.size, 1);
  assert.equal(s.writes.length, 3);
});

test("duplicate confirmation after admin fulfilment is acknowledged without writes", async () => {
  const s = scenario();
  await invoke(s);
  s.attempt.booking = { ...s.attempt.booking, status: "FULFILLED" };
  assert.deepEqual(await invoke(s), { action: "ALREADY_PAID", reference });
  assert.equal(s.writes.length, 3);
  // A first confirmation for a booking that is no longer payable still fails.
  const cancelled = scenario();
  cancelled.attempt.booking.status = "CANCELLED";
  await assert.rejects(invoke(cancelled), /BOOKING_STATE_CONFLICT/);
  assert.equal(cancelled.writes.length, 0);
});

test("unverified, unsigned or non-success provider responses do not write", async () => {
  for (const change of [
    { authentic: false }, { authoritative: false }, { status: "PENDING" },
    { status: "FAILED" }, { eventKey: "" }, { providerTransactionId: "" },
  ]) {
    const s = scenario();
    await assert.rejects(invoke(s, { verification: proof(change) }), /VERIFICATION_INSUFFICIENT/);
    assert.equal(s.writes.length, 0);
  }
});

test("merchant, amount, currency, booking and environment mismatches fail closed", async () => {
  for (const change of [
    { merchantId: "other" }, { amountTzs: 1 }, { currency: "USD" },
    { bookingId: "other" }, { environment: "production" }, { reference: "wrong" },
  ]) {
    const s = scenario();
    await assert.rejects(invoke(s, { verification: proof(change) }));
    assert.equal(s.writes.length, 0);
  }
});

test("refuses cancelled booking, changed amount and disputed payment statuses", async () => {
  for (const modified of [
    { ...original(), booking: { ...original().booking, status: "CANCELLED" } },
    { ...original(), booking: { ...original().booking, amountTzs: 1 } },
    { ...original(), status: "REFUNDED" },
  ]) {
    const s = scenario({ attempt: modified });
    await assert.rejects(invoke(s));
    assert.equal(s.writes.length, 0);
  }
});

test("rejects conflicting provider transaction ID and reused event ID from another attempt", async () => {
  const s = scenario({ attempt: { ...original(), providerTransactionId: "different" } });
  await assert.rejects(invoke(s), /PROVIDER_REFERENCE_MISMATCH/);
  assert.equal(s.writes.length, 0);
  const replay = scenario();
  replay.eventRecords.set("collection:receipt12345", { attemptId: "other-attempt" });
  await assert.rejects(invoke(replay), /EVENT_REFERENCE_COLLISION/);
  assert.equal(replay.writes.length, 0);
});

test("retries serialization conflicts only, never duplicates side effects outside DB", async () => {
  const s = scenario();
  let calls = 0;
  const wrapper = {
    $transaction: async (fn, opt) => {
      calls++;
      if (calls === 1) throw Object.assign(new Error("serializable retry"), { code: "P2034" });
      return s.db.$transaction(fn, opt);
    },
  };
  const verifiedQueries = [];
  const result = await settleVerifiedCollection({
    prisma: wrapper, reference, expectedMerchantId: "merchant123",
    verifyCollection: async (args) => { verifiedQueries.push(args); return proof(); }, now,
  });
  assert.equal(result.action, "READY_FOR_ADMIN_FULFILMENT");
  assert.equal(calls, 2);
  assert.equal(verifiedQueries.length, 1);
  assert.equal(s.eventRecords.size, 1);
});

test("pg driver adapter conflicts at COMMIT are retried like P2034", async () => {
  // Shape observed from @prisma/adapter-pg with real PostgreSQL 16.
  const adapterConflict = () => Object.assign(new Error("TransactionWriteConflict"), {
    name: "DriverAdapterError",
    cause: { originalCode: "40001", kind: "TransactionWriteConflict" },
  });
  const s = scenario();
  let calls = 0;
  const result = await settleVerifiedCollection({
    prisma: {
      $transaction: async (fn, opt) => {
        calls++;
        if (calls < 3) throw adapterConflict();
        return s.db.$transaction(fn, opt);
      },
    },
    reference, expectedMerchantId: "merchant123", verifyCollection: async () => proof(), now,
  });
  assert.equal(result.action, "READY_FOR_ADMIN_FULFILMENT");
  assert.equal(calls, 3);
  // Retries are bounded; the last conflict is surfaced, never treated as paid.
  const stuck = scenario();
  await assert.rejects(settleVerifiedCollection({
    prisma: { $transaction: async () => { throw adapterConflict(); } },
    reference, expectedMerchantId: "merchant123", verifyCollection: async () => proof(), now,
  }), /TransactionWriteConflict/);
  assert.equal(stuck.writes.length, 0);
});

test("unique constraint conflict is review, not assumed successful payment", async () => {
  const s = scenario();
  await assert.rejects(settleVerifiedCollection({
    prisma: { $transaction: async () => { throw Object.assign(new Error("unique"), { code: "P2002" }); } },
    reference, expectedMerchantId: "merchant123", verifyCollection: async () => proof(), now,
  }), /DUPLICATE_SETTLEMENT_CONFLICT/);
  assert.equal(s.writes.length, 0);
});

test("missing verification function or invalid reference is rejected before DB", async () => {
  const s = scenario();
  await assert.rejects(settleVerifiedCollection({
    prisma: s.db, reference, expectedMerchantId: "merchant123",
  }), /VERIFIER_NOT_CONFIGURED/);
  await assert.rejects(settleVerifiedCollection({
    prisma: s.db, reference: "INVALID", expectedMerchantId: "merchant123",
    verifyCollection: async () => proof(),
  }), /INVALID_REFERENCE/);
});
