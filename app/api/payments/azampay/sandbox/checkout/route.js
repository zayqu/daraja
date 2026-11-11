import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActor, employerPortalEnabled } from "@/lib/employer-access";
import { readProtectedJson } from "@/lib/request-security";
import { sandboxRoutesAvailable } from "@/lib/payments/azampay-sandbox-gate.mjs";
import { createAzamPayApiClient } from "@/lib/payments/azampay-api-client.mjs";
import { preparePromotionPaymentAttempt } from "@/lib/payments/promotion-attempt.mjs";
import { buildSandboxMnoCheckout } from "@/lib/payments/azampay-sandbox-checkout.mjs";
import {
  claimSandboxCheckout, markSandboxCheckoutUnknown, recordSandboxCheckoutResponse,
} from "@/lib/payments/azampay-checkout-claim.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
function json(payload, status = 200) {
  return NextResponse.json(payload, { status, headers: noStore });
}

export async function POST(request) {
  if (!sandboxRoutesAvailable() || !employerPortalEnabled()) {
    return json({ error: "Not found" }, 404);
  }
  const actor = await getActor();
  if (!actor) return json({ error: "Sign in required" }, 401);
  if (actor.role !== "EMPLOYER" || actor.employer?.verificationStatus !== "VERIFIED") {
    return json({ error: "Verified employer account required" }, 403);
  }
  const { body, error } = await readProtectedJson(request, {
    scope: "azam-sandbox-checkout", limit: 3, maxBytes: 1024,
    rateIdentity: actor.id, requireOrigin: true,
  });
  if (error) return error;
  if (typeof body.bookingId !== "string" ||
      typeof body.accountNumber !== "string" ||
      typeof body.provider !== "string") {
    return json({ error: "Invalid sandbox payment request" }, 400);
  }

  let claimId;
  try {
    // This uses server-side booking ownership, approval, price and job checks.
    const prepared = await preparePromotionPaymentAttempt({
      prisma, actor, bookingId: body.bookingId, environment: "sandbox",
    });
    const attempt = await prisma.paymentAttempt.findUnique({
      where: { id: prepared.attemptId },
      select: {
        id: true, reference: true, environment: true, provider: true,
        status: true, checkoutState: true, providerTransactionId: true,
        amountTzs: true, currency: true,
      },
    });
    if (!attempt || attempt.checkoutState !== "NOT_STARTED") {
      return json({ error: "This payment requires reconciliation or has already been initiated" }, 409);
    }
    const checkoutBody = buildSandboxMnoCheckout({
      attempt, accountNumber: body.accountNumber, provider: body.provider,
    });
    // Validate local gateway configuration BEFORE taking the one-shot
    // database claim. A missing credential must not strand an unpaid attempt.
    // This constructor performs no provider network request.
    const client = createAzamPayApiClient();
    if (client.mode !== "sandbox") throw new Error("INVALID_SANDBOX_CLIENT");

    // CAS must precede the actual provider request: only one request may send
    // a prompt. If the process dies after claiming, reconciliation is required.
    await claimSandboxCheckout({ prisma, actor, attemptId: attempt.id });
    claimId = attempt.id;
    const response = await client.request({
      method: "POST", path: "/azampay/mno/checkout", body: checkoutBody,
    });
    await recordSandboxCheckoutResponse({
      prisma, attemptId: attempt.id, response,
    });
    return json({
      status: "PENDING", reference: attempt.reference,
      message: "Confirm the sandbox payment prompt. This is not a payment receipt.",
    }, 202);
  } catch {
    // Even a network failure may have initiated a payment prompt. Never
    // automatically send another checkout for this attempt.
    if (claimId) {
      try {
        await markSandboxCheckoutUnknown({ prisma, attemptId: claimId });
      } catch {
        // CLAIMED remains non-retryable if the database is unavailable.
      }
      return json({
        error: "Sandbox payment initiation is uncertain. Contact support before retrying.",
        status: "UNKNOWN",
      }, 503);
    }
    return json({ error: "Sandbox checkout was not started" }, 409);
  }
}
