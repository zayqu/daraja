import { NextResponse } from "next/server";
import { getBillingUser, invoicesForUser } from "@/lib/billing-access";
import { billingEnabled } from "@/lib/entitlements";

export async function GET() {
  if (!billingEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await getBillingUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ invoices: await invoicesForUser(user.id) });
}
