import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, generateKeyPairSync, sign } from "node:crypto";
import { processSandboxCallback } from "../lib/payments/azampay-sandbox-callback.mjs";
import { createAzamPayPublicKeyProvider } from "../lib/payments/azampay-public-key.mjs";
import { sandboxRoutesAvailable } from "../lib/payments/azampay-sandbox-gate.mjs";

const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = pair.publicKey.export({ type: "spki", format: "pem" });
const reference = "drj_" + randomUUID();
const providerId = "sandboxtxn123456";
const bookingId = "booking_12345678";
const baseAttempt = () => ({
  id: "attempt1", reference, bookingId, environment: "sandbox",
  provider: "AZAMPAY", providerTransactionId: providerId,
  checkoutState: "INITIATED", status: "PENDING", amountTzs: 30000, currency: "TZS",
  booking: { id: bookingId, status: "APPROVED", amountTzs: 30000, currency: "TZS" },
});

function callback(change = {}) {
  const data = {
    utilityref: reference,
    externalreference: providerId,
    transactionstatus: "success",
    operator: "Mpesa",
    amount: "30000",
    ...change,
  };
  data.signature = sign("RSA-SHA256", Buffer.from(
    data.utilityref + data.externalreference + data.transactionstatus + data.operator,
  ), pair.privateKey).toString("base64");
  return data;
}
function scenario() {
  let attempt = baseAttempt();
  const events = new Map();
  const writes = [];
  const tx = {
    paymentAttempt: {
      findUnique: async () => attempt,
      update: async ({ data }) => { writes.push("attempt"); attempt = { ...attempt, ...data }; },
    },
    promotionBooking: {
      update: async ({ data }) => {
        writes.push("booking");
        attempt.booking = { ...attempt.booking, ...data };
      },
    },
    paymentEvent: {
      findUnique: async ({ where }) => events.get(where.eventKey) || null,
      create: async ({ data }) => {
        writes.push("event");
        events.set(data.eventKey, { ...data, id: "event1" });
      },
    },
  };
  let keyRequests = 0;
  const apiClient = {
    mode: "sandbox",
    request: async (arg) => {
      keyRequests++;
      assert.equal(arg.path, "/azampay/v1/public-key");
      return { success: true, format: "Pem", publicKey: pem };
    },
  };
  // Mirrors the route: one long-lived key cache per process.
  const keyProvider = createAzamPayPublicKeyProvider({ apiClient });
  const prisma = {
    paymentAttempt: tx.paymentAttempt,
    $transaction: async (fn, options) => {
      assert.equal(options.isolationLevel, "Serializable");
      return fn(tx);
    },
  };
  return {
    apiClient, keyProvider, prisma, writes, events,
    get attempt() { return attempt; },
    get keyRequests() { return keyRequests; },
  };
}
function process(s, payload) {
  return processSandboxCallback({
    prisma: s.prisma, apiClient: s.apiClient, keyProvider: s.keyProvider,
    payload, expectedMerchantId: "merchantSandbox",
  });
}

test("sandbox callback routes fail closed without independent opt-in", () => {
  const env = {
    AZAMPAY_ENABLED: "true", AZAMPAY_MODE: "sandbox",
    AZAMPAY_SANDBOX_ROUTES_ENABLED: "true",
    AZAMPAY_SANDBOX_DEPLOYMENT_APPROVED: "true",
  };
  assert.equal(sandboxRoutesAvailable(env), true);
  assert.equal(sandboxRoutesAvailable({ ...env, AZAMPAY_SANDBOX_ROUTES_ENABLED: "false" }), false);
  assert.equal(sandboxRoutesAvailable({ ...env, AZAMPAY_SANDBOX_DEPLOYMENT_APPROVED: "false" }), false);
  assert.equal(sandboxRoutesAvailable({ ...env, AZAMPAY_MODE: "production", AZAMPAY_PRODUCTION_APPROVED: "true" }), false);
});

