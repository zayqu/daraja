import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { employerPortalEnabled, getActor, isAdmin, safeAuditMetadata } from "@/lib/employer-access";

const ALLOWED = new Set(["PUBLISHED", "REJECTED", "ARCHIVED"]);

export async function PATCH(request, { params }) {
  if (!employerPortalEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const actor = await getActor();
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 });
  const { id } = await params;
  const body = await request.json();
  const status = typeof body.status === "string" ? body.status : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (!ALLOWED.has(status)) return NextResponse.json({ error: "Invalid moderation status" }, { status: 400 });
  if (status === "REJECTED" && !note) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  const job = await prisma.$transaction(async (tx) => {
    const updated = await tx.job.update({
      where: { id },
      data: {
        moderationStatus: status,
        moderationNote: note || null,
        moderatedById: actor.id,
        moderatedAt: new Date(),
        active: status === "PUBLISHED",
      },
    });
    await tx.auditEvent.create({
      data: {
        actorUserId: actor.id,
        employerId: updated.employerId,
        action: `JOB_${status}`,
        entityType: "Job",
        entityId: id,
        metadata: safeAuditMetadata({ note }),
      },
    });
    return updated;
  });
  return NextResponse.json({ job });
}
