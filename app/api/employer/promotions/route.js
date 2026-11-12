import { NextResponse } from "next/server";
import { employerPortalEnabled, getActor, safeAuditMetadata } from "@/lib/employer-access";
import { loadSiteSettings, promotionOffer } from "@/lib/features";
import { sandboxRoutesAvailable } from "@/lib/payments/azampay-sandbox-gate.mjs";
import {
  PromotionBookingError, requestPromotionBooking,
} from "@/lib/payments/promotion-booking.mjs";
import prisma from "@/lib/prisma";
import { readProtectedJson } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

// A verified employer asks Daraja to feature one of its live vacancies.
// Only offered while mobile-money payments are switched on (sandbox gate).
export async function POST(request) {
  if (!employerPortalEnabled() || !sandboxRoutesAvailable()) {
    return json({ error: "Not found" }, 404);
  }
  const actor = await getActor();
  if (!actor) return json({ error: "Sign in required" }, 401);
  const { body, error } = await readProtectedJson(request, {
    scope: "employer-promotion-request", limit: 5, maxBytes: 1024,
    requireOrigin: true, rateIdentity: actor.id,
  });
  if (error) return error;

  await loadSiteSettings();
  try {
    const booking = await requestPromotionBooking({
      prisma, actor, jobId: body.jobId, offer: promotionOffer(),
      audit: (tx, event) => tx.auditEvent.create({
        data: { actorUserId: actor.id, ...event, metadata: safeAuditMetadata(event.metadata) },
      }),
    });
    return json({ booking }, 201);
  } catch (failure) {
    if (failure instanceof PromotionBookingError) {
      return json({ error: failure.userMessage }, failure.httpStatus);
    }
    return json({ error: "The request could not be saved. Please try again." }, 500);
  }
}
