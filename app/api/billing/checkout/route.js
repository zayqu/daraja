import { createHash, randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { getBillingUser } from "@/lib/billing-access";
import { requestHasJsonContentType, requestIsSameOrigin } from "@/lib/billing-request";
import { privateJson } from "@/lib/billing-response";
import {
  billingEnabled,
  planAvailableToRole,
  SANDBOX_PLAN_PRICES_MINOR,
  sandboxCheckoutEnabled,
} from "@/lib/entitlements";

const IDEMPOTENCY_KEY = /^[a-zA-Z0-9_-]{16,100}$/;
const MAX_SANDBOX_CHECKOUTS_PER_HOUR = 5;
const ONE_HOUR_MS = 60 * 60 * 1_000;

export const dynamic = "force-dynamic";
const paymentSelect = {
  id: true,
  status: true,
  environment: true,
  provider: true,
  createdAt: true,
};
const invoiceSelect = {
  id: true,
  number: true,
  plan: true,
  status: true,
  amountMinor: true,
  currency: true,
  dueAt: true,
  createdAt: true,
};

async function existingCheckout(idempotencyKey, userId) {
  return prisma.payment.findFirst({
    where: { idempotencyKey, userId },
    select: { ...paymentSelect, invoice: { select: invoiceSelect } },
  });
}

function checkoutResponse(checkout) {
  const { invoice, ...payment } = checkout;
  return { invoice, payment };
}

export async function POST(request) {
  if (!billingEnabled()) return privateJson({ error: "Not found" }, { status: 404 });
  if (!requestIsSameOrigin(request)) {
    return privateJson({ error: "Cross-site checkout is not allowed" }, { status: 403 });
  }
  if (!requestHasJsonContentType(request)) {
    return privateJson({ error: "JSON content is required" }, { status: 415 });
  }
  if (!sandboxCheckoutEnabled()) {
    return privateJson(
      { error: "Sandbox checkout is not configured. No payment was created." },
      { status: 503 },
    );
  }

  let user;
  try {
    user = await getBillingUser();
  } catch (error) {
    console.error("Billing identity lookup failed", { code: error?.code || "UNKNOWN" });
    return privateJson({ error: "Billing is temporarily unavailable" }, { status: 503 });
  }
  if (!user) return privateJson({ error: "Sign in required" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Valid JSON is required" }, { status: 400 });
  }

  const plan = typeof body.plan === "string" ? body.plan : "";
  const idempotencyKey = typeof body.idempotencyKey === "string"
    ? body.idempotencyKey.trim()
    : "";
  const amountMinor = SANDBOX_PLAN_PRICES_MINOR[plan];
  if (!amountMinor || !planAvailableToRole(plan, user.role)) {
    return privateJson({ error: "Unsupported plan for this account" }, { status: 400 });
  }
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return privateJson({ error: "A valid idempotency key is required" }, { status: 400 });
  }

  const storedKey = createHash("sha256")
    .update(`${user.id}:${idempotencyKey}`)
    .digest("hex");
  try {
    const existing = await existingCheckout(storedKey, user.id);
    if (existing) return privateJson(checkoutResponse(existing));

    const recentCheckouts = await prisma.payment.count({
      where: {
        userId: user.id,
        provider: "internal-test",
        environment: "SANDBOX",
        createdAt: { gte: new Date(Date.now() - ONE_HOUR_MS) },
      },
    });
    if (recentCheckouts >= MAX_SANDBOX_CHECKOUTS_PER_HOUR) {
      return privateJson(
        { error: "Sandbox checkout limit reached. Try again later." },
        { status: 429 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          userId: user.id,
          number: `SBX-${storedKey.slice(0, 24).toUpperCase()}`,
          plan,
          status: "OPEN",
          amountMinor,
          currency: "TZS",
          dueAt: new Date(Date.now() + 86_400_000),
        },
        select: invoiceSelect,
      });
      const payment = await tx.payment.create({
        data: {
          userId: user.id,
          invoiceId: invoice.id,
          amount: amountMinor / 100,
          amountMinor,
          currency: "TZS",
          reference: `sandbox_${randomUUID()}`,
          status: "PENDING",
          provider: "internal-test",
          environment: "SANDBOX",
          idempotencyKey: storedKey,
        },
        select: paymentSelect,
      });
      return { invoice, payment };
    });
    return privateJson(result, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      try {
        const duplicate = await existingCheckout(storedKey, user.id);
        if (duplicate) return privateJson(checkoutResponse(duplicate));
      } catch {
        // Return the same sanitized failure used for all other database errors.
      }
    }
    console.error("Sandbox checkout failed", { code: error?.code || "UNKNOWN" });
    return privateJson(
      { error: "Sandbox checkout could not be created. No payment was taken." },
      { status: 500 },
    );
  }
}
