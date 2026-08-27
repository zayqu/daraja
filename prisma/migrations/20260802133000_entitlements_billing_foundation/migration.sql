DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Subscription" subscription
    LEFT JOIN "User" account ON account."id" = subscription."userId"
    WHERE account."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Subscription contains orphan user references';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Payment" payment
    LEFT JOIN "User" account ON account."id" = payment."userId"
    WHERE account."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Payment contains orphan user references';
  END IF;
END $$;

ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'FREE';
CREATE TYPE "PaymentEnvironment" AS ENUM ('SANDBOX', 'LEGACY');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

ALTER TABLE "Subscription"
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "providerCustomerId" TEXT,
  ADD COLUMN "externalSubscriptionId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Payment"
  ADD COLUMN "amountMinor" INTEGER,
  ADD COLUMN "environment" "PaymentEnvironment" NOT NULL DEFAULT 'SANDBOX',
  ADD COLUMN "invoiceId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Payment"
SET
  "environment" = 'LEGACY',
  "amountMinor" = CASE
    WHEN "amount" BETWEEN 0 AND 21474836.47
      THEN ROUND("amount" * 100)::INTEGER
    ELSE NULL
  END;

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "plan" "Plan" NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TZS',
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EntitlementUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "used" INTEGER NOT NULL DEFAULT 0,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EntitlementUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_externalSubscriptionId_key" ON "Subscription"("externalSubscriptionId");
CREATE INDEX "Subscription_userId_status_startDate_endDate_idx" ON "Subscription"("userId", "status", "startDate", "endDate");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "Invoice_userId_createdAt_idx" ON "Invoice"("userId", "createdAt");
CREATE INDEX "Invoice_status_dueAt_idx" ON "Invoice"("status", "dueAt");
CREATE UNIQUE INDEX "EntitlementUsage_userId_key_periodStart_key" ON "EntitlementUsage"("userId", "key", "periodStart");
CREATE INDEX "EntitlementUsage_userId_periodEnd_idx" ON "EntitlementUsage"("userId", "periodEnd");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_amountMinor_nonnegative_check"
  CHECK ("amountMinor" IS NULL OR "amountMinor" >= 0);
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_amountMinor_positive_check"
  CHECK ("amountMinor" > 0);
ALTER TABLE "EntitlementUsage"
  ADD CONSTRAINT "EntitlementUsage_used_nonnegative_check"
  CHECK ("used" >= 0),
  ADD CONSTRAINT "EntitlementUsage_period_check"
  CHECK ("periodEnd" > "periodStart");

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntitlementUsage"
  ADD CONSTRAINT "EntitlementUsage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
