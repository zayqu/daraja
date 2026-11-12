import { NextResponse } from "next/server";
import { employerPortalEnabled, getActor } from "@/lib/employer-access";
import { sandboxRoutesAvailable } from "@/lib/payments/azampay-sandbox-gate.mjs";
import { PromotionBookingError, ownerBooking } from "@/lib/payments/promotion-booking.mjs";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

// Booking + payment progress for the employer who owns it (the pay screen
// polls this while waiting for the phone prompt to be approved).
export async function GET(request, { params }) {
  if (!employerPortalEnabled() || !sandboxRoutesAvailable()) {
    return json({ error: "Not found" }, 404);
  }
  const actor = await getActor();
  if (!actor) return json({ error: "Sign in required" }, 401);
  const { id } = await params;
  try {
    return json({ booking: await ownerBooking({ prisma, actor, bookingId: id }) });
  } catch (failure) {
    if (failure instanceof PromotionBookingError) return json({ error: "Booking not found." }, 404);
    return json({ error: "Status unavailable. Please try again." }, 500);
  }
}
