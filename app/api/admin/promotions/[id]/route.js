import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getActor, isAdmin, safeAuditMetadata } from "@/lib/employer-access";
import { PromotionBookingError, reviewPromotionBooking } from "@/lib/payments/promotion-booking.mjs";
import prisma from "@/lib/prisma";
import { PUBLIC_JOBS_CACHE_TAG } from "@/lib/public-jobs";
import { readProtectedJson } from "@/lib/request-security";

// Approve, reject, cancel, release a stuck payment, or feature a paid
// booking. Decisions live in lib/payments/promotion-booking.mjs.
export async function PATCH(request, { params }) {
  const actor = await getActor();
  if (!isAdmin(actor)) {
    return NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 });
  }
  const { body, error } = await readProtectedJson(request, {
    scope: "admin-promotion", limit: 30, maxBytes: 2_048,
    requireOrigin: true, rateIdentity: actor.id,
  });
  if (error) return error;
  const { id } = await params;
  try {
    const result = await reviewPromotionBooking({
      prisma, admin: actor, bookingId: id, action: body.action, note: body.note,
      audit: (tx, event) => tx.auditEvent.create({
        data: { actorUserId: actor.id, ...event, metadata: safeAuditMetadata(event.metadata) },
      }),
    });
    if (result.action === "fulfil") revalidateTag(PUBLIC_JOBS_CACHE_TAG, "seconds");
    return NextResponse.json({ booking: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (failure) {
    if (failure instanceof PromotionBookingError) {
      return NextResponse.json({ error: failure.userMessage }, { status: failure.httpStatus });
    }
    return NextResponse.json({ error: "That did not work. Please try again." }, { status: 500 });
  }
}
