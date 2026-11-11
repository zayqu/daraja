import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, generateKeyPairSync, sign } from "node:crypto";
import { processSandboxCallback } from "../lib/payments/azampay-sandbox-callback.mjs";
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
      return { success: true, publicKey: pem };
    },
  };
  const prisma = {
    paymentAttempt: tx.paymentAttempt,
    $transaction: async (fn, options) => {
      assert.equal(options.isolationLevel, "Serializable");
      return fn(tx);
    },
  };
  return {
    apiClient, prisma, writes, events,
    get attempt() { return attempt; },
    get keyRequests() { return keyRequests; },
  };
}
function process(s, payload) {
  return processSandboxCallback({
    prisma: s.prisma, apiClient: s.apiClient, payload, expectedMerchantId: "merchantSandbox",
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

test("valid signed success is recorded once but never marks an unconfirmed booking paid", async () => {
  const s = scenario();
  const result = await process(s, callback());
  assert.equal(result.accepted, true);
  assert.equal(result.result, "SUCCESS_REQUIRES_RECONCILIATION");
  assert.deepEqual(s.writes, ["event", "attempt"]);
  assert.equal(s.attempt.status, "UNKNOWN");
  assert.equal(s.attempt.checkoutState, "UNKNOWN");
  assert.equal(s.attempt.booking.status, "APPROVED");
  assert.equal(s.events.size, 1);
  assert.equal([...s.events.values()][0].outcome, "SIGNED_SUCCESS_REVIEW");
  assert.equal((await process(s, callback())).result, "ALREADY_RECORDED");
  assert.equal(s.writes.length, 2);
});

test("valid signed failure is recorded but not settled or retried", async () => {
  const s = scenario();
  const first = await process(s, callback({ transactionstatus: "failure" }));
  assert.equal(first.result, "FAILURE_REQUIRES_RECONCILIATION");
  assert.equal(s.attempt.status, "UNKNOWN");
  assert.equal(s.attempt.checkoutState, "UNKNOWN");
  assert.equal(s.attempt.booking.status, "APPROVED");
  assert.equal(s.events.size, 1);
  assert.equal((await process(s, callback({ transactionstatus: "failure" }))).result, "ALREADY_RECORDED");
});

test("no funds recorded for tampered status, wrong signed ID or unsigned amount", async () => {
  for (const payload of [
    { ...callback(), transactionstatus: "failure" },
    callback({ externalreference: "othertxn98765" }),
    { ...callback(), amount: "30001" },
    { ...callback(), signature: undefined },
  ]) {
    const s = scenario();
    await assert.rejects(process(s, payload), /CALLBACK_SIGNATURE_OR_BINDING_INVALID/);
    assert.equal(s.writes.length, 0);
  }
});

test("unbound attempt and spoofed reference never reach key fetch or ledger", async () => {
  const s = scenario();
  await assert.rejects(process(s, callback({ utilityref: "drj_" + randomUUID() })));
  const noId = scenario();
  noId.prisma.paymentAttempt.findUnique = async () => ({
    ...baseAttempt(), providerTransactionId: null,
  });
  await assert.rejects(process(noId, callback()), /CALLBACK_UNBOUND/);
  assert.equal(noId.keyRequests, 0);
  assert.equal(noId.writes.length, 0);
});
