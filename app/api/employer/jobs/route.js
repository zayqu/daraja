import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import slugUtils from "@/lib/job-slug";
import {
  employerPortalEnabled,
  getActor,
  isSuspendedEmployer,
  publishesWithoutReview,
  safeAuditMetadata,
} from "@/lib/employer-access";
import { getCategoryNames, PUBLIC_JOBS_CACHE_TAG } from "@/lib/public-jobs";
import { parseEmployerDraft, parseEmployerVacancy } from "@/lib/employer-vacancy";
import { readProtectedJson } from "@/lib/request-security";

const { createJobWithPositionSlug } = slugUtils;

export async function GET() {
  if (!employerPortalEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (actor.role !== "ADMIN" && !actor.employer) {
    return NextResponse.json({ error: "Employer profile required" }, { status: 403 });
  }
  const where = actor.role === "ADMIN" ? {} : { employerId: actor.employer.id };
  const jobs = await prisma.job.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      location: true,
      deadline: true,
      moderationStatus: true,
      moderationNote: true,
      active: true,
      updatedAt: true,
    },
    take: 100,
  });
  return NextResponse.json({ jobs });
}

export async function POST(request) {
  if (!employerPortalEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!actor.employer) return NextResponse.json({ error: "Employer profile required" }, { status: 403 });
  if (isSuspendedEmployer(actor)) {
    return NextResponse.json({ error: "This employer account is suspended. Contact Daraja." }, { status: 403 });
  }
  const { body, error } = await readProtectedJson(request, {
    scope: "employer-job-submit",
    limit: 20,
    maxBytes: 16_384,
  });
  if (error) return error;
  // "Save draft" keeps an unfinished vacancy private; only a title is needed.
  const draft = body?.draft === true;
  const { data: vacancy, problems } = draft
    ? parseEmployerDraft(body, { categories: await getCategoryNames() })
    : parseEmployerVacancy(body, { categories: await getCategoryNames() });
  if (problems.length) {
    return NextResponse.json({ error: `Check the vacancy: ${problems.join("; ")}.` }, { status: 400 });
  }
  const data = {
    ...vacancy,
    company: actor.employer.companyName,
    source: "daraja",
    language: "en",
    employerId: actor.employer.id,
    submittedById: actor.id,
    ...(draft
      ? { moderationStatus: "DRAFT", active: false }
      : publishesWithoutReview(actor.employer)
      ? { moderationStatus: "PUBLISHED", active: true, moderationNote: "Published automatically: trusted employer." }
      : { moderationStatus: "PENDING_REVIEW", active: false }),
  };
  const job = await createJobWithPositionSlug(prisma, data, randomUUID());
  await prisma.auditEvent.create({
    data: {
      actorUserId: actor.id,
      employerId: actor.employer.id,
      action: data.moderationStatus === "PUBLISHED" ? "JOB_PUBLISHED_TRUSTED_EMPLOYER" : draft ? "JOB_DRAFT_CREATED" : "JOB_SUBMITTED_FOR_REVIEW",
      entityType: "Job",
      entityId: job.id,
      metadata: safeAuditMetadata({ category: data.category, type: data.type }),
    },
  });
  if (job.moderationStatus === "PUBLISHED") revalidateTag(PUBLIC_JOBS_CACHE_TAG, "seconds");
  return NextResponse.json({ job }, { status: 202 });
}
