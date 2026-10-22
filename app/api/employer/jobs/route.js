import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import slugUtils from "@/lib/job-slug";
import { employerPortalEnabled, getActor, safeAuditMetadata } from "@/lib/employer-access";
import { getCategoryNames } from "@/lib/public-jobs";
import ownerVacancy from "@/lib/owner-vacancy";
import { readProtectedJson } from "@/lib/request-security";

const { createJobWithPositionSlug } = slugUtils;
const { parseApplicationDetails } = ownerVacancy;
const clean = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
const JOB_TYPES = new Set(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]);

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
  const { body, error } = await readProtectedJson(request, {
    scope: "employer-job-submit",
    limit: 20,
    maxBytes: 16_384,
  });
  if (error) return error;
  const problems = [];
  const { deadline, applicationUrl } = parseApplicationDetails(body, problems);
  if (!deadline) problems.push("closing date is required");
  else if (deadline.getTime() < Date.now()) problems.push("closing date must be today or later");
  if (problems.length) {
    return NextResponse.json({ error: `Check the vacancy: ${problems.join("; ")}.` }, { status: 400 });
  }
  const data = {
    title: clean(body.title, 160),
    company: actor.employer.companyName,
    location: clean(body.location, 160),
    description: clean(body.description, 10000),
    category: clean(body.category, 100),
    type: clean(body.type, 30) || "FULL_TIME",
    deadline,
    applicationUrl,
    source: "daraja",
    language: "en",
    employerId: actor.employer.id,
    submittedById: actor.id,
    // Verified employers an administrator trusts publish without review.
    ...(actor.employer.autoPublish && actor.employer.verificationStatus === "VERIFIED"
      ? { moderationStatus: "PUBLISHED", active: true, moderationNote: "Published automatically: trusted employer." }
      : { moderationStatus: "PENDING_REVIEW", active: false }),
  };
  if (!data.title || !data.location || !data.description || !data.category) {
    return NextResponse.json({ error: "Title, location, category and description are required" }, { status: 400 });
  }
  if (!(await getCategoryNames()).includes(data.category) || !JOB_TYPES.has(data.type)) {
    return NextResponse.json({ error: "Choose a supported category and job type" }, { status: 400 });
  }
  const job = await createJobWithPositionSlug(prisma, data, randomUUID());
  await prisma.auditEvent.create({
    data: {
      actorUserId: actor.id,
      employerId: actor.employer.id,
      action: data.moderationStatus === "PUBLISHED" ? "JOB_PUBLISHED_TRUSTED_EMPLOYER" : "JOB_SUBMITTED_FOR_REVIEW",
      entityType: "Job",
      entityId: job.id,
      metadata: safeAuditMetadata({ category: data.category, type: data.type }),
    },
  });
  return NextResponse.json({ job }, { status: 202 });
}
