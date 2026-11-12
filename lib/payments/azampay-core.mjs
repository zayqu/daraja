import { randomUUID } from "node:crypto";

const STATES = new Set(["PENDING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED", "UNKNOWN"]);
const TERMINAL = new Set(["SUCCESS", "REFUNDED"]);

/**
 * PostgreSQL serialization failure (SQLSTATE 40001) in a SERIALIZABLE
 * transaction: nothing was committed, so the whole transaction may be retried.
 * The query engine reports it as P2034, but with the pg driver adapter
 * (lib/prisma.js) a conflict found at COMMIT arrives as a DriverAdapterError
 * whose cause is { kind: "TransactionWriteConflict", originalCode: "40001" }.
 */
export function isSerializationConflict(error) {
  const cause = error?.cause || error?.meta?.driverAdapterError?.cause;
  return error?.code === "P2034" ||
    cause?.kind === "TransactionWriteConflict" || cause?.originalCode === "40001";
}

/** Unique-constraint violation (P2002, or the adapter's SQLSTATE 23505 form). */
export function isUniqueConflict(error) {
  const cause = error?.cause || error?.meta?.driverAdapterError?.cause;
  return error?.code === "P2002" ||
    cause?.kind === "UniqueConstraintViolation" || cause?.originalCode === "23505";
}

/** Integration defaults off. Production requires explicit additional approval. */
export function azamPayAvailability(env = process.env) {
  const enabled = env.AZAMPAY_ENABLED === "true";
  const mode = env.AZAMPAY_MODE || "sandbox";
  const validMode = mode === "sandbox" || mode === "production";
  const permitted = enabled && validMode &&
    (mode === "sandbox" || env.AZAMPAY_PRODUCTION_APPROVED === "true");
  return Object.freeze({ enabled: permitted, mode, reason: permitted ? null : "AZAMPAY_DISABLED" });
}

/** TZS is represented as whole shillings; no floating-point transaction amounts. */
export function validateTzs(value) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError("Amount must be a positive whole TZS number");
  }
  return value;
}

export function newAzamPayReference() {
  return `drj_${randomUUID()}`;
}

/** The caller must derive approval and amount server-side from the owned booking. */
export function createApprovedPaymentIntent({
  bookingId, approved, amountTzs, currency = "TZS", reference = newAzamPayReference(),
}) {
  if (typeof bookingId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(bookingId)) {
    throw new TypeError("Invalid booking identifier");
  }
  if (approved !== true) throw new Error("Booking is not approved for payment");
  if (currency !== "TZS") throw new Error("Unsupported currency");
  if (typeof reference !== "string" || !/^drj_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(reference)) {
    throw new TypeError("Invalid internal payment reference");
  }
  return Object.freeze({
    bookingId, reference, amountTzs: validateTzs(amountTzs), currency, status: "PENDING",
  });
}

/**
 * Assess only an independently VERIFIED authoritative provider status.
 * Never call this with raw webhook bodies or browser redirects: verification
 * of signature/status, merchant and provider reference MUST happen upstream.
 * No database writes or external calls are performed in this module.
 */
export function assessVerifiedPayment({ intent, verification, expectedMerchantId, currentStatus = "PENDING" }) {
  if (!intent || !verification || verification.authentic !== true || verification.authoritative !== true) {
    return Object.freeze({ action: "REJECT", reason: "UNVERIFIED_PROVIDER_STATUS" });
  }
  if (!STATES.has(currentStatus) || !STATES.has(verification.status)) {
    return Object.freeze({ action: "REJECT", reason: "UNKNOWN_PAYMENT_STATE" });
  }
  if (verification.reference !== intent.reference ||
      verification.bookingId !== intent.bookingId ||
      verification.currency !== intent.currency ||
      verification.amountTzs !== intent.amountTzs ||
      typeof verification.merchantId !== "string" ||
      !verification.merchantId.trim() ||
      typeof expectedMerchantId !== "string" ||
      !expectedMerchantId.trim() ||
      verification.merchantId !== expectedMerchantId) {
    return Object.freeze({ action: "REJECT", reason: "PAYMENT_DETAILS_MISMATCH" });
  }
  if (currentStatus === verification.status) {
    return Object.freeze({ action: "NOOP", reason: "ALREADY_PROCESSED" });
  }
  if (TERMINAL.has(currentStatus)) {
    return Object.freeze({ action: "REVIEW", reason: "TERMINAL_STATE_CHANGE" });
  }
  if (verification.status === "SUCCESS") {
    return Object.freeze({ action: "MARK_PAID", reason: null });
  }
  if (verification.status === "FAILED" || verification.status === "CANCELLED") {
    return Object.freeze({ action: "MARK_UNPAID", reason: null });
  }
  return Object.freeze({ action: "REVIEW", reason: "NON_FINAL_PROVIDER_STATE" });
}
