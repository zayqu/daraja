-- Draft-only additive migration for one-shot AzamPay checkout claims.
-- Never apply to production Neon until independently reviewed and approved.
CREATE TYPE "GatewayCheckoutState" AS ENUM ('NOT_STARTED', 'CLAIMED', 'INITIATED', 'UNKNOWN');
ALTER TABLE "PaymentAttempt"
  ADD COLUMN "checkoutState" "GatewayCheckoutState" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "checkoutClaimedAt" TIMESTAMP(3);
CREATE INDEX "PaymentAttempt_checkoutState_createdAt_idx" ON "PaymentAttempt" ("checkoutState", "createdAt");
