import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, generateKeyPairSync, sign } from "node:crypto";
import { verifyAzamPayCallback } from "../lib/payments/azampay-callback-verify.mjs";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
const reference = "drj_" + randomUUID();
const attempt = {
  provider: "AZAMPAY", environment: "sandbox", reference,
  providerTransactionId: "sandboxtxn1234", amountTzs: 30000, currency: "TZS",
};
function signed(fields = {}) {
  const p = {
    utilityref: reference, externalreference: "sandboxtxn1234",
    transactionstatus: "success", operator: "Mpesa", amount: "30000", ...fields,
  };
  p.signature = sign("RSA-SHA256",
    Buffer.from(p.utilityref + p.externalreference + p.transactionstatus + p.operator, "utf8"),
    privateKey).toString("base64");
  return p;
}
const validate = (payload, overrides = {}) => verifyAzamPayCallback({
  payload, attempt, publicKeyPem, ...overrides,
});

test("matching signed callback with checkout-bound ID is accepted for later review", () => {
  assert.deepEqual(validate(signed()), {
    reference, providerTransactionId: "sandboxtxn1234", amountTzs: 30000,
    currency: "TZS", environment: "sandbox", status: "SUCCESS",
    operator: "Mpesa", signatureValid: true,
  });
});

test("unsigned and modified signed references/status fail", () => {
  const good = signed();
  for (const payload of [
    { ...good, signature: undefined }, { ...good, signature: "" },
    { ...good, utilityref: "drj_" + randomUUID() },
    { ...good, externalreference: "sandboxtxn9999" },
    { ...good, transactionstatus: "failure" },
    { ...good, operator: "Tigo" },
  ]) assert.throws(() => validate(payload));
});

test("even a correctly signed callback for another checkout cannot be replayed", () => {
  assert.throws(() => validate(signed({ externalreference: "sandboxtxn9999" })),
    /PROVIDER_REFERENCE_NOT_BOUND/);
});

test("unsigned amount is independently compared against original stored amount", () => {
  for (const value of ["30001", "0", "-1", "3.5", "3e4", "5000001", " 30000", "0030000"]) {
    assert.throws(() => validate({ ...signed(), amount: value }));
  }
});

test("missing checkout transaction ID, mismatched environment or provider fails closed", () => {
  assert.throws(() => validate(signed(), { attempt: { ...attempt, providerTransactionId: null } }),
    /PROVIDER_REFERENCE_NOT_BOUND/);
  assert.throws(() => validate(signed(), { expectedMode: "production" }), /CALLBACK_UNAVAILABLE/);
  assert.throws(() => validate(signed(), { attempt: { ...attempt, provider: "other" } }),
    /CALLBACK_UNAVAILABLE/);
});

test("valid signed failure remains failure, not success", () => {
  assert.equal(validate(signed({ transactionstatus: "failure" })).status, "FAILED");
});

test("wrong public key always rejected", () => {
  const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
  assert.throws(() => validate(signed(), {
    publicKeyPem: other.publicKey.export({ type: "spki", format: "pem" }),
  }), /INVALID_CALLBACK_SIGNATURE/);
});
