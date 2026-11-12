import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  featuredUntilAfter, ownerBooking, paymentProgress, requestPromotionBooking,
  reviewPromotionBooking,
} from "../lib/payments/promotion-booking.mjs";

const NOW = new Date("2026-11-12T09:00:00Z"); // 12:00 in Dar es Salaam
const employer = { id: "owner_user_1", role: "EMPLOYER", employer: { id: "employer_1", verificationStatus: "VERIFIED" } };
const admin = { id: "admin_user_1", role: "ADMIN" };
const offer = { priceTzs: 30000, featuredDays: 14 };

function db({ job = {}, bookings = [], attempts = {} } = {}) {
  const state = {
    job: {
      id: "job_live_123", employerId: "employer_1", moderationStatus: "PUBLISHED", active: true,
      deadline: new Date("2026-12-01T00:00:00Z"), featuredUntil: null, featured: false,
      employer: { verificationStatus: "VERIFIED" }, ...job,
    },
    bookings: bookings.map((booking) => ({ ...booking })),
    attempts,
    audits: [],
  };
  const findBooking = (id) => state.bookings.find((booking) => booking.id === id) || null;
  const withAttempts = (booking) => booking && ({ ...booking, attempts: state.attempts[booking.id] || [] });
  const prisma = {
    $transaction: async (fn) => fn(prisma),
    job: {
      findUnique: async ({ where }) => (where.id === state.job.id ? { ...state.job } : null),
      update: async ({ data }) => { Object.assign(state.job, data); return state.job; },
    },
    promotionBooking: {
      findFirst: async ({ where }) => state.bookings.find((booking) =>
        booking.jobId === where.jobId && where.status.in.includes(booking.status)) || null,
      findUnique: async ({ where }) => withAttempts(findBooking(where.id)),
      create: async ({ data }) => {
        const booking = { id: `booking_${state.bookings.length + 1}_abc`, ...data };
        state.bookings.push(booking);
        return { id: booking.id, status: booking.status, amountTzs: booking.amountTzs, featuredDays: booking.featuredDays };
      },
      updateMany: async ({ where, data }) => {
        const booking = findBooking(where.id);
        if (!booking || booking.status !== where.status) return { count: 0 };
        Object.assign(booking, data);
        return { count: 1 };
      },
    },
    paymentAttempt: {
      updateMany: async ({ where, data }) => {
        const attempt = (state.attempts[where.bookingId] || []).find((item) => item.id === where.id);
        if (!attempt || attempt.status !== where.status) return { count: 0 };
        Object.assign(attempt, data);
        return { count: 1 };
      },
    },
  };
  const audit = async (tx, event) => { state.audits.push(event); };
  return { prisma, state, audit };
}

const request = (fixture, overrides = {}) => requestPromotionBooking({
  prisma: fixture.prisma, actor: employer, jobId: "job_live_123", offer, audit: fixture.audit, now: NOW, ...overrides,
});
const review = (fixture, action, overrides = {}) => reviewPromotionBooking({
  prisma: fixture.prisma, admin, bookingId: "booking_1_abc", action, audit: fixture.audit, now: NOW, ...overrides,
});
const booking = (status, extra = {}) => ({
  id: "booking_1_abc", ownerUserId: employer.id, jobId: "job_live_123", status,
  amountTzs: 30000, featuredDays: 14, ...extra,
});
const attempt = (status, checkoutState, minutesAgo = 1) => ({
  id: "attempt_1", status, checkoutState,
  createdAt: new Date(NOW.getTime() - minutesAgo * 60000),
  updatedAt: new Date(NOW.getTime() - minutesAgo * 60000),
});

test("payment progress tells the employer and admin what is happening", () => {
  assert.equal(paymentProgress([], NOW), "NONE");
  assert.equal(paymentProgress([attempt("PENDING", "NOT_STARTED")], NOW), "NONE");
  assert.equal(paymentProgress([attempt("PENDING", "CLAIMED")], NOW), "WAITING");
  assert.equal(paymentProgress([attempt("PENDING", "INITIATED", 14)], NOW), "WAITING");
  assert.equal(paymentProgress([attempt("PENDING", "INITIATED", 16)], NOW), "STALLED");
  assert.equal(paymentProgress([attempt("UNKNOWN", "UNKNOWN")], NOW), "UNKNOWN");
  assert.equal(paymentProgress([attempt("FAILED", "INITIATED")], NOW), "FAILED");
  assert.equal(paymentProgress([attempt("CANCELLED", "INITIATED")], NOW), "FAILED");
  assert.equal(paymentProgress([attempt("FAILED", "INITIATED"), attempt("SUCCESS", "INITIATED")], NOW), "PAID");
});

