// Featured-job booking lifecycle (D-038): a verified employer requests a
// booking for one of its live vacancies -> an admin approves it -> the
// employer pays with mobile money (promotion-attempt + checkout routes) -> a
// signed AzamPay callback marks it PAID (collection-settlement, D-037) -> an
// admin features the vacancy and posts it on the WhatsApp Channel.
//
// Database work only; never calls AzamPay. Every write goes through a
// caller-supplied audit(tx, event) so routes keep the house audit format.

import { isSerializationConflict } from "./azampay-core.mjs";

export const OPEN_BOOKING_STATUSES = Object.freeze(["PENDING_REVIEW", "APPROVED", "PAID"]);
const STALE_PAYMENT_MS = 15 * 60 * 1000;
const MAX_PRICE_TZS = 5_000_000; // AzamPay MNO checkout limit
const MAX_DAYS = 365;
const ID = /^[a-zA-Z0-9_-]{8,100}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
const ADMIN_ACTIONS = new Set(["approve", "reject", "cancel", "release", "fulfil"]);

const ERRORS = {
  NOT_AUTHORIZED: [403, "Only a verified employer can feature its own vacancies."],
  INVALID_REQUEST: [400, "That request is not valid."],
  REASON_REQUIRED: [400, "A reason is required."],
  OFFER_UNAVAILABLE: [503, "Featured jobs are not available right now."],
  JOB_NOT_ELIGIBLE: [409, "Only live, open vacancies from a verified employer can be featured."],
  BOOKING_OPEN: [409, "This vacancy already has a featured request in progress."],
  BOOKING_UNAVAILABLE: [404, "Booking not found."],
  STATE_CHANGED: [409, "This booking changed in the meantime. Refresh the page and try again."],
  PAYMENT_IN_PROGRESS: [409, "A payment is in progress for this booking. Wait for it to finish, or release it if it is stuck."],
  PAYMENT_NOT_STUCK: [409, "This payment is still recent. Give the customer 15 minutes before releasing it."],
};

export class PromotionBookingError extends Error {
  constructor(code) {
    super(code);
    this.name = "PromotionBookingError";
    this.code = code;
    const [status, message] = ERRORS[code] || [400, "That request is not valid."];
    this.httpStatus = status;
    this.userMessage = message;
  }
}

function fail(code) {
  throw new PromotionBookingError(code);
}

/**
 * Summarises a booking's payment attempts (newest first) for screens:
 * NONE (no prompt sent), WAITING (prompt sent, no answer yet), STALLED (no
 * answer for 15+ minutes), FAILED (failed, refused or released), UNKNOWN
 * (initiation outcome unknown), PAID.
 */
export function paymentProgress(attempts = [], now = new Date()) {
  if (!Array.isArray(attempts) || attempts.length === 0) return "NONE";
  if (attempts.some((attempt) => attempt?.status === "SUCCESS")) return "PAID";
  const latest = attempts[0];
  if (latest.status === "UNKNOWN") return "UNKNOWN";
  if (latest.status === "FAILED" || latest.status === "CANCELLED") return "FAILED";
  if (latest.status === "PENDING") {
    if (latest.checkoutState === "NOT_STARTED") return "NONE";
    const changed = new Date(latest.updatedAt || latest.createdAt).getTime();
    return Number.isFinite(changed) && now.getTime() - changed > STALE_PAYMENT_MS
      ? "STALLED" : "WAITING";
  }
  return "UNKNOWN";
}

/** Last day of a Featured period, ending 23:59:59 East Africa Time like the job form. */
export function featuredUntilAfter(currentUntil, days, now = new Date()) {
  const current = currentUntil instanceof Date ? currentUntil.getTime() : NaN;
  const start = Number.isFinite(current) && current > now.getTime() ? current : now.getTime();
  const day = new Date(start + EAT_OFFSET_MS + days * DAY_MS).toISOString().slice(0, 10);
  return new Date(`${day}T23:59:59+03:00`);
}

function jobEligible(job, now) {
  return Boolean(job && job.moderationStatus === "PUBLISHED" && job.active &&
    (!job.deadline || job.deadline.getTime() >= now.getTime()) &&
    (!job.employerId || job.employer?.verificationStatus === "VERIFIED"));
}

const ATTEMPTS = {
  orderBy: { createdAt: "desc" },
  take: 5,
  select: { id: true, status: true, checkoutState: true, createdAt: true, updatedAt: true },
};

