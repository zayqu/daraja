import {
  assessVerifiedPayment, isSerializationConflict, isUniqueConflict,
} from "./azampay-core.mjs";

const MAX_ATTEMPTS = 3;
const REF_PATTERN = /^drj_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EVENT_PATTERN = /^[a-zA-Z0-9:_-]{8,180}$/;

export class CollectionSettlementError extends Error {
  constructor(code) {
    super(code);
    this.name = "CollectionSettlementError";
    this.code = code;
  }
}

/**
 * Database-only settlement stage (the single owner of "attempt paid").
 *
 * verifyCollection is a trusted INTERNAL dependency, not a web request body,
 * unsigned callback, client redirect, or an externally supplied boolean. It
 * may only report what AzamPay's documented confirmation channel proved.
 * AzamPay documents no collection-status lookup; its confirmation is the
 * RSA-signed callback, bound to our authenticated checkout receipt by
 * azampay-sandbox-callback.mjs (D-037). Its result is untrusted until it
 * matches all persisted attempt fields below.
 *
 * No money is moved and no vacancy is published or featured here.
 */
export async function settleVerifiedCollection({
  prisma, reference, expectedMerchantId, verifyCollection, now = () => new Date(),
}) {
  if (!prisma?.$transaction || typeof verifyCollection !== "function" ||
      typeof expectedMerchantId !== "string" || !expectedMerchantId.trim()) {
    throw new CollectionSettlementError("VERIFIER_NOT_CONFIGURED");
  }
  if (typeof reference !== "string" || !REF_PATTERN.test(reference)) {
    throw new CollectionSettlementError("INVALID_REFERENCE");
  }

  // External authoritative query occurs outside the database transaction;
  // never put network operations inside a serializable DB transaction.
  const verification = await verifyCollection({ reference });
  if (!verification || typeof verification !== "object" ||
      verification.authentic !== true || verification.authoritative !== true ||
      verification.status !== "SUCCESS" ||
      !EVENT_PATTERN.test(verification.eventKey || "") ||
      typeof verification.providerTransactionId !== "string" ||
      !EVENT_PATTERN.test(verification.providerTransactionId) ||
      verification.reference !== reference) {
    throw new CollectionSettlementError("VERIFICATION_INSUFFICIENT");
  }

  for (let attemptNo = 0; attemptNo < MAX_ATTEMPTS; attemptNo++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const attempt = await tx.paymentAttempt.findUnique({
          where: { reference },
          include: { booking: true },
        });
        if (!attempt || attempt.provider !== "AZAMPAY" ||
            !["sandbox", "production"].includes(attempt.environment) ||
            verification.environment !== attempt.environment ||
            !attempt.booking ||
            attempt.booking.id !== attempt.bookingId) {
          throw new CollectionSettlementError("UNKNOWN_ATTEMPT");
        }

        // A provider transaction ID is bound to exactly one attempt and must
        // not change after first verified observation.
        if (attempt.providerTransactionId &&
            attempt.providerTransactionId !== verification.providerTransactionId) {
          throw new CollectionSettlementError("PROVIDER_REFERENCE_MISMATCH");
        }
        const decision = assessVerifiedPayment({
          intent: {
            reference: attempt.reference, bookingId: attempt.bookingId,
            amountTzs: attempt.amountTzs, currency: attempt.currency,
          },
          verification, expectedMerchantId, currentStatus: attempt.status,
        });
        if (decision.action === "REJECT") {
          throw new CollectionSettlementError(decision.reason);
        }

        // A duplicate callback or reconciliation result is a no-op even if
        // the event is delivered under a new transport request, and even
        // after an admin has moved the booking on (e.g. FULFILLED).
        if (decision.action === "NOOP") {
          return Object.freeze({ action: "ALREADY_PAID", reference });
        }

        // Booking snapshots must match attempt snapshots; a changed price or
        // booking cancellation must never silently activate a paid service.
        if (attempt.booking.amountTzs !== attempt.amountTzs ||
            attempt.booking.currency !== attempt.currency ||
            !["APPROVED", "PAID"].includes(attempt.booking.status)) {
          throw new CollectionSettlementError("BOOKING_STATE_CONFLICT");
        }
        if (decision.action === "REVIEW") {
          throw new CollectionSettlementError("MANUAL_REVIEW_REQUIRED");
        }
        if (decision.action !== "MARK_PAID" ||
            attempt.booking.status !== "APPROVED") {
          throw new CollectionSettlementError("PAYMENT_NOT_ELIGIBLE");
        }

        const existing = await tx.paymentEvent.findUnique({
          where: { eventKey: verification.eventKey },
          select: { id: true, attemptId: true },
        });
        if (existing) {
          if (existing.attemptId !== attempt.id) {
            throw new CollectionSettlementError("EVENT_REFERENCE_COLLISION");
          }
          return Object.freeze({ action: "ALREADY_PROCESSED", reference });
        }

        await tx.paymentEvent.create({
          data: {
            attemptId: attempt.id,
            eventKey: verification.eventKey,
            outcome: "VERIFIED_SUCCESS",
          },
        });
        const paidTime = now();
        if (!(paidTime instanceof Date) || Number.isNaN(paidTime.getTime())) {
          throw new CollectionSettlementError("INVALID_SETTLEMENT_TIME");
        }
        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: "SUCCESS",
            providerTransactionId: verification.providerTransactionId,
            merchantId: expectedMerchantId,
          },
        });
        await tx.promotionBooking.update({
          where: { id: attempt.bookingId },
          data: { status: "PAID", paidAt: paidTime },
        });
        // Admin still controls WhatsApp posting, feature dates and fulfilment.
        return Object.freeze({ action: "READY_FOR_ADMIN_FULFILMENT", reference });
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (isSerializationConflict(error) && attemptNo < MAX_ATTEMPTS - 1) continue;
      // Duplicate unique event/transaction IDs remain fail-closed. They are
      // never interpreted as successful settlement without a fresh DB read.
      if (isUniqueConflict(error)) {
        throw new CollectionSettlementError("DUPLICATE_SETTLEMENT_CONFLICT");
      }
      throw error;
    }
  }
  throw new CollectionSettlementError("SETTLEMENT_CONFLICT");
}
