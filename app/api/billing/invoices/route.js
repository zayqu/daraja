import { getBillingUser, invoicesForUser } from "@/lib/billing-access";
import { billingEnabled } from "@/lib/entitlements";
import { privateJson } from "@/lib/billing-response";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!billingEnabled()) return privateJson({ error: "Not found" }, { status: 404 });
  try {
    const user = await getBillingUser();
    if (!user) return privateJson({ error: "Sign in required" }, { status: 401 });
    return privateJson({ invoices: await invoicesForUser(user.id) });
  } catch (error) {
    console.error("Billing invoice lookup failed", { code: error?.code || "UNKNOWN" });
    return privateJson({ error: "Billing is temporarily unavailable" }, { status: 503 });
  }
}