function ownerView(row, now) {
  return Object.freeze({
    id: row.id,
    status: row.status,
    amountTzs: row.amountTzs,
    featuredDays: row.featuredDays,
    payment: paymentProgress(row.attempts, now),
  });
}

/** Latest booking per vacancy for the signed-in owner (employer page). */
export async function ownerBookingsByJob({ prisma, actor, jobIds, now = new Date() }) {
  if (!actor?.id || !Array.isArray(jobIds) || jobIds.length === 0) return {};
  const rows = await prisma.promotionBooking.findMany({
    where: { ownerUserId: actor.id, jobId: { in: jobIds.slice(0, 100) } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, jobId: true, status: true, amountTzs: true, featuredDays: true,
      attempts: ATTEMPTS,
    },
  });
  const byJob = {};
  for (const row of rows) {
    if (!byJob[row.jobId]) byJob[row.jobId] = ownerView(row, now);
  }
  return byJob;
}

/** One booking for its owner only; other owners get the same "not found". */
export async function ownerBooking({ prisma, actor, bookingId, now = new Date() }) {
  if (!actor?.id || typeof bookingId !== "string" || !ID.test(bookingId)) fail("BOOKING_UNAVAILABLE");
  const row = await prisma.promotionBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true, ownerUserId: true, status: true, amountTzs: true, featuredDays: true,
      attempts: ATTEMPTS,
    },
  });
  if (!row || row.ownerUserId !== actor.id) fail("BOOKING_UNAVAILABLE");
  return ownerView(row, now);
}

/**
 * A verified employer asks to feature one of its own live vacancies. The
 * price and period are snapshotted from the current offer; one open booking
 * per vacancy at a time.
 */
export async function requestPromotionBooking({
  prisma, actor, jobId, offer, audit, now = new Date(),
}) {
  if (!actor?.id || actor.role !== "EMPLOYER" || !actor.employer?.id ||
      actor.employer.verificationStatus !== "VERIFIED") fail("NOT_AUTHORIZED");
  if (typeof jobId !== "string" || !ID.test(jobId)) fail("INVALID_REQUEST");
  const amountTzs = offer?.priceTzs;
  const featuredDays = offer?.featuredDays;
  if (!Number.isSafeInteger(amountTzs) || amountTzs < 1 || amountTzs > MAX_PRICE_TZS ||
      !Number.isSafeInteger(featuredDays) || featuredDays < 1 || featuredDays > MAX_DAYS) {
    fail("OFFER_UNAVAILABLE");
  }
  if (typeof audit !== "function") throw new TypeError("audit is required");

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const job = await tx.job.findUnique({
          where: { id: jobId },
          select: {
            id: true, employerId: true, moderationStatus: true, active: true, deadline: true,
            employer: { select: { verificationStatus: true } },
          },
        });
        // Same answer for someone else's vacancy and a closed one.
        if (!job || job.employerId !== actor.employer.id || !jobEligible(job, now)) {
          fail("JOB_NOT_ELIGIBLE");
        }
        const open = await tx.promotionBooking.findFirst({
          where: { jobId, status: { in: [...OPEN_BOOKING_STATUSES] } },
          select: { id: true },
        });
        if (open) fail("BOOKING_OPEN");
        const booking = await tx.promotionBooking.create({
          data: {
            ownerUserId: actor.id, jobId, service: "FEATURED_JOB",
            amountTzs, currency: "TZS", featuredDays, status: "PENDING_REVIEW",
          },
          select: { id: true, status: true, amountTzs: true, featuredDays: true },
        });
        await audit(tx, {
          action: "PROMOTION_REQUESTED", entityType: "PromotionBooking", entityId: booking.id,
          employerId: actor.employer.id, metadata: { jobId, amountTzs, featuredDays },
        });
        return Object.freeze({ ...booking, payment: "NONE" });
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      // Serialization conflict: nothing was written, so a retry is safe.
      if (isSerializationConflict(error) && attempt < 2) continue;
      throw error;
    }
  }
  fail("STATE_CHANGED");
}

