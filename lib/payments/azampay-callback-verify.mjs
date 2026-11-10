import { verifySignedProviderMessage } from "./provider-signature.mjs";

// This parser is based on the owner-supplied AzamPay Tanzania v1 hand-off.
// Real callback field mapping MUST be confirmed in sandbox before connecting
// to the database settlement writer. No HTTP callback route is exposed here.
const REF = /^drj_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SAFE_PROVIDER_ID = /^[A-Za-z0-9:_-]{8,180}$/;
const OPERATORS = new Set(["Airtel", "Tigo", "Halopesa", "Azampesa", "Mpesa"]);
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

export function verifyAzamPayCallback({ payload, attempt, publicKeyPem, expectedMode = "sandbox" }) {
  if (!payload || Array.isArray(payload) || typeof payload !== "object" ||
      !attempt || attempt.provider !== "AZAMPAY" ||
      attempt.environment !== expectedMode || !["sandbox", "production"].includes(expectedMode)) {
    reject("CALLBACK_UNAVAILABLE");
  }

  const fields = ["utilityref", "externalreference", "transactionstatus", "operator", "signature", "amount"];
  for (const key of fields) {
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
    // Critical: the signed provider ID MUST match an ID persisted from
    // an authenticated checkout initiation response, not a callback field.
    reject("PROVIDER_REFERENCE_NOT_BOUND");
  }
  const status = payload.transactionstatus.toLowerCase();
  if (!["success", "failure"].includes(status) || !OPERATORS.has(payload.operator)) {
    reject("INVALID_CALLBACK_STATE");
  }
  if (!/^(?:0|[1-9][0-9]{0,6})$/.test(payload.amount)) {
    reject("INVALID_CALLBACK_AMOUNT");
  }
  const amountTzs = Number(payload.amount);
  if (amountTzs < 1 || amountTzs > MAX_AMOUNT || amountTzs !== attempt.amountTzs ||
      attempt.currency !== "TZS") {
    reject("PAYMENT_AMOUNT_MISMATCH");
  }

  const canonicalMessage = payload.utilityref + payload.externalreference +
    payload.transactionstatus + payload.operator;
  if (!verifySignedProviderMessage({
    canonicalMessage, signatureBase64: payload.signature, publicKeyPem,
  })) {
    reject("INVALID_CALLBACK_SIGNATURE");
  }

  // Never interpret a signed failure as a successful collection.
  // Callback success is not connected to the settlement database writer yet:
  // sandbox must establish the provider ID mapping and trusted key lifecycle.
  return Object.freeze({
    reference: attempt.reference,
    providerTransactionId: attempt.providerTransactionId,
    amountTzs,
    currency: "TZS",
    environment: expectedMode,
    status: status === "success" ? "SUCCESS" : "FAILED",
    operator: payload.operator,
    signatureValid: true,
  });
}
