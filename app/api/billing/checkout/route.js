import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getBillingUser } from "@/lib/billing-access";
import {
  billingEnabled,
  planAvailableToRole,
  SANDBOX_PLAN_PRICES_MINOR,
  sandboxCheckoutEnabled,
} from "@/lib/entitlements";

const IDEMPOTENCY_KEY = /^[a-zA-Z0-9_-]{16,100}$/;
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

async function existingCheckout(idempotencyKey) {
  return prisma.payment.findUnique({
    where: { idempotencyKey },
    select: { ...paymentSelect, invoice: { select: invoiceSelect } },
  });
}

function checkoutResponse(checkout) {
  const { invoice, ...payment } = checkout;
  return { invoice, payment };
}

export async function POST(request) {
  if (!billingEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!sandboxCheckoutEnabled()) {
    return NextResponse.json(
      { error: "Sandbox checkout is not configured. No payment was created." },
      { status: 503 },
    );
  }

  const user = await getBillingUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Valid JSON is required" }, { status: 400 });
  }

  const plan = typeof body.plan === "string" ? body.plan : "";
  const idempotencyKey = typeof body.idempotencyKey === "string"
    ? body.idempotencyKey.trim()
    : "";
  const amountMinor = SANDBOX_PLAN_PRICES_MINOR[plan];
  if (!amountMinor || !planAvailableToRole(plan, user.role)) {
    return NextResponse.json({ error: "Unsupported plan for this account" }, { status: 400 });
  }
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return NextResponse.json({ error: "A valid idempotency key is required" }, { status: 400 });
  }

  const storedKey = createHash("sha256")
    .update(`${user.id}:${idempotencyKey}`)
    .digest("hex");
  const existing = await existingCheckout(storedKey);
  if (existing) return NextResponse.json(checkoutResponse(existing));

  try {
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
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      const duplicate = await existingCheckout(storedKey);
      if (duplicate) return NextResponse.json(checkoutResponse(duplicate));
    }
    console.error("Sandbox checkout failed", { code: error?.code || "UNKNOWN" });
    return NextResponse.json(
      { error: "Sandbox checkout could not be created. No payment was taken." },
      { status: 500 },
    );
  }
}
