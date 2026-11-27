import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canManageEmployer, employerPortalEnabled, getActor, isSuspendedEmployer, safeAuditMetadata } from "@/lib/employer-access";
import { readProtectedJson } from "@/lib/request-security";

// Statuses an employer may set on an application to its own vacancy. The
// candidate sees them in My jobs; only the candidate can withdraw.
const EMPLOYER_APPLICATION_STATUSES = new Set(["REVIEWED", "SHORTLISTED", "OFFERED", "REJECTED"]);

export async function PATCH(request, { params }) {
  if (!employerPortalEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (actor.role !== "ADMIN" && isSuspendedEmployer(actor)) {
    return NextResponse.json({ error: "This employer account is suspended. Contact Daraja." }, { status: 403 });
  }
  const { body, error } = await readProtectedJson(request, {
    scope: "employer-application-status",
    limit: 60,
    maxBytes: 1_024,
  });
  if (error) return error;
  const { id } = await params;
  if (!EMPLOYER_APPLICATION_STATUSES.has(body?.status)) {
    return NextResponse.json({ error: "Choose a supported status" }, { status: 400 });
  }
  const application = await prisma.application.findUnique({
    where: { id: String(id).slice(0, 64) },
    select: { id: true, status: true, job: { select: { employerId: true } } },
  });
  if (!application?.job?.employerId || !canManageEmployer(actor, application.job.employerId)) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (application.status === "WITHDRAWN") {
    return NextResponse.json({ error: "The candidate withdrew this application" }, { status: 409 });
  }
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.application.update({ where: { id: application.id }, data: { status: body.status } });
    await tx.auditEvent.create({
      data: {
        actorUserId: actor.id,
        employerId: application.job.employerId,
        action: "APPLICATION_STATUS_CHANGED",
        entityType: "Application",
        entityId: application.id,
        metadata: safeAuditMetadata({ from: application.status, to: body.status }),
      },
    });
    return next;
  });
  return NextResponse.json({ status: updated.status });
}
