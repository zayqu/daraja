import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import slugUtils from "@/lib/job-slug";
import { getActor, isAdmin, safeAuditMetadata } from "@/lib/employer-access";
import { parseAdminJobInput } from "@/lib/admin-job-input";
import { PUBLIC_JOBS_CACHE_TAG } from "@/lib/public-jobs";
import { readProtectedJson } from "@/lib/request-security";

const { createJobWithPositionSlug } = slugUtils;

// The owner posts a vacancy directly. Protected by the database ADMIN role.
export async function POST(request) {
  const actor = await getActor();
  if (!isAdmin(actor)) {
    return NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 });
  }
  const { body, error } = await readProtectedJson(request, {
    scope: "admin-job-post",
    limit: 30,
    maxBytes: 32_768,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  if (error) return error;

  const { data, errors } = parseAdminJobInput(body);
  if (errors) return NextResponse.json({ error: errors.join(". ") }, { status: 400 });

  const now = new Date();
  const identity = randomUUID();
  const job = await createJobWithPositionSlug(
    prisma,
    {
      ...data,
      sourceId: `admin-${identity}`,
      source: "daraja",
      language: "en",
      submittedById: actor.id,
      moderationStatus: data.active ? "PUBLISHED" : "ARCHIVED",
      moderationNote: "Posted by a Daraja administrator.",
      moderatedById: actor.id,
      moderatedAt: now,
    },
    identity
  );
  const saved = await prisma.job.findUnique({ where: { id: job.id }, select: { id: true, slug: true } });
  await prisma.auditEvent.create({
    data: {
      actorUserId: actor.id,
      action: "JOB_POSTED_BY_ADMIN",
      entityType: "Job",
      entityId: job.id,
      metadata: safeAuditMetadata({ title: data.title, company: data.company }),
    },
  });
  revalidateTag(PUBLIC_JOBS_CACHE_TAG, "seconds");
  return NextResponse.json({ job: saved }, { status: 201 });
}