test("featured period ends at 23:59:59 Dar es Salaam time and extends a running one", () => {
  assert.equal(featuredUntilAfter(null, 14, NOW).toISOString(), "2026-11-26T20:59:59.000Z");
  const running = new Date("2026-11-20T20:59:59.000Z");
  assert.equal(featuredUntilAfter(running, 14, NOW).toISOString(), "2026-12-04T20:59:59.000Z");
  const expired = new Date("2026-11-01T20:59:59.000Z");
  assert.equal(featuredUntilAfter(expired, 7, NOW).toISOString(), "2026-11-19T20:59:59.000Z");
});

test("a verified employer requests one booking per live vacancy at the current price", async () => {
  const fixture = db();
  const created = await request(fixture);
  assert.deepEqual({ ...created }, {
    id: "booking_1_abc", status: "PENDING_REVIEW", amountTzs: 30000, featuredDays: 14, payment: "NONE",
  });
  assert.equal(fixture.state.bookings[0].ownerUserId, employer.id);
  assert.equal(fixture.state.audits[0].action, "PROMOTION_REQUESTED");
  await assert.rejects(request(fixture), /BOOKING_OPEN/);
  assert.equal(fixture.state.bookings.length, 1);
});

test("unverified employers, other employers' or closed vacancies and bad offers are refused", async () => {
  for (const actor of [
    { ...employer, employer: { ...employer.employer, verificationStatus: "PENDING" } },
    { ...employer, role: "JOB_SEEKER" },
    { id: "x", role: "EMPLOYER" },
  ]) {
    await assert.rejects(request(db(), { actor }), /NOT_AUTHORIZED/);
  }
  for (const job of [
    { employerId: "employer_other" }, { moderationStatus: "PENDING_REVIEW" }, { active: false },
    { deadline: new Date("2026-11-01T00:00:00Z") },
  ]) {
    const fixture = db({ job });
    await assert.rejects(request(fixture), /JOB_NOT_ELIGIBLE/);
    assert.equal(fixture.state.bookings.length, 0);
  }
  for (const bad of [{ priceTzs: 0, featuredDays: 14 }, { priceTzs: 5000001, featuredDays: 14 },
    { priceTzs: 30000.5, featuredDays: 14 }, { priceTzs: 30000, featuredDays: 0 }]) {
    await assert.rejects(request(db(), { offer: bad }), /OFFER_UNAVAILABLE/);
  }
  await assert.rejects(request(db(), { jobId: "../etc" }), /INVALID_REQUEST/);
  await assert.rejects(request(db(), { audit: undefined }), TypeError);
});

test("owners see only their own booking", async () => {
  const fixture = db({ bookings: [booking("APPROVED")], attempts: { booking_1_abc: [attempt("PENDING", "INITIATED")] } });
  const mine = await ownerBooking({ prisma: fixture.prisma, actor: employer, bookingId: "booking_1_abc", now: NOW });
  assert.equal(mine.payment, "WAITING");
  assert.equal("ownerUserId" in mine, false);
  await assert.rejects(ownerBooking({
    prisma: fixture.prisma, actor: { ...employer, id: "someone_else" }, bookingId: "booking_1_abc", now: NOW,
  }), /BOOKING_UNAVAILABLE/);
});

test("admin approves or rejects a request exactly once", async () => {
  const fixture = db({ bookings: [booking("PENDING_REVIEW")] });
  await review(fixture, "approve");
  assert.equal(fixture.state.bookings[0].status, "APPROVED");
  assert.equal(fixture.state.bookings[0].approvedById, admin.id);
  assert.equal(fixture.state.bookings[0].approvedAt, NOW);
  await assert.rejects(review(fixture, "approve"), /STATE_CHANGED/);

  const closed = db({ bookings: [booking("PENDING_REVIEW")], job: { active: false } });
  await assert.rejects(review(closed, "approve"), /JOB_NOT_ELIGIBLE/);

  const rejected = db({ bookings: [booking("PENDING_REVIEW")] });
  await assert.rejects(review(rejected, "reject"), /REASON_REQUIRED/);
  await review(rejected, "reject", { note: "Duplicate request" });
  assert.equal(rejected.state.bookings[0].status, "REJECTED");
  assert.equal(rejected.state.audits[0].metadata.note, "Duplicate request");
  await assert.rejects(review(db(), "approve", { admin: employer }), /NOT_AUTHORIZED/);
  await assert.rejects(review(db(), "delete-everything"), /INVALID_REQUEST/);
});

