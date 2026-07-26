CREATE TABLE "JobAlertSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "unsubscribeToken" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "lastNotifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAlertSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobAlertSubscriber_email_key"
ON "JobAlertSubscriber"("email");

CREATE UNIQUE INDEX "JobAlertSubscriber_unsubscribeToken_key"
ON "JobAlertSubscriber"("unsubscribeToken");

CREATE INDEX "JobAlertSubscriber_active_lastNotifiedAt_idx"
ON "JobAlertSubscriber"("active", "lastNotifiedAt");
