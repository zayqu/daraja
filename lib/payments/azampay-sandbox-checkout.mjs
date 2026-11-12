import { validateTzs } from "./azampay-core.mjs";
import { AzamPayTransportError } from "./azampay-transport.mjs";

const PROVIDERS = new Set(["Airtel", "Tigo", "Halopesa", "Azampesa", "Mpesa"]);
const REFERENCE = /^drj_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TXN = /^[a-zA-Z0-9:_-]{8,180}$/;
const MAX_AMOUNT = 5_000_000;

/**
 * Validates sandbox MNO collection request parameters. Only values read
 * from the server-side, previously approved booking/attempt may be passed.
 * The payer number must not be persisted in PaymentEvent or raw API logs.
 * No provider request is made by this helper.
 */
export function buildSandboxMnoCheckout({ attempt, accountNumber, provider } = {}) {
  if (!attempt || attempt.environment !== "sandbox" ||
      attempt.provider !== "AZAMPAY" || attempt.status !== "PENDING" ||
      attempt.providerTransactionId ||
      !REFERENCE.test(attempt.reference || "") ||
      attempt.currency !== "TZS" || !PROVIDERS.has(provider)) {
    throw new AzamPayTransportError("CHECKOUT_NOT_ELIGIBLE");
  }
  const amount = validateTzs(attempt.amountTzs);
  if (amount > MAX_AMOUNT) throw new AzamPayTransportError("CHECKOUT_AMOUNT_UNSUPPORTED");

  // AzamPay's docs say only "account number/MSISDN"; their callback example
  // uses 255712345678. Requiring Tanzania E.164 without "+" avoids ambiguous
  // leading-zero conversion. A format AzamPay refuses (HTTP 400) closes the
  // attempt as FAILED, so the employer can retry; see sandboxCheckoutRejected.
  if (typeof accountNumber !== "string" ||
      !/^255[67][0-9]{8}$/.test(accountNumber)) {
    throw new AzamPayTransportError("CHECKOUT_PHONE_UNSUPPORTED");
  }
  return Object.freeze({
    accountNumber, amount, currency: "TZS",
    externalId: attempt.reference, provider,
  });
}

// Official MNO checkout responses: 200, 400, 500. HTTP 400 rejects the
// request; 401/403 refuse our credentials before processing.
const REFUSED_HTTP_STATUSES = new Set([400, 401, 403]);

/**
 * True only when AzamPay definitively did NOT start the checkout, so no
 * payment prompt was sent: HTTP 400/401/403, or HTTP 200 with
 * `success: false` ("transaction initiation is failed" per the official
 * docs). Timeouts, network errors and 5xx stay ambiguous (UNKNOWN).
 */
export function sandboxCheckoutRejected({ error, response } = {}) {
  if (error !== undefined) {
    return error instanceof AzamPayTransportError &&
      REFUSED_HTTP_STATUSES.has(error.httpStatus);
  }
  return response?.success === false;
}

/**
 * Inspects an authenticated successful HTTP response to checkout initiation.
 * This is *not* a paid/settled result. Save the returned transaction ID to
 * the original attempt with compare-and-set DB semantics before handling any
 * callback. Never call checkout again on ambiguous network failure.
 */
export function parseSandboxCheckoutResponse(payload) {
  const id = payload?.transactionId;
  if (payload?.success !== true || typeof id !== "string" ||
      !TXN.test(id)) {
    throw new AzamPayTransportError("CHECKOUT_RESPONSE_UNCONFIRMED");
  }
  return Object.freeze({ providerTransactionId: id, status: "PENDING" });
}