test("cancel only without a payment in flight; release only a stuck payment", async () => {
  const waiting = db({ bookings: [booking("APPROVED")], attempts: { booking_1_abc: [attempt("PENDING", "INITIATED", 2)] } });
  await assert.rejects(review(waiting, "cancel", { note: "Changed mind" }), /PAYMENT_IN_PROGRESS/);
  await assert.rejects(review(waiting, "release"), /PAYMENT_NOT_STUCK/);
  assert.equal(waiting.state.attempts.booking_1_abc[0].status, "PENDING");

  const stuck = db({ bookings: [booking("APPROVED")], attempts: { booking_1_abc: [attempt("PENDING", "INITIATED", 20)] } });
  await review(stuck, "release");
  assert.equal(stuck.state.attempts.booking_1_abc[0].status, "CANCELLED");
  assert.equal(stuck.state.bookings[0].status, "APPROVED");
  assert.equal(stuck.state.audits[0].action, "PROMOTION_PAYMENT_RELEASED");
  await review(stuck, "cancel", { note: "Employer asked to stop" });
  assert.equal(stuck.state.bookings[0].status, "CANCELLED");

  const unknown = db({ bookings: [booking("APPROVED")], attempts: { booking_1_abc: [attempt("UNKNOWN", "UNKNOWN", 1)] } });
  await review(unknown, "release");
  assert.equal(unknown.state.attempts.booking_1_abc[0].status, "CANCELLED");
});

test("feature now: only a paid booking, once, featuring the vacancy for the paid days", async () => {
  const fixture = db({ bookings: [booking("PAID")] });
  const result = await review(fixture, "fulfil");
  assert.equal(result.featuredUntil, "2026-11-26T20:59:59.000Z");
  assert.equal(fixture.state.bookings[0].status, "FULFILLED");
  assert.equal(fixture.state.bookings[0].fulfilledAt, NOW);
  assert.equal(fixture.state.job.featured, true);
  assert.equal(fixture.state.job.featuredUntil.toISOString(), "2026-11-26T20:59:59.000Z");
  assert.equal(fixture.state.audits[0].action, "PROMOTION_FULFILLED");
  await assert.rejects(review(fixture, "fulfil"), /STATE_CHANGED/);
  for (const status of ["PENDING_REVIEW", "APPROVED", "CANCELLED"]) {
    const early = db({ bookings: [booking(status)] });
    await assert.rejects(review(early, "fulfil"), /STATE_CHANGED/);
    assert.equal(early.state.job.featured, false);
  }
});

test("employer and admin booking routes keep the house security rules", () => {
  const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const create = read("app/api/employer/promotions/route.js");
  const status = read("app/api/employer/promotions/[id]/route.js");
  for (const source of [create, status]) {
    assert.match(source, /if \(!employerPortalEnabled\(\) \|\| !sandboxRoutesAvailable\(\)\)/);
    assert.match(source, /Cache-Control": "no-store"/);
  }
  assert.match(create, /requireOrigin: true/);
  assert.match(create, /rateIdentity: actor\.id/);
  assert.match(create, /auditEvent\.create/);
  assert.match(create, /offer: promotionOffer\(\)/);
  assert.doesNotMatch(create, /await request\.json\(\)/);
  assert.doesNotMatch(create, /amountTzs: body|priceTzs: body/);

  const page = read("app/employer/page.js");
  assert.match(page, /const payments = verified && sandboxRoutesAvailable\(\)/);
  assert.match(page, /payments && job\.active && job\.moderationStatus === "PUBLISHED"/);
  const actions = read("lib/admin-actions.js");
  assert.match(actions, /Only do this after checking AzamPay that NO money arrived/);
  assert.match(actions, /Remember to post it on the WhatsApp Channel too/);
  const shell = read("components/admin/AdminShell.js");
  assert.match(shell, /\/admin\/bookings/);
  const layout = read("app/admin/layout.js");
  assert.match(layout, /promotionBooking[\s\S]*\.catch\(\(\) => 0\)/);
});
