import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifySignedProviderMessage } from "../lib/payments/provider-signature.mjs";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = publicKey.export({ type: "spki", format: "pem" });
const message = "tx123order789SUCCESSMpesa";
const signature = sign("RSA-SHA256", Buffer.from(message, "utf8"), privateKey).toString("base64");
const input = (overrides = {}) => ({
  canonicalMessage: message,
  signatureBase64: signature,
  publicKeyPem: pem,
  ...overrides,
});

test("valid RSA-SHA256 signature matches exact canonical bytes", () => {
  assert.equal(verifySignedProviderMessage(input()), true);
});

test("missing signature, malformed base64 and missing/untrusted key fail closed", () => {
  for (const payload of [
    { signatureBase64: undefined },
    { signatureBase64: "not base64!" },
    { signatureBase64: "" },
    { publicKeyPem: undefined },
    { publicKeyPem: "bad certificate" },
  ]) {
    assert.equal(verifySignedProviderMessage(input(payload)), false);
  }
});

test("tampered transaction reference, status or operator fail verification", () => {
  for (const changed of ["tx999order789SUCCESSMpesa", "tx123order789FAILEDMpesa", "tx123order789SUCCESSAirtel"]) {
    assert.equal(verifySignedProviderMessage(input({ canonicalMessage: changed })), false);
  }
});

test("wrong key and unsupported algorithms fail closed", () => {
  const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
  assert.equal(verifySignedProviderMessage(input({
    publicKeyPem: other.publicKey.export({ type: "spki", format: "pem" }),
  })), false);
  assert.equal(verifySignedProviderMessage(input({ algorithm: "none" })), false);
});

test("canonical input length is bounded and no callback can be auto-approved", () => {
  assert.equal(verifySignedProviderMessage(input({ canonicalMessage: "" })), false);
  assert.equal(verifySignedProviderMessage(input({ canonicalMessage: "x".repeat(20000) })), false);
});
