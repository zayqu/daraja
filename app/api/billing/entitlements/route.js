import { activePlanForUser, getBillingUser } from "@/lib/billing-access";
import { billingEnabled } from "@/lib/entitlements";
import { privateJson } from "@/lib/billing-response";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!billingEnabled()) return privateJson({ error: "Not found" }, { status: 404 });
  try {
    const user = await getBillingUser();
    if (!user) return privateJson({ error: "Sign in required" }, { status: 401 });
    return privateJson(await activePlanForUser(user));
  } catch (error) {
    console.error("Billing entitlement lookup failed", { code: error?.code || "UNKNOWN" });
    return privateJson({ error: "Billing is temporarily unavailable" }, { status: 503 });
  }
}
