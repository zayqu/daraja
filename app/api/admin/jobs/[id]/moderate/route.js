import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActor, isAdmin, safeAuditMetadata } from "@/lib/employer-access";
import { PUBLIC_JOBS_CACHE_TAG } from "@/lib/public-jobs";
import { readProtectedJson } from "@/lib/request-security";

const ALLOWED = new Set(["PUBLISHED", "REJECTED", "ARCHIVED"]);

export async function PATCH(request, { params }) {
  const actor = await getActor();
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 });
  const { body, error } = await readProtectedJson(request, {
    scope: "admin-job-moderation",
    limit: 20,
    maxBytes: 4_096,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  if (error) return error;
  const { id } = await params;
  const status = typeof body.status === "string" ? body.status : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (!ALLOWED.has(status)) return NextResponse.json({ error: "Invalid moderation status" }, { status: 400 });
  if (status === "REJECTED" && !note) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  if (status === "PUBLISHED") {
    // Explicit editorial confirmation is required server-side, not just in
    // the client. A source lookup or a generated summary is not approval.
    if (body.sourceReviewed !== true) {
      return NextResponse.json({ error: "Check the original vacancy, deadline, application link and content before publishing." }, { status: 409 });
    }
    const pending = await prisma.job.findUnique({
      where: { id },
      select: {
        source: true, sourceUrl: true, applicationUrl: true,
        description: true, title: true, company: true, deadline: true,
        employer: { select: { verificationStatus: true } },
      },
    });
    if (!pending?.deadline || pending.deadline < new Date()) {
      return NextResponse.json({ error: "A valid future application deadline is required before publishing." }, { status: 409 });
    }
    if (!pending.title?.trim() || !pending.company?.trim() ||
        !pending.description || pending.description.trim().length < 80) {
      return NextResponse.json({ error: "A substantial job description and named employer are required." }, { status: 409 });
    }
    if (pending.source !== "daraja" &&
        (!pending.sourceUrl?.startsWith("https://") || !pending.applicationUrl)) {
      return NextResponse.json({ error: "An official original notice and application destination must be checked before publishing." }, { status: 409 });
    }
    // Employer-submitted vacancies go live only for verified employers.
    if (pending?.employer && pending.employer.verificationStatus !== "VERIFIED") {
      return NextResponse.json({ error: "Verify this employer before publishing their vacancy" }, { status: 409 });
    }
  }
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
  revalidateTag(PUBLIC_JOBS_CACHE_TAG, "seconds");
  return NextResponse.json({ job });
}
