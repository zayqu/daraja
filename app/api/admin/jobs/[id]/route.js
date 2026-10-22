import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { parseAdminJob } from "@/lib/admin-job-input";
import { getActor, isAdmin, safeAuditMetadata } from "@/lib/employer-access";
import prisma from "@/lib/prisma";
import { PUBLIC_JOBS_CACHE_TAG, getCategoryNames } from "@/lib/public-jobs";
import { readProtectedJson } from "@/lib/request-security";

async function adminRequest(request, scope, maxBytes) {
  const actor = await getActor();
  if (!isAdmin(actor)) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 }) };
  }
  const { body, error } = await readProtectedJson(request, {
    scope,
    limit: 20,
    maxBytes,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  return error ? { error } : { actor, body };
}

// Edit any vacancy. adminEditedAt stops the scraper overwriting the edit.
export async function PATCH(request, { params }) {
  const { actor, body, error } = await adminRequest(request, "admin-job-edit", 32_768);
  if (error) return error;
  const { id } = await params;
  const existing = await prisma.job.findUnique({ where: { id }, select: { id: true, moderationStatus: true } });
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data, error: invalid } = parseAdminJob(body, await getCategoryNames());
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const now = new Date();
  const stillOpen = !data.deadline || data.deadline.getTime() >= now.getTime();
  const job = await prisma.$transaction(async (tx) => {
    const updated = await tx.job.update({
      where: { id },
      data: {
        ...data,
        adminEditedAt: now,
        ...(existing.moderationStatus === "PUBLISHED" ? { active: stillOpen } : {}),
      },
      select: { id: true, slug: true },
    });
    await tx.auditEvent.create({
      data: {
        actorUserId: actor.id,
        action: "JOB_EDITED_BY_ADMIN",
        entityType: "Job",
        entityId: id,
        metadata: safeAuditMetadata({ title: data.title }),
      },
    });
    return updated;
  });
  revalidateTag(PUBLIC_JOBS_CACHE_TAG, "seconds");
  return NextResponse.json({ job });
}

// Permanent delete. Jobs with candidate applications are kept for those
// candidates' records; archive them instead.
export async function DELETE(request, { params }) {
  const { actor, error } = await adminRequest(request, "admin-job-delete", 1_024);
  if (error) return error;
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    select: { id: true, title: true, source: true, _count: { select: { applications: true } } },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job._count.applications > 0) {
    return NextResponse.json(
      { error: "Candidates have applied to this job through Daraja. Archive it instead so their records stay intact." },
      { status: 409 }
    );
  }
  await prisma.$transaction([
    prisma.job.delete({ where: { id } }),
    prisma.auditEvent.create({
      data: {
        actorUserId: actor.id,
        action: "JOB_DELETED_BY_ADMIN",
        entityType: "Job",
        entityId: id,
        metadata: safeAuditMetadata({ title: job.title, source: job.source }),
      },
    }),
  ]);
  revalidateTag(PUBLIC_JOBS_CACHE_TAG, "seconds");
  return NextResponse.json({ ok: true });
}