test("bound, signed success marks the booking paid exactly once for admin fulfilment", async () => {
  const s = scenario();
  const result = await process(s, callback());
  assert.deepEqual(result, { result: "READY_FOR_ADMIN_FULFILMENT", accepted: true });
  assert.deepEqual(s.writes, ["event", "attempt", "booking"]);
  assert.equal(s.attempt.status, "SUCCESS");
  assert.equal(s.attempt.merchantId, "merchantSandbox");
  assert.equal(s.attempt.booking.status, "PAID");
  assert.equal(s.events.size, 1);
  assert.equal([...s.events.values()][0].outcome, "VERIFIED_SUCCESS");
  // Redelivery is acknowledged without new writes; the key stays cached.
  assert.deepEqual(await process(s, callback()), { result: "ALREADY_PAID", accepted: true });
  assert.equal(s.writes.length, 3);
  assert.equal(s.keyRequests, 1);
});

test("zero-fraction amount and any signed operator name are accepted", async () => {
  const s = scenario();
  const result = await process(s, callback({ operator: "Vodacom", amount: "30000.00" }));
  assert.equal(result.result, "READY_FOR_ADMIN_FULFILMENT");
  assert.equal(s.attempt.booking.status, "PAID");
});

test("signed failure closes only this attempt so the employer can try again", async () => {
  const s = scenario();
  const first = await process(s, callback({ transactionstatus: "failure" }));
  assert.deepEqual(first, { result: "PAYMENT_FAILED", accepted: true });
  assert.deepEqual(s.writes, ["event", "attempt"]);
  assert.equal(s.attempt.status, "FAILED");
  assert.equal(s.attempt.booking.status, "APPROVED");
  assert.equal([...s.events.values()][0].outcome, "VERIFIED_FAILURE");
  assert.equal((await process(s, callback({ transactionstatus: "failure" }))).result, "ALREADY_RECORDED");
  assert.equal(s.writes.length, 2);
});

test("a success after a recorded failure, or a failure after success, needs a person", async () => {
  const failed = scenario();
  await process(failed, callback({ transactionstatus: "failure" }));
  await assert.rejects(process(failed, callback()), /CALLBACK_REQUIRES_MANUAL_REVIEW/);
  assert.equal(failed.attempt.booking.status, "APPROVED");

  const paid = scenario();
  await process(paid, callback());
  await assert.rejects(process(paid, callback({ transactionstatus: "failure" })),
    /CALLBACK_REQUIRES_MANUAL_REVIEW/);
  assert.equal(paid.attempt.status, "SUCCESS");
  assert.equal(paid.attempt.booking.status, "PAID");
});

test("no funds recorded for tampered status, wrong signed ID, unsigned amount or no signature", async () => {
  for (const payload of [
    { ...callback(), transactionstatus: "failure" },
    { ...callback({ transactionstatus: "failure" }), transactionstatus: "success" },
    callback({ externalreference: "othertxn98765" }),
    { ...callback(), amount: "30001" },
    { ...callback(), signature: undefined },
    { ...callback(), signature: null },
  ]) {
    const s = scenario();
    await assert.rejects(process(s, payload), /CALLBACK_SIGNATURE_OR_BINDING_INVALID/);
    assert.equal(s.writes.length, 0);
    assert.equal(s.attempt.booking.status, "APPROVED");
  }
});

test("binding failures never fetch the key; a bad signature refreshes it exactly once", async () => {
  for (const payload of [
    callback({ externalreference: "othertxn98765" }),
    { ...callback(), amount: "30001" },
    callback({ utilityref: "drj_" + randomUUID() }),
  ]) {
    const s = scenario();
    await assert.rejects(process(s, payload));
    assert.equal(s.keyRequests, 0);
  }
  const tampered = scenario();
  await assert.rejects(process(tampered, { ...callback(), transactionstatus: "failure" }));
  assert.equal(tampered.keyRequests, 2);
});

test("unbound attempt never reaches key fetch or ledger", async () => {
  const noId = scenario();
  noId.prisma.paymentAttempt.findUnique = async () => ({
    ...baseAttempt(), providerTransactionId: null,
  });
  await assert.rejects(process(noId, callback()), /CALLBACK_UNBOUND/);
  assert.equal(noId.keyRequests, 0);
  assert.equal(noId.writes.length, 0);

  const notInitiated = scenario();
  notInitiated.prisma.paymentAttempt.findUnique = async () => ({
    ...baseAttempt(), checkoutState: "CLAIMED",
  });
  await assert.rejects(process(notInitiated, callback()), /CALLBACK_UNBOUND/);
  assert.equal(notInitiated.writes.length, 0);
});
