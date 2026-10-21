import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { parseAdminJob } from "@/lib/admin-job-input";
import { getActor, isAdmin, safeAuditMetadata } from "@/lib/employer-access";
import slugUtils from "@/lib/job-slug";
import prisma from "@/lib/prisma";
import { PUBLIC_JOBS_CACHE_TAG } from "@/lib/public-jobs";
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

  const { data, error: invalid } = parseAdminJob(body);
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
