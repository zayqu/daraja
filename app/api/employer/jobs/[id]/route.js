import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  canManageEmployer,
  employerPortalEnabled,
  getActor,
  isSuspendedEmployer,
  publishesWithoutReview,
  safeAuditMetadata,
} from "@/lib/employer-access";
import { EMPLOYER_EDITABLE_STATUSES, parseEmployerDraft, parseEmployerVacancy } from "@/lib/employer-vacancy";
import { getCategoryNames, PUBLIC_JOBS_CACHE_TAG } from "@/lib/public-jobs";
import { readProtectedJson } from "@/lib/request-security";

// An employer edits one of its own vacancies and sends it (again) for review,
// or closes it ({ action: "withdraw" }) when it is filled or no longer needed.
export async function PATCH(request, { params }) {
  if (!employerPortalEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.job.findUnique({
    where: { id },
    select: { id: true, employerId: true, moderationStatus: true, active: true },
  });
  if (!existing || !existing.employerId) return NextResponse.json({ error: "Vacancy not found" }, { status: 404 });
  if (!canManageEmployer(actor, existing.employerId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  if (actor.role !== "ADMIN" && isSuspendedEmployer(actor)) {
    return NextResponse.json({ error: "This employer account is suspended. Contact Daraja." }, { status: 403 });
  }
  const { body, error } = await readProtectedJson(request, {
    scope: "employer-job-update",
    limit: 30,
    maxBytes: 16_384,
  });
  if (error) return error;

  if (body.action === "withdraw") {
    if (existing.moderationStatus === "ARCHIVED") {
      return NextResponse.json({ error: "This vacancy is already closed" }, { status: 409 });
    }
    const job = await prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id },
        data: { moderationStatus: "ARCHIVED", active: false },
      });
      await tx.auditEvent.create({
        data: {
          actorUserId: actor.id,
          employerId: existing.employerId,
          action: "JOB_WITHDRAWN_BY_EMPLOYER",
          entityType: "Job",
          entityId: id,
          metadata: safeAuditMetadata({ previousStatus: existing.moderationStatus }),
        },
      });
      return updated;
    });
    if (existing.active) revalidateTag(PUBLIC_JOBS_CACHE_TAG, "seconds");
    return NextResponse.json({ job });
  }

  if (actor.role !== "ADMIN" && !EMPLOYER_EDITABLE_STATUSES.has(existing.moderationStatus)) {
    return NextResponse.json({ error: "Published vacancies require administrator review" }, { status: 409 });
  }
  const submit = body.submit === true;
  // Saving a draft needs only a title; sending it runs the full checks.
  const { data, problems } = submit
    ? parseEmployerVacancy(body, { categories: await getCategoryNames() })
    : parseEmployerDraft(body, { categories: await getCategoryNames() });
  if (problems.length) {
    return NextResponse.json({ error: `Check the vacancy: ${problems.join("; ")}.` }, { status: 400 });
  }
  // A trusted employer's never-reviewed draft goes live when sent, exactly as
  // a vacancy posted in one go would.
  const publishNow =
    submit && existing.moderationStatus === "DRAFT" && actor.employer?.id === existing.employerId && publishesWithoutReview(actor.employer);
  const job = await prisma.$transaction(async (tx) => {
    const updated = await tx.job.update({
      where: { id },
      data: {
        ...data,
        moderationStatus: publishNow ? "PUBLISHED" : submit ? "PENDING_REVIEW" : "DRAFT",
        moderationNote: publishNow ? "Published automatically: trusted employer." : null,
        active: publishNow,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorUserId: actor.id,
        employerId: existing.employerId,
        action: publishNow ? "JOB_PUBLISHED_TRUSTED_EMPLOYER" : submit ? "JOB_SUBMITTED_FOR_REVIEW" : "JOB_DRAFT_UPDATED",
        entityType: "Job",
        entityId: id,
        metadata: safeAuditMetadata({ changedFields: Object.keys(data) }),
      },
    });
    return updated;
  });
  if (existing.active || publishNow) revalidateTag(PUBLIC_JOBS_CACHE_TAG, "seconds");
  return NextResponse.json({ job });
}
