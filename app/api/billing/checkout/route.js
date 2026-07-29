import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { getBillingUser } from "@/lib/billing-access";
import { PLAN_LIMITS, sandboxCheckoutEnabled } from "@/lib/entitlements";
const PRICES = Object.freeze({ EMPLOYER_BASIC: 4900000, EMPLOYER_PRO: 14900000, JOB_SEEKER_PREMIUM: 1000000 });
export async function POST(request) {
  if (!sandboxCheckoutEnabled()) return NextResponse.json({ error: "Checkout is not configured. No payment was created." }, { status: 503 });
  const user = await getBillingUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json();
  const plan = typeof body.plan === "string" ? body.plan : "";
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim().slice(0, 100) : "";
  if (!PRICES[plan] || !PLAN_LIMITS[plan]) return NextResponse.json({ error: "Unsupported plan" }, { status: 400 });
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(idempotencyKey)) return NextResponse.json({ error: "A valid idempotency key is required" }, { status: 400 });
  const storedKey = createHash("sha256").update(`${user.id}:${idempotencyKey}`).digest("hex");
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey: storedKey }, include: { invoice: true } });
  if (existing) return NextResponse.json({ invoice: existing.invoice, payment: existing });
  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: { userId: user.id, number: `SBX-${Date.now()}-${randomUUID().slice(0, 8)}`, plan, status: "OPEN", amountMinor: PRICES[plan], currency: "TZS", dueAt: new Date(Date.now() + 86400000) },
    });
    const payment = await tx.payment.create({
      data: { userId: user.id, invoiceId: invoice.id, amount: PRICES[plan] / 100, currency: "TZS", reference: `sandbox_${randomUUID()}`, status: "PENDING", provider: "internal-test", environment: "SANDBOX", idempotencyKey: storedKey },
    });
    return { invoice, payment };
  });
  return NextResponse.json(result, { status: 201 });
}
