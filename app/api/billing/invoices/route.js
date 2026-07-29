import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getBillingUser } from "@/lib/billing-access";
import { billingEnabled } from "@/lib/entitlements";
export async function GET() {
  if (!billingEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await getBillingUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id }, orderBy: { createdAt: "desc" },
    select: { id: true, number: true, plan: true, status: true, amountMinor: true, currency: true, dueAt: true, paidAt: true, createdAt: true },
    take: 100,
  });
  return NextResponse.json({ invoices });
}
