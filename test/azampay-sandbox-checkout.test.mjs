import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { buildSandboxMnoCheckout, parseSandboxCheckoutResponse } from "../lib/payments/azampay-sandbox-checkout.mjs";
const reference = "drj_" + randomUUID();
const attempt = { environment: "sandbox", provider: "AZAMPAY", status: "PENDING",
  providerTransactionId: null, reference, currency: "TZS", amountTzs: 30000 };
const input = (extra={}) => ({ attempt, accountNumber: "255712345678", provider: "Mpesa", ...extra });

test("builds an exact TZS MNO sandbox payload and retains reference", () => {
  assert.deepEqual(buildSandboxMnoCheckout(input()), {
    accountNumber: "255712345678", amount: 30000, currency: "TZS",
    externalId: reference, provider: "Mpesa",
  });
});

test("blocks production, failed/paid attempts and already initiated checkout", () => {
  for (const variant of [
    { environment: "production" },
    { status: "SUCCESS" },
    { status: "UNKNOWN" },
    { providerTransactionId: "previous12345" },
    { currency: "USD" },
    { provider: "SELCom" },
  ]) {
    assert.throws(() => buildSandboxMnoCheckout(input({ attempt: { ...attempt, ...variant } })),
      /CHECKOUT_NOT_ELIGIBLE/);
  }
});

test("rejects unsupported phone and providers, never normalizes silently", () => {
  for (const phone of ["0712345678", "+255712345678", "255112345678", "25571234567", "2557123456789", ""]) {
    assert.throws(() => buildSandboxMnoCheckout(input({ accountNumber: phone })), /CHECKOUT_PHONE_UNSUPPORTED/);
  }
  assert.throws(() => buildSandboxMnoCheckout(input({ provider: "Vodacom" })), /CHECKOUT_NOT_ELIGIBLE/);
});

test("rejects negative, floating point and out of range amounts", () => {
  for (const value of [0, -1, 1.5, "30000", 5000001]) {
    assert.throws(() => buildSandboxMnoCheckout(input({ attempt: { ...attempt, amountTzs: value } })));
  }
});

test("authenticated initiation response stores only provider ID and pending state", () => {
  assert.deepEqual(parseSandboxCheckoutResponse({
    success: true, transactionId: "checkoutid1234", message: "Please confirm",
  }), { providerTransactionId: "checkoutid1234", status: "PENDING" });
});

test("HTTP success without an authenticated checkout transaction ID is not a confirmed initiation", () => {
  for (const payload of [
    undefined, {}, { success: false, transactionId: "checkoutid1234" },
    { success: true }, { success: true, transactionId: "" },
    { success: true, transactionId: "a b" },
  ]) assert.throws(() => parseSandboxCheckoutResponse(payload), /CHECKOUT_RESPONSE_UNCONFIRMED/);
});
