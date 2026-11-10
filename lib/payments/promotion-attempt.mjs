import { createApprovedPaymentIntent, newAzamPayReference } from "./azampay-core.mjs";

const REUSABLE = new Set(["PENDING", "UNKNOWN"]);
const COMPLETE = new Set(["SUCCESS", "REFUNDED"]);
const MAX_RETRIES = 3;

export class PromotionPaymentError extends Error {
  constructor(code) {
    super(code);
    this.name = "PromotionPaymentError";
    this.code = code;
  }
}

/**
 * Prepare a pending payment attempt against an already-approved booking.
 *
 * This function performs database work only. It NEVER calls AzamPay and
 * NEVER marks an attempt paid. Request authentication must happen upstream,
 * but actor identity/ownership is independently enforced here.
 *
 * The caller supplies its Prisma client; the new Prisma models must be
 * present in an approved migrated database before this can run.
 */
export async function preparePromotionPaymentAttempt({
  prisma, actor, bookingId, environment, referenceFactory = newAzamPayReference,
}) {
  if (!prisma || typeof prisma.$transaction !== "function" ||
      !actor?.id || !["EMPLOYER", "ADMIN"].includes(actor.role)) {
    throw new PromotionPaymentError("NOT_AUTHORIZED");
  }
  if (typeof bookingId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(bookingId)) {
    throw new PromotionPaymentError("INVALID_BOOKING_ID");
  }
  if (!["sandbox", "production"].includes(environment)) {
    throw new PromotionPaymentError("INVALID_PAYMENT_ENVIRONMENT");
  }

  for (let iteration = 0; iteration < MAX_RETRIES; iteration++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const booking = await tx.promotionBooking.findUnique({
          where: { id: bookingId },
          select: {
            id: true, ownerUserId: true, jobId: true, service: true,
            amountTzs: true, currency: true, featuredDays: true,
            status: true, approvedAt: true,
          },
        });
        // Return identical failures for missing and other owners to avoid
        // exposing the existence of another employer's payment orders.
        if (!booking || booking.ownerUserId !== actor.id) {
          throw new PromotionPaymentError("BOOKING_UNAVAILABLE");
        }
        if (booking.status !== "APPROVED" || !booking.approvedAt ||
            booking.service !== "FEATURED_JOB" ||
            !Number.isSafeInteger(booking.featuredDays) || booking.featuredDays <= 0) {
          throw new PromotionPaymentError("BOOKING_NOT_PAYABLE");
        }

        // The job must remain published and open; payment cannot make an
        // expired, rejected, or unapproved vacancy eligible for promotion.
        const job = await tx.job.findUnique({
          where: { id: booking.jobId },
          select: {
            id: true, active: true, moderationStatus: true, deadline: true,
            employerId: true, employer: { select: { verificationStatus: true } },
          },
        });
        if (!job || !job.active || job.moderationStatus !== "PUBLISHED" ||
            (job.deadline && job.deadline.getTime() < Date.now()) ||
            (job.employerId && job.employer?.verificationStatus !== "VERIFIED")) {
          throw new PromotionPaymentError("JOB_NOT_ELIGIBLE");
        }

        // A single outstanding attempt is reusable even if the provider
        // timed out; creating a second attempt could double-charge.
        const attempts = await tx.paymentAttempt.findMany({
          where: { bookingId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true, reference: true, status: true,
            environment: true, amountTzs: true, currency: true,
          },
        });
        if (attempts.some((attempt) => COMPLETE.has(attempt.status))) {
          throw new PromotionPaymentError("PAYMENT_ALREADY_COMPLETED");
        }
        const pending = attempts.find((attempt) => REUSABLE.has(attempt.status));
        if (pending) {
          if (pending.environment !== environment ||
              pending.amountTzs !== booking.amountTzs ||
              pending.currency !== booking.currency) {
            throw new PromotionPaymentError("PENDING_ATTEMPT_REQUIRES_REVIEW");
          }
          return Object.freeze({ attemptId: pending.id, reference: pending.reference, reused: true });
        }

        const intent = createApprovedPaymentIntent({
          bookingId: booking.id, approved: true,
          amountTzs: booking.amountTzs, currency: booking.currency,
          reference: referenceFactory(),
        });
        const attempt = await tx.paymentAttempt.create({
          data: {
            bookingId, reference: intent.reference, provider: "AZAMPAY",
            amountTzs: intent.amountTzs, currency: intent.currency,
            environment, status: "PENDING",
          },
          select: { id: true, reference: true },
        });
        return Object.freeze({ attemptId: attempt.id, reference: attempt.reference, reused: false });
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      // Prisma transaction serialization conflict: safe to retry because
      // no outbound provider request has happened at this stage.
      if (error?.code === "P2034" && iteration < MAX_RETRIES - 1) continue;
      throw error;
    }
  }
  throw new PromotionPaymentError("PAYMENT_ATTEMPT_CONFLICT");
}
