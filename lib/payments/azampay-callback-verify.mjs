import { verifySignedProviderMessage } from "./provider-signature.mjs";

// Official AzamPay Tanzania callback contract (developerdocs.azampay.co.tz,
// Checkout API > Callback, reviewed 12 Nov 2026; see
// docs/AZAMPAY-PROVIDER-CONTRACT-QUESTIONS.md):
// - `utilityref` is the partner (Daraja) reference: the externalId we sent;
// - `externalreference` is AzamPay's reference for the transaction;
// - `signature` is Base64 RSA-SHA256 (PKCS#1 v1.5) over the UTF-8 string
//   utilityref + externalreference + transactionstatus + operator.
// One schema field note mentions only utilityref + externalreference; the
// documented overview and every official code sample use all four fields,
// and the shorter form would leave the status unsigned, so it is never used.
const REF = /^drj_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SAFE_PROVIDER_ID = /^[A-Za-z0-9:_-]{8,180}$/;
// The operator is part of the signed message. AzamPay documents examples
// (Airtel, Tigo, ...) rather than a closed list, so any plain name is allowed.
const OPERATOR = /^[A-Za-z][A-Za-z0-9 ._-]{1,31}$/;
// The amount is NOT signed. Whole shillings, optionally with a zero fraction
// ("30000.00"), must still equal the stored snapshot exactly.
const AMOUNT = /^(?:0|[1-9][0-9]{0,6})(?:\.0{1,2})?$/;
const MAX_AMOUNT = 5000000;

export class AzamPayCallbackError extends Error {
  constructor(code) {
    super(code);
    this.name = "AzamPayCallbackError";
    this.code = code;
  }
}

function reject(code) {
  throw new AzamPayCallbackError(code);
}

/**
 * Field validation and binding to our own checkout. Needs no network, so a
 * callback for another reference, provider ID or amount is refused before
 * any public-key request is made.
 */
export function bindAzamPayCallback({ payload, attempt, expectedMode = "sandbox" }) {
  if (!payload || Array.isArray(payload) || typeof payload !== "object" ||
      !attempt || attempt.provider !== "AZAMPAY" ||
      attempt.environment !== expectedMode || !["sandbox", "production"].includes(expectedMode)) {
    reject("CALLBACK_UNAVAILABLE");
  }

  const fields = ["utilityref", "externalreference", "transactionstatus", "operator", "signature", "amount"];
  for (const key of fields) {
    // A null/missing signature is never accepted, even though the schema
    // marks the field nullable.
    if (typeof payload[key] !== "string" || !payload[key] || payload[key].length > 8192) {
      reject("INVALID_CALLBACK");
    }
  }
  if (!REF.test(payload.utilityref) || payload.utilityref !== attempt.reference) {
    reject("PAYMENT_REFERENCE_MISMATCH");
  }
  if (!SAFE_PROVIDER_ID.test(payload.externalreference) ||
      !SAFE_PROVIDER_ID.test(attempt.providerTransactionId || "") ||
      payload.externalreference !== attempt.providerTransactionId) {
    // Critical: the signed AzamPay reference MUST match the transactionId
    // saved from our authenticated checkout response. The docs do not say the
    // signing key is per merchant, so this is what stops a genuinely signed
    // callback for someone else's transaction being replayed here.
    reject("PROVIDER_REFERENCE_NOT_BOUND");
  }
  const status = payload.transactionstatus.toLowerCase();
  if (!["success", "failure"].includes(status) || !OPERATOR.test(payload.operator)) {
    reject("INVALID_CALLBACK_STATE");
  }
  if (!AMOUNT.test(payload.amount)) {
    reject("INVALID_CALLBACK_AMOUNT");
  }
  const amountTzs = Number(payload.amount);
  if (!Number.isSafeInteger(amountTzs) || amountTzs < 1 || amountTzs > MAX_AMOUNT ||
      amountTzs !== attempt.amountTzs || attempt.currency !== "TZS") {
    reject("PAYMENT_AMOUNT_MISMATCH");
  }

  return Object.freeze({
    reference: attempt.reference,
    providerTransactionId: attempt.providerTransactionId,
    amountTzs,
    currency: "TZS",
    environment: expectedMode,
    status: status === "success" ? "SUCCESS" : "FAILED",
    operator: payload.operator,
    canonicalMessage: payload.utilityref + payload.externalreference +
      payload.transactionstatus + payload.operator,
    signature: payload.signature,
  });
}

/** RSA-SHA256 check of a bound callback against one trusted AzamPay key. */
export function azamPayCallbackSignatureValid({ callback, publicKeyPem }) {
  return verifySignedProviderMessage({
    canonicalMessage: callback?.canonicalMessage,
    signatureBase64: callback?.signature,
    publicKeyPem,
  });
}

/**
 * Bind + verify in one step. Never interprets a signed failure as success.
 * Settlement decisions belong to azampay-sandbox-callback.mjs.
 */
export function verifyAzamPayCallback({ payload, attempt, publicKeyPem, expectedMode = "sandbox" }) {
  const callback = bindAzamPayCallback({ payload, attempt, expectedMode });
  if (!azamPayCallbackSignatureValid({ callback, publicKeyPem })) {
    reject("INVALID_CALLBACK_SIGNATURE");
  }
  return Object.freeze({
    reference: callback.reference,
    providerTransactionId: callback.providerTransactionId,
    amountTzs: callback.amountTzs,
    currency: callback.currency,
    environment: callback.environment,
    status: callback.status,
    operator: callback.operator,
    signatureValid: true,
  });
}
