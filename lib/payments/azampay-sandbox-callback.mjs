import { createHash } from "node:crypto";
import { createAzamPayPublicKeyProvider } from "./azampay-public-key.mjs";
import { azamPayCallbackSignatureValid, bindAzamPayCallback } from "./azampay-callback-verify.mjs";
import { settleVerifiedCollection } from "./collection-settlement.mjs";
import { AzamPayTransportError } from "./azampay-transport.mjs";

const REF = /^drj_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EVENT_DIGEST_PREFIX = "azampay_";
const MAX_RETRIES = 3;
const SETTLEABLE = new Set(["PENDING", "UNKNOWN", "SUCCESS"]);

function eventKey(callback) {
  // No raw phone, password, callback body or customer reference stored in event.
  const digest = createHash("sha256").update(
    [callback.environment, callback.reference, callback.providerTransactionId,
      callback.status, callback.operator].join("|"),
  ).digest("hex");
  return EVENT_DIGEST_PREFIX + digest;
}

export class SandboxCallbackProcessingError extends Error {
  constructor(code) {
    super(code);
    this.name = "SandboxCallbackProcessingError";
    this.code = code;
  }
}

/**
 * Sandbox callback processor following AzamPay's official callback contract
 * (docs/AZAMPAY-PROVIDER-CONTRACT-QUESTIONS.md; owner decision D-037).
 *
 * AzamPay documents no status lookup for incoming (collection) payments: its
 * RSA-signed callback is the provider's payment confirmation. A callback is
 * acted on only when ALL of these hold:
 * - `utilityref` is the reference of a persisted sandbox attempt whose
 *   checkout receipt (transactionId from our authenticated call) is saved;
 * - the signed `externalreference` equals that saved transactionId;
 * - the unsigned amount equals the stored TZS snapshot;
 * - the signature verifies with AzamPay's published key (re-fetched once
 *   when verification fails, as AzamPay instructs).
 *
 * Signed success marks the booking PAID (ready for admin fulfilment) through
 * the settlement owner; admins still post and feature the vacancy manually.
 * Signed failure closes only this attempt as FAILED, so the employer can
 * start a fresh attempt. Never pass a client/browser authenticity flag here.
 */
export async function processSandboxCallback({
  prisma, apiClient, keyProvider, payload, expectedMerchantId,
}) {
  if (!prisma?.paymentAttempt || !prisma.$transaction ||
      apiClient?.mode !== "sandbox" ||
      typeof expectedMerchantId !== "string" || expectedMerchantId.length < 3 ||
      !payload || !REF.test(payload.utilityref || "")) {
    throw new SandboxCallbackProcessingError("CALLBACK_INVALID");
  }
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { reference: payload.utilityref },
    select: {
      id: true, reference: true, provider: true, environment: true,
      providerTransactionId: true, checkoutState: true,
      status: true, amountTzs: true, currency: true, bookingId: true,
    },
  });
  if (!attempt || !attempt.providerTransactionId ||
      !["INITIATED", "UNKNOWN"].includes(attempt.checkoutState) ||
      attempt.environment !== "sandbox" || attempt.provider !== "AZAMPAY") {
    // May be an early callback that raced our checkout receipt: retryable.
    throw new SandboxCallbackProcessingError("CALLBACK_UNBOUND");
  }

  let callback;
  try {
    callback = bindAzamPayCallback({ payload, attempt, expectedMode: "sandbox" });
  } catch {
    throw new SandboxCallbackProcessingError("CALLBACK_SIGNATURE_OR_BINDING_INVALID");
  }
  // The route passes one long-lived key provider (AzamPay asks merchants to
  // cache the key, refreshing about every 24 hours).
  const keys = keyProvider || createAzamPayPublicKeyProvider({ apiClient });
  const signed = await keys.verifyWithRefresh(
    (publicKeyPem) => azamPayCallbackSignatureValid({ callback, publicKeyPem }),
  );
  if (!signed) {
    throw new SandboxCallbackProcessingError("CALLBACK_SIGNATURE_OR_BINDING_INVALID");
  }

  const key = eventKey(callback);
  if (callback.status === "SUCCESS") {
    if (!SETTLEABLE.has(attempt.status)) {
      // e.g. a success after a recorded failure: a person must reconcile it.
      throw new SandboxCallbackProcessingError("CALLBACK_REQUIRES_MANUAL_REVIEW");
    }
    // Merchant identity: the bound transactionId came from a checkout made
    // with our own server credentials. The callback's unsigned clientId and
    // amount are never trusted for this.
    const settled = await settleVerifiedCollection({
      prisma, reference: attempt.reference, expectedMerchantId,
      verifyCollection: async () => ({
        authentic: true, authoritative: true,
        reference: attempt.reference, bookingId: attempt.bookingId,
        amountTzs: callback.amountTzs, currency: callback.currency,
        merchantId: expectedMerchantId, environment: callback.environment,
        status: "SUCCESS", eventKey: key,
        providerTransactionId: callback.providerTransactionId,
      }),
    });
    return Object.freeze({ result: settled.action, accepted: true });
  }
  return recordSignedFailure({ prisma, attempt, callback, key });
}

async function recordSignedFailure({ prisma, attempt, callback, key }) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.paymentEvent.findUnique({ where: { eventKey: key } });
        if (existing) {
          if (existing.attemptId !== attempt.id) {
            throw new SandboxCallbackProcessingError("CALLBACK_EVENT_CONFLICT");
          }
          return Object.freeze({ result: "ALREADY_RECORDED", accepted: true });
        }
        const current = await tx.paymentAttempt.findUnique({ where: { id: attempt.id } });
        if (!current || current.reference !== attempt.reference ||
            current.providerTransactionId !== callback.providerTransactionId ||
            current.environment !== "sandbox" ||
            !["PENDING", "UNKNOWN"].includes(current.status)) {
          // A failure after a recorded success (or another final state) is
          // never applied automatically.
          throw new SandboxCallbackProcessingError("CALLBACK_REQUIRES_MANUAL_REVIEW");
        }
        await tx.paymentEvent.create({
          data: { attemptId: attempt.id, eventKey: key, outcome: "VERIFIED_FAILURE" },
        });
        // Booking stays APPROVED; no second prompt is sent automatically.
        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: { status: "FAILED" },
        });
        return Object.freeze({ result: "PAYMENT_FAILED", accepted: true });
      }, { isolationLevel: "Serializable" });
    } catch (err) {
      if (err?.code === "P2034" && i < MAX_RETRIES - 1) continue;
      if (err?.code === "P2002") {
        throw new SandboxCallbackProcessingError("CALLBACK_EVENT_CONFLICT");
      }
      throw err;
    }
  }
  throw new AzamPayTransportError("CALLBACK_TRANSACTION_CONFLICT");
}
