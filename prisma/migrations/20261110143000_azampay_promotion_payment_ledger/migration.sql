-- Additive, REVIEW-ONLY AzamPay payment record tables.
-- Never deploy without an approved Neon restore point and migration review.
-- No legacy payment records are altered.
CREATE TYPE "PromotionBookingStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'FULFILLED', 'CANCELLED');
CREATE TYPE "GatewayPaymentStatus" AS ENUM ('PENDING', 'UNKNOWN', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');

CREATE TABLE "PromotionBooking" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "service" TEXT NOT NULL DEFAULT 'FEATURED_JOB',
  "amountTzs" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TZS',
  "featuredDays" INTEGER NOT NULL,
  "status" "PromotionBookingStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromotionBooking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PromotionBooking_amountTzs_check" CHECK ("amountTzs" > 0),
  CONSTRAINT "PromotionBooking_featuredDays_check" CHECK ("featuredDays" > 0),
  CONSTRAINT "PromotionBooking_currency_check" CHECK ("currency" = 'TZS')
);

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'AZAMPAY',
  "providerTransactionId" TEXT,
  "merchantId" TEXT,
  "amountTzs" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TZS',
  "environment" TEXT NOT NULL,
  "status" "GatewayPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAttempt_amountTzs_check" CHECK ("amountTzs" > 0),
  CONSTRAINT "PaymentAttempt_currency_check" CHECK ("currency" = 'TZS'),
  CONSTRAINT "PaymentAttempt_environment_check" CHECK ("environment" IN ('sandbox', 'production'))
);

CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PromotionBooking_ownerUserId_createdAt_idx" ON "PromotionBooking"("ownerUserId", "createdAt");
CREATE INDEX "PromotionBooking_jobId_status_idx" ON "PromotionBooking"("jobId", "status");
CREATE INDEX "PromotionBooking_status_createdAt_idx" ON "PromotionBooking"("status", "createdAt");
CREATE UNIQUE INDEX "PaymentAttempt_reference_key" ON "PaymentAttempt"("reference");
CREATE UNIQUE INDEX "PaymentAttempt_providerTransactionId_key" ON "PaymentAttempt"("providerTransactionId");
CREATE INDEX "PaymentAttempt_bookingId_status_idx" ON "PaymentAttempt"("bookingId", "status");
CREATE INDEX "PaymentAttempt_status_createdAt_idx" ON "PaymentAttempt"("status", "createdAt");
CREATE UNIQUE INDEX "PaymentEvent_eventKey_key" ON "PaymentEvent"("eventKey");
CREATE INDEX "PaymentEvent_attemptId_receivedAt_idx" ON "PaymentEvent"("attemptId", "receivedAt");

ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "PromotionBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_attemptId_fkey"
  FOREIGN KEY ("attemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
