import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { preparePromotionPaymentAttempt } from "../lib/payments/promotion-attempt.mjs";
import { settleVerifiedCollection } from "../lib/payments/collection-settlement.mjs";
import { claimSandboxCheckout, recordSandboxCheckoutResponse } from "../lib/payments/azampay-checkout-claim.mjs";

// The ordinary npm test command must never connect to a DB. Only the
// isolated GitHub Actions workflow sets PAYMENTS_DB_TESTS.
test("real Prisma: isolated booking and settlement transactions", {
  skip: process.env.PAYMENTS_DB_TESTS !== "1" ? "requires explicitly enabled ephemeral PostgreSQL" : false,
  timeout: 120000,
}, async () => {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!/^postgresql:\/\/daraja_test:daraja_test@(?:localhost|127\.0\.0\.1):5432\/daraja_test$/.test(dbUrl)) {
    throw new Error("Refusing database integration tests outside the literal isolated CI database");
  }
  const [{ PrismaClient }, { PrismaPg }] = await Promise.all([
    import("@prisma/client"),
    import("@prisma/adapter-pg"),
  ]);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });
  const suffix = randomUUID().slice(0, 8);
  const credentials = { id: "", jobId: "", bookingId: "" };

  try {
    await prisma.$connect();
    const owner = await prisma.user.create({
      data: { email: `azampay-test-${suffix}@example.invalid`, role: "EMPLOYER" },
    });
    credentials.id = owner.id;
    const employer = await prisma.employer.create({
      data: {
        userId: owner.id, companyName: "AzamPay test company",
        verified: true, verificationStatus: "VERIFIED",
      },
    });
    const job = await prisma.job.create({
      data: {
        slug: `azampay-isolated-${suffix}`,
        title: "Temporary sandbox-only test job", company: "AzamPay test company",
        location: "Test fixture", description: "No public vacancy",
        category: "Other", source: "daraja", employerId: employer.id,
        active: true, moderationStatus: "PUBLISHED",
        deadline: new Date(Date.now() + 86400000),
      },
    });
    credentials.jobId = job.id;
    const booking = await prisma.promotionBooking.create({
      data: {
        ownerUserId: owner.id, jobId: job.id,
        amountTzs: 30000, currency: "TZS", featuredDays: 14,
        status: "APPROVED", approvedAt: new Date(),
      },
    });
    credentials.bookingId = booking.id;
    const actor = { id: owner.id, role: "EMPLOYER" };

    await assert.rejects(preparePromotionPaymentAttempt({
      prisma, bookingId: booking.id, actor: { id: "another-owner", role: "EMPLOYER" },
      environment: "sandbox",
    }), /BOOKING_UNAVAILABLE/);

    // Concurrent requests are evaluated through the real Prisma client and
    // real Postgres SERIALIZABLE transactions, not a pg-based stand-in.
    const simultaneous = await Promise.all(Array.from({ length: 10 },
      () => preparePromotionPaymentAttempt({
        prisma, actor, bookingId: booking.id, environment: "sandbox",
      })));
    assert.equal(new Set(simultaneous.map(x => x.reference)).size, 1);
    assert.equal(await prisma.paymentAttempt.count({ where: { bookingId: booking.id } }), 1);

    const original = simultaneous[0].reference;
    const attemptId = simultaneous[0].attemptId;
    const claimed = await Promise.allSettled(Array.from({ length: 10 },
      () => claimSandboxCheckout({ prisma, actor, attemptId })));
    assert.equal(claimed.filter(x => x.status === "fulfilled").length, 1);
    assert.equal(claimed.filter(x => x.status === "rejected").length, 9);
    await recordSandboxCheckoutResponse({
      prisma, attemptId, response: { success: true, transactionId: "isolatedtx" + suffix },
    });
    assert.equal((await prisma.paymentAttempt.findUnique({ where: { id: attemptId } })).checkoutState, "INITIATED");
    const authoritative = {
      authentic: true, authoritative: true,
      reference: original, eventKey: "azampay:isolated:" + suffix,
      providerTransactionId: "isolatedtx" + suffix,
      bookingId: booking.id, merchantId: "sandbox-merchant",
      amountTzs: 30000, currency: "TZS", environment: "sandbox",
      status: "SUCCESS",
    };

    // A forged or mismatched receipt is rejected before any write.
    await assert.rejects(settleVerifiedCollection({
      prisma, reference: original, expectedMerchantId: "sandbox-merchant",
      verifyCollection: async () => ({ ...authoritative, amountTzs: 10 }),
    }), /PAYMENT_DETAILS_MISMATCH/);
    assert.equal(await prisma.paymentEvent.count({ where: { attempt: { bookingId: booking.id } } }), 0);

    const settled = await Promise.all(Array.from({ length: 10 }, () =>
      settleVerifiedCollection({
        prisma, reference: original, expectedMerchantId: "sandbox-merchant",
        verifyCollection: async () => authoritative,
      })));
    assert.equal(settled.filter(x => x.action === "READY_FOR_ADMIN_FULFILMENT").length, 1);
    assert.equal(await prisma.paymentEvent.count({ where: { attempt: { bookingId: booking.id } } }), 1);
    const paid = await prisma.promotionBooking.findUnique({ where: { id: booking.id } });
    assert.equal(paid.status, "PAID");
    const payment = await prisma.paymentAttempt.findUnique({ where: { reference: original } });
    assert.equal(payment.status, "SUCCESS");

    // Rollback on an invalid settlement timestamp (raised after event.create).
    const extra = await prisma.promotionBooking.create({
      data: {
        ownerUserId: owner.id, jobId: job.id, amountTzs: 30000, featuredDays: 14,
        status: "APPROVED", approvedAt: new Date(),
      },
    });
    const another = await preparePromotionPaymentAttempt({
      prisma, bookingId: extra.id, actor, environment: "sandbox",
    });
    await assert.rejects(settleVerifiedCollection({
      prisma, reference: another.reference, expectedMerchantId: "sandbox-merchant",
      verifyCollection: async () => ({
        ...authoritative,
        reference: another.reference, bookingId: extra.id,
        eventKey: "azampay:rollback:" + suffix,
        providerTransactionId: "rollbacktx" + suffix,
      }),
      now: () => new Date("invalid"),
    }), /INVALID_SETTLEMENT_TIME/);
    assert.equal(await prisma.paymentEvent.count({ where: { attempt: { bookingId: extra.id } } }), 0);
    assert.equal((await prisma.paymentAttempt.findUnique({ where: { reference: another.reference } })).status, "PENDING");
    assert.equal((await prisma.promotionBooking.findUnique({ where: { id: extra.id } })).status, "APPROVED");
  } finally {
    // Database exists only for this CI job; do not mutate external DBs.
    await prisma.$disconnect();
  }
});
