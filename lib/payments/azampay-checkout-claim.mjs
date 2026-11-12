import { isUniqueConflict } from "./azampay-core.mjs";
import { AzamPayTransportError } from "./azampay-transport.mjs";
import { parseSandboxCheckoutResponse } from "./azampay-sandbox-checkout.mjs";

function requireOwner(actor) {
  if (!actor?.id || actor.role !== "EMPLOYER") {
    throw new AzamPayTransportError("CHECKOUT_OWNER_REQUIRED");
  }
}

/**
 * Claims a sandbox attempt exactly once before any provider request is sent.
 * This module does not make HTTP requests. All callers must provide a trusted
 * server-side authenticated actor; callers must not accept actor from JSON.
 *
 * A crashed worker leaves CLAIMED in place, intentionally requiring manual
 * reconciliation. It is unsafe to retry blindly when a payment prompt may
 * have been sent but the response was lost.
 */
export async function claimSandboxCheckout({ prisma, actor, attemptId }) {
  requireOwner(actor);
  if (!prisma?.paymentAttempt || typeof attemptId !== "string" || !attemptId) {
    throw new AzamPayTransportError("CHECKOUT_CLAIM_INVALID");
  }
  const result = await prisma.paymentAttempt.updateMany({
    where: {
      id: attemptId,
      environment: "sandbox",
      status: "PENDING",
      checkoutState: "NOT_STARTED",
      provider: "AZAMPAY",
      providerTransactionId: null,
      booking: { ownerUserId: actor.id, status: "APPROVED" },
    },
    data: { checkoutState: "CLAIMED", checkoutClaimedAt: new Date() },
  });
  if (result.count !== 1) {
    throw new AzamPayTransportError("CHECKOUT_ALREADY_CLAIMED");
  }
  return Object.freeze({ claimed: true, attemptId });
}

/**
 * Only the trusted worker which initiated checkout may call this after it
 * receives the authenticated AzamPay response. Atomic compare-and-set avoids
 * overwriting a status already changed by a reconciliation operation.
 */
export async function recordSandboxCheckoutResponse({ prisma, attemptId, response }) {
  if (!prisma?.paymentAttempt || typeof attemptId !== "string" || !attemptId) {
    throw new AzamPayTransportError("CHECKOUT_RECORD_INVALID");
  }
  const receipt = parseSandboxCheckoutResponse(response);
  try {
    const result = await prisma.paymentAttempt.updateMany({
      where: {
        id: attemptId, environment: "sandbox", provider: "AZAMPAY",
        status: "PENDING", checkoutState: "CLAIMED",
        providerTransactionId: null,
      },
      data: {
        checkoutState: "INITIATED",
        providerTransactionId: receipt.providerTransactionId,
      },
    });
    if (result.count !== 1) {
      throw new AzamPayTransportError("CHECKOUT_RECEIPT_CONFLICT");
    }
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw new AzamPayTransportError("CHECKOUT_RECEIPT_CONFLICT");
    }
    throw error;
  }
  return Object.freeze({ attemptId, status: "PENDING" });
}

/**
 * AzamPay definitively refused to start this checkout (see
 * sandboxCheckoutRejected), so no payment prompt was sent. The claimed attempt
 * is closed as FAILED; the employer's next try creates a fresh attempt and
 * reference instead of re-sending this one.
 */
export async function markSandboxCheckoutRejected({ prisma, attemptId }) {
  if (!prisma?.paymentAttempt || typeof attemptId !== "string" || !attemptId) {
    throw new AzamPayTransportError("CHECKOUT_RECORD_INVALID");
  }
  const result = await prisma.paymentAttempt.updateMany({
    where: {
      id: attemptId, environment: "sandbox", status: "PENDING",
      checkoutState: "CLAIMED", providerTransactionId: null,
    },
    data: { status: "FAILED" },
  });
  return Object.freeze({ closed: result.count === 1 });
}

/**
 * Timeout means UNKNOWN, not FAILED. The provider may have accepted funds.
 * All later attempts must be reconciled manually / by a verified provider
 * status endpoint; automatic retries can double-charge.
 */
export async function markSandboxCheckoutUnknown({ prisma, attemptId }) {
  if (!prisma?.paymentAttempt || typeof attemptId !== "string" || !attemptId) {
    throw new AzamPayTransportError("CHECKOUT_RECORD_INVALID");
  }
  const result = await prisma.paymentAttempt.updateMany({
    where: { id: attemptId, environment: "sandbox", status: "PENDING", checkoutState: "CLAIMED" },
    data: { checkoutState: "UNKNOWN", status: "UNKNOWN" },
  });
  return Object.freeze({ requiresReconciliation: result.count === 1 });
}
