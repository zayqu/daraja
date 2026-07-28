import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { employerPortalEnabled, getActor, isAdmin, safeAuditMetadata } from "@/lib/employer-access";

const ALLOWED = new Set(["VERIFIED", "REJECTED", "SUSPENDED"]);

export async function PATCH(request, { params }) {
  if (!employerPortalEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const actor = await getActor();
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 });
  const { id } = await params;
  const body = await request.json();
  const status = typeof body.status === "string" ? body.status : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (!ALLOWED.has(status)) return NextResponse.json({ error: "Invalid verification status" }, { status: 400 });
  if (status !== "VERIFIED" && !note) return NextResponse.json({ error: "A moderation note is required" }, { status: 400 });
  const employer = await prisma.$transaction(async (tx) => {
    const updated = await tx.employer.update({
      where: { id },
      data: {
        verificationStatus: status,
        verified: status === "VERIFIED",
        verifiedAt: status === "VERIFIED" ? new Date() : null,
        verificationNote: note || null,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorUserId: actor.id,
        employerId: id,
        action: `EMPLOYER_${status}`,
        entityType: "Employer",
        entityId: id,
        metadata: safeAuditMetadata({ note }),
      },
    });
    return updated;
  });
  return NextResponse.json({ employer });
}