/**
 * Admin decisions. Each one is a compare-and-set on the current status, so
 * two admins (or an admin and a payment callback) cannot both win.
 * - approve: PENDING_REVIEW -> APPROVED (vacancy must still be live)
 * - reject:  PENDING_REVIEW -> REJECTED (reason required)
 * - cancel:  APPROVED -> CANCELLED, only with no payment in flight (reason required)
 * - release: closes a STALLED/UNKNOWN payment attempt as CANCELLED so the
 *            employer can try again; only after checking AzamPay that no
 *            money arrived for it
 * - fulfil:  PAID -> FULFILLED and features the vacancy for the paid days
 *            (the WhatsApp Channel post stays a manual admin step)
 */
export async function reviewPromotionBooking({
  prisma, admin, bookingId, action, note, audit, now = new Date(),
}) {
  if (admin?.role !== "ADMIN" || !admin.id) fail("NOT_AUTHORIZED");
  if (typeof bookingId !== "string" || !ID.test(bookingId) || !ADMIN_ACTIONS.has(action)) {
    fail("INVALID_REQUEST");
  }
  if (typeof audit !== "function") throw new TypeError("audit is required");
  const reason = typeof note === "string" ? note.trim().slice(0, 500) : "";
  if ((action === "reject" || action === "cancel") && !reason) fail("REASON_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const booking = await tx.promotionBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, jobId: true, status: true, featuredDays: true, attempts: ATTEMPTS },
    });
    if (!booking) fail("BOOKING_UNAVAILABLE");
    const job = await tx.job.findUnique({
      where: { id: booking.jobId },
      select: {
        id: true, employerId: true, moderationStatus: true, active: true, deadline: true,
        featuredUntil: true, employer: { select: { verificationStatus: true } },
      },
    });
    const progress = paymentProgress(booking.attempts, now);
    const move = async (from, data) => {
      const result = await tx.promotionBooking.updateMany({ where: { id: booking.id, status: from }, data });
      if (result.count !== 1) fail("STATE_CHANGED");
    };
    const metadata = { jobId: booking.jobId };
    let auditAction;

    if (action === "approve") {
      if (booking.status !== "PENDING_REVIEW") fail("STATE_CHANGED");
      if (!jobEligible(job, now)) fail("JOB_NOT_ELIGIBLE");
      await move("PENDING_REVIEW", { status: "APPROVED", approvedById: admin.id, approvedAt: now });
      auditAction = "PROMOTION_APPROVED";
    } else if (action === "reject") {
      if (booking.status !== "PENDING_REVIEW") fail("STATE_CHANGED");
      await move("PENDING_REVIEW", { status: "REJECTED" });
      auditAction = "PROMOTION_REJECTED";
      metadata.note = reason;
    } else if (action === "cancel") {
      if (booking.status !== "APPROVED") fail("STATE_CHANGED");
      if (!["NONE", "FAILED"].includes(progress)) fail("PAYMENT_IN_PROGRESS");
      await move("APPROVED", { status: "CANCELLED" });
      auditAction = "PROMOTION_CANCELLED";
      metadata.note = reason;
    } else if (action === "release") {
      if (booking.status !== "APPROVED") fail("STATE_CHANGED");
      if (!["STALLED", "UNKNOWN"].includes(progress)) fail("PAYMENT_NOT_STUCK");
      const stuck = booking.attempts[0];
      const result = await tx.paymentAttempt.updateMany({
        where: { id: stuck.id, bookingId: booking.id, status: stuck.status },
        data: { status: "CANCELLED" },
      });
      if (result.count !== 1) fail("STATE_CHANGED");
      auditAction = "PROMOTION_PAYMENT_RELEASED";
      metadata.attemptId = stuck.id;
      if (reason) metadata.note = reason;
    } else {
      if (booking.status !== "PAID") fail("STATE_CHANGED");
      if (!job) fail("JOB_NOT_ELIGIBLE");
      const featuredUntil = featuredUntilAfter(job.featuredUntil, booking.featuredDays, now);
      await move("PAID", { status: "FULFILLED", fulfilledAt: now });
      await tx.job.update({ where: { id: job.id }, data: { featured: true, featuredUntil } });
      auditAction = "PROMOTION_FULFILLED";
      metadata.featuredUntil = featuredUntil.toISOString();
    }

    await audit(tx, {
      action: auditAction, entityType: "PromotionBooking", entityId: booking.id,
      employerId: job?.employerId || null, metadata,
    });
    return Object.freeze({
      id: booking.id, action,
      ...(metadata.featuredUntil ? { featuredUntil: metadata.featuredUntil } : {}),
    });
  });
}
