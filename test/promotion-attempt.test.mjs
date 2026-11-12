import test from "node:test";
import assert from "node:assert/strict";
import { preparePromotionPaymentAttempt } from "../lib/payments/promotion-attempt.mjs";

const fakeBooking = () => ({
  id: "booking_12345", ownerUserId: "owner1", jobId: "job1",
  service: "FEATURED_JOB", amountTzs: 30000, currency: "TZS",
  featuredDays: 14, status: "APPROVED", approvedAt: new Date("2026-11-10T08:00:00Z"),
});
const fakeJob = () => ({
  id: "job1", active: true, moderationStatus: "PUBLISHED",
  deadline: new Date("2030-12-31T00:00:00Z"),
  employerId: "employer1", employer: { verificationStatus: "VERIFIED", userId: "owner1" },
});
const context = (overrides = {}) => {
  let created = 0;
  let queries = 0;
  let booking = overrides.booking === undefined ? fakeBooking() : overrides.booking;
  let job = overrides.job === undefined ? fakeJob() : overrides.job;
  const attempts = overrides.attempts || [];
  const tx = {
    promotionBooking: {
      findUnique: async () => booking,
    },
    job: {
      findUnique: async () => job,
    },
    paymentAttempt: {
      findMany: async () => { queries++; return attempts; },
      create: async ({ data }) => {
        created++;
        attempts.push({ id: "attempt1", ...data });
        return { id: "attempt1", reference: data.reference };
      },
    },
  };
  return {
    db: { $transaction: (fn, options) => {
      assert.equal(options.isolationLevel, "Serializable");
      return fn(tx);
    }},
    get created() { return created; },
    get queries() { return queries; },
  };
};
const args = (db, extra = {}) => ({
  prisma: db,
  actor: { id: "owner1", role: "EMPLOYER" },
  bookingId: "booking_12345",
  environment: "sandbox",
  ...extra,
});

test("rejects unauthenticated, unsupported roles and invalid environment", async () => {
  const { db } = context();
  for (const actor of [null, { id: "owner1", role: "JOB_SEEKER" }, { id: "owner1" }]) {
    await assert.rejects(preparePromotionPaymentAttempt(args(db, { actor })), /NOT_AUTHORIZED/);
  }
  await assert.rejects(
    preparePromotionPaymentAttempt(args(db, { environment: "other" })),
    /INVALID_PAYMENT_ENVIRONMENT/,
  );
});

test("does not reveal another employer's booking", async () => {
  const { db } = context();
  await assert.rejects(
    preparePromotionPaymentAttempt(args(db, { actor: { id: "other", role: "EMPLOYER" } })),
    /BOOKING_UNAVAILABLE/,
  );
  const missing = context({ booking: null });
  await assert.rejects(preparePromotionPaymentAttempt(args(missing.db)), /BOOKING_UNAVAILABLE/);
});

test("no payment for unapproved promotion or expired/unverified vacancy", async () => {
  for (const status of ["PENDING_REVIEW", "REJECTED", "PAID", "FULFILLED"]) {
    const c = context({ booking: { ...fakeBooking(), status } });
    await assert.rejects(preparePromotionPaymentAttempt(args(c.db)), /BOOKING_NOT_PAYABLE/);
    assert.equal(c.created, 0);
  }
  for (const job of [
    { ...fakeJob(), active: false },
    { ...fakeJob(), moderationStatus: "REJECTED" },
    { ...fakeJob(), employer: { verificationStatus: "PENDING" } },
    { ...fakeJob(), deadline: new Date("2020-01-01T00:00:00Z") },
  ]) {
    const c = context({ job });
    await assert.rejects(preparePromotionPaymentAttempt(args(c.db)), /JOB_NOT_ELIGIBLE/);
    assert.equal(c.created, 0);
  }
});

test("rejects employer payment for another employer's vacancy even if booking owner matches", async () => {
  const c = context({
    job: { ...fakeJob(), employer: { verificationStatus: "VERIFIED", userId: "other-owner" } },
  });
  await assert.rejects(preparePromotionPaymentAttempt(args(c.db)), /JOB_NOT_ELIGIBLE/);
  assert.equal(c.created, 0);
});

test("creates new pending payment only for owner of approved eligible booking", async () => {
  const c = context();
  const result = await preparePromotionPaymentAttempt(args(c.db));
  assert.equal(result.attemptId, "attempt1");
  assert.match(result.reference, /^drj_[0-9a-f-]+$/);
  assert.equal(result.reused, false);
  assert.equal(c.created, 1);
});

test("reuses outstanding pending/unknown attempt instead of duplicating charge", async () => {
  for (const status of ["PENDING", "UNKNOWN"]) {
    const c = context({ attempts: [{
      id: "existing", status, reference: "provider-ref-1", environment: "sandbox",
      amountTzs: 30000, currency: "TZS",
    }] });
    const result = await preparePromotionPaymentAttempt(args(c.db));
    assert.deepEqual(result, { attemptId: "existing", reference: "provider-ref-1", reused: true });
    assert.equal(c.created, 0);
  }
});

test("never recreates mismatched pending or completed attempts", async () => {
  for (const attempt of [
    { status: "PENDING", environment: "production", amountTzs: 30000, currency: "TZS" },
    { status: "UNKNOWN", environment: "sandbox", amountTzs: 20000, currency: "TZS" },
  ]) {
    const c = context({ attempts: [{ id: "old", reference: "x", ...attempt }] });
    await assert.rejects(preparePromotionPaymentAttempt(args(c.db)), /PENDING_ATTEMPT_REQUIRES_REVIEW/);
    assert.equal(c.created, 0);
  }
  for (const status of ["SUCCESS", "REFUNDED"]) {
    const c = context({ attempts: [{ id: "paid", reference: "x", status }] });
    await assert.rejects(preparePromotionPaymentAttempt(args(c.db)), /PAYMENT_ALREADY_COMPLETED/);
    assert.equal(c.created, 0);
  }
});

test("returns prior attempt after sequential retried request", async () => {
  const c = context();
  const first = await preparePromotionPaymentAttempt(args(c.db));
  const second = await preparePromotionPaymentAttempt(args(c.db));
  assert.equal(first.reference, second.reference);
  assert.equal(second.reused, true);
  assert.equal(c.created, 1);
});

test("fails closed on invalid booking amount", async () => {
  const c = context({ booking: { ...fakeBooking(), amountTzs: 4.5 } });
  await assert.rejects(preparePromotionPaymentAttempt(args(c.db)), /positive whole TZS/);
  assert.equal(c.created, 0);
});
