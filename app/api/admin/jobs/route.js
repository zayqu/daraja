import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { parseAdminJob } from "@/lib/admin-job-input";
import { getActor, isAdmin, safeAuditMetadata } from "@/lib/employer-access";
import slugUtils from "@/lib/job-slug";
import prisma from "@/lib/prisma";
import { PUBLIC_JOBS_CACHE_TAG, getCategoryNames } from "@/lib/public-jobs";
import { readProtectedJson } from "@/lib/request-security";

const { createJobWithPositionSlug } = slugUtils;

// An administrator posts a vacancy as Daraja.
export async function POST(request) {
  const actor = await getActor();
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 });
  const { body, error } = await readProtectedJson(request, {
    scope: "admin-job-create",
    limit: 20,
    maxBytes: 32_768,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  if (error) return error;

  const { data, error: invalid } = parseAdminJob(body, await getCategoryNames());
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const publish = body.publish !== false;
  const now = new Date();
  const job = await createJobWithPositionSlug(
    prisma,
    {
      ...data,
      sourceId: `admin-${randomUUID()}`,
      source: "daraja",
      language: "en",
      sourceUrl: null,
      moderationStatus: publish ? "PUBLISHED" : "PENDING_REVIEW",
      moderationNote: publish ? "Posted by a Daraja administrator." : null,
      moderatedById: publish ? actor.id : null,
      moderatedAt: publish ? now : null,
      submittedById: actor.id,
      adminEditedAt: now,
      active: publish && (!data.deadline || data.deadline.getTime() >= now.getTime()),
    },
    randomUUID()
  );
  await prisma.auditEvent.create({
    data: {
      actorUserId: actor.id,
      action: "JOB_CREATED_BY_ADMIN",
      entityType: "Job",
      entityId: job.id,
      metadata: safeAuditMetadata({ title: data.title, published: publish }),
    },
  });
  revalidateTag(PUBLIC_JOBS_CACHE_TAG, "seconds");
  return NextResponse.json({ job: { id: job.id } }, { status: 201 });
}

const BULK_STATUSES = new Set(["PUBLISHED", "REJECTED", "ARCHIVED"]);

// Bulk moderation from /admin/jobs: { ids: [...], status, note }.
// Same rules as the single-job moderate route: rejection and archive need a
// reason, and employer vacancies only publish once the employer is verified.
export async function PATCH(request) {
  const actor = await getActor();
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 });
  const { body, error } = await readProtectedJson(request, {
    scope: "admin-job-bulk",
    limit: 20,
    maxBytes: 16_384,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  if (error) return error;
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter((id) => typeof id === "string"))].slice(0, 100) : [];
  const status = typeof body.status === "string" ? body.status : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (!ids.length) return NextResponse.json({ error: "Select at least one job" }, { status: 400 });
  if (!BULK_STATUSES.has(status)) return NextResponse.json({ error: "Invalid moderation status" }, { status: 400 });
  if (status !== "PUBLISHED" && !note) return NextResponse.json({ error: "A reason is required" }, { status: 400 });

  const jobs = await prisma.job.findMany({
    where: { id: { in: ids } },
    select: { id: true, employerId: true, deadline: true, employer: { select: { verificationStatus: true } } },
  });
  const now = new Date();
  const allowed = jobs.filter(
    (job) => status !== "PUBLISHED" || !job.employer || job.employer.verificationStatus === "VERIFIED"
  );
  await prisma.$transaction([
    ...allowed.map((job) =>
      prisma.job.update({
        where: { id: job.id },
        data: {
          moderationStatus: status,
          moderationNote: note || null,
          moderatedById: actor.id,
          moderatedAt: now,
          active: status === "PUBLISHED" && (!job.deadline || job.deadline.getTime() >= now.getTime()),
        },
      })
    ),
    prisma.auditEvent.create({
      data: {
        actorUserId: actor.id,
        action: `JOB_BULK_${status}`,
        entityType: "Job",
        entityId: "bulk",
        metadata: safeAuditMetadata({ count: allowed.length, note }),
      },
    }),
  ]);
  revalidateTag(PUBLIC_JOBS_CACHE_TAG, "seconds");
  return NextResponse.json({ updated: allowed.length, skipped: ids.length - allowed.length });
}
