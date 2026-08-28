import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canManageEmployer, employerPortalEnabled, getActor, safeAuditMetadata } from "@/lib/employer-access";
import { readProtectedJson } from "@/lib/request-security";

const EDITABLE = new Set(["DRAFT", "PENDING_REVIEW", "REJECTED"]);
const clean = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function PATCH(request, { params }) {
  if (!employerPortalEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.job.findUnique({
    where: { id },
    select: { id: true, employerId: true, moderationStatus: true },
  });
  if (!existing || !existing.employerId) return NextResponse.json({ error: "Vacancy not found" }, { status: 404 });
  if (!canManageEmployer(actor, existing.employerId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  if (actor.role !== "ADMIN" && !EDITABLE.has(existing.moderationStatus)) {
    return NextResponse.json({ error: "Published vacancies require administrator review" }, { status: 409 });
  }
  const { body, error } = await readProtectedJson(request, {
    scope: "employer-job-update",
    limit: 30,
    maxBytes: 16_384,
  });
  if (error) return error;
  const title = clean(body.title, 160);
  const location = clean(body.location, 160);
  const description = clean(body.description, 10000);
  if (!title || !location || !description) {
    return NextResponse.json({ error: "Title, location and description are required" }, { status: 400 });
  }
  const submit = body.submit === true;
  const job = await prisma.$transaction(async (tx) => {
    const updated = await tx.job.update({
      where: { id },
      data: {
        title,
        location,
        description,
        moderationStatus: submit ? "PENDING_REVIEW" : "DRAFT",
        moderationNote: null,
        active: false,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorUserId: actor.id,
        employerId: existing.employerId,
        action: submit ? "JOB_SUBMITTED_FOR_REVIEW" : "JOB_DRAFT_UPDATED",
        entityType: "Job",
        entityId: id,
        metadata: safeAuditMetadata({ changedFields: ["title", "location", "description"] }),
      },
    });
    return updated;
  });
  return NextResponse.json({ job });
}
