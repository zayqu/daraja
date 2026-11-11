import { createHash } from "node:crypto";
import { createAzamPayPublicKeyProvider } from "./azampay-public-key.mjs";
import { verifyAzamPayCallback } from "./azampay-callback-verify.mjs";
import { AzamPayTransportError } from "./azampay-transport.mjs";

const REF = /^drj_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EVENT_DIGEST_PREFIX = "azampay_";
const MAX_RETRIES = 3;

function eventKey(verified) {
  // No raw phone, password, callback body or customer reference stored in event.
  const digest = createHash("sha256").update(
    [verified.environment, verified.reference, verified.providerTransactionId,
      verified.status, verified.operator].join("|"),
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
 * Internal-only callback processor. It creates its own signed proof from a
 * pinned AzamPay sandbox public key and an existing persisted checkout receipt.
 * Never pass a client/browser supplied authenticity flag into settlement.
 *
 * A real sandbox callback MUST confirm that its signed externalreference equals
 * the transactionId from the authenticated checkout initiation response.
 */
export async function processSandboxCallback({
  prisma, apiClient, payload, expectedMerchantId,
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
    throw new SandboxCallbackProcessingError("CALLBACK_UNBOUND");
  }
  // Critical: the request has already been rate/size-bounded by the HTTP
  // route. The transport only uses pinned AzamPay sandbox origins.
  const keyProvider = createAzamPayPublicKeyProvider({ apiClient });
  let verified;
  const valid = await keyProvider.verifyWithRefresh((publicKeyPem) => {
    try {
      verified = verifyAzamPayCallback({
        payload, attempt, publicKeyPem, expectedMode: "sandbox",
      });
      return true;
    } catch {
      return false;
    }
  });
  if (!valid || !verified?.signatureValid) {
    throw new SandboxCallbackProcessingError("CALLBACK_SIGNATURE_OR_BINDING_INVALID");
  }
  // A signed notification authenticates the sender but is NOT an independent
  // authoritative collection-status lookup. The receipt has not been
  // independently reconciled against AzamPay's collection-status API.
  // Record either status for review; NEVER mark a booking PAID here.
  // In particular, a callback's unsigned merchant/amount fields cannot
  // upgrade it to an authoritative server-to-server confirmation.
  const key = eventKey(verified);
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const current = await tx.paymentAttempt.findUnique({
          where: { id: attempt.id },
          include: { booking: true },
        });
        if (!current || current.reference !== attempt.reference ||
            current.providerTransactionId !== verified.providerTransactionId ||
            current.environment !== "sandbox" ||
            !current.booking || current.booking.status !== "APPROVED" ||
            !["PENDING", "UNKNOWN"].includes(current.status)) {
          throw new SandboxCallbackProcessingError("CALLBACK_REQUIRES_MANUAL_REVIEW");
        }
        const existing = await tx.paymentEvent.findUnique({ where: { eventKey: key } });
        if (existing) return Object.freeze({ result: "ALREADY_RECORDED", accepted: true });
        await tx.paymentEvent.create({
          data: { attemptId: attempt.id, eventKey: key,
            outcome: verified.status === "SUCCESS" ? "SIGNED_SUCCESS_REVIEW" : "VERIFIED_FAILURE_REVIEW" },
        });
        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: { status: "UNKNOWN", checkoutState: "UNKNOWN" },
        });
        return Object.freeze({
          result: verified.status === "SUCCESS" ? "SUCCESS_REQUIRES_RECONCILIATION" : "FAILURE_REQUIRES_RECONCILIATION",
          accepted: true,
        });
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
