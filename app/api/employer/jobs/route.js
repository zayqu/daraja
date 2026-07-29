import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import slugUtils from "@/lib/job-slug";
import { employerPortalEnabled, getActor, safeAuditMetadata } from "@/lib/employer-access";

const { createJobWithPositionSlug } = slugUtils;
const clean = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";

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
  const body = await request.json();
  const data = {
    title: clean(body.title, 160),
    company: actor.employer.companyName,
    location: clean(body.location, 160),
    description: clean(body.description, 10000),
    category: clean(body.category, 100),
    type: clean(body.type, 30) || "FULL_TIME",
    source: "daraja",
    language: "en",
    active: false,
    employerId: actor.employer.id,
    submittedById: actor.id,
    moderationStatus: "PENDING_REVIEW",
  };
  if (!data.title || !data.location || !data.description || !data.category) {
    return NextResponse.json({ error: "Title, location, category and description are required" }, { status: 400 });
  }
  const job = await createJobWithPositionSlug(prisma, data, randomUUID());
  await prisma.auditEvent.create({
    data: {
      actorUserId: actor.id,
      employerId: actor.employer.id,
      action: "JOB_SUBMITTED_FOR_REVIEW",
      entityType: "Job",
      entityId: job.id,
      metadata: safeAuditMetadata({ category: data.category, type: data.type }),
    },
  });
  return NextResponse.json({ job }, { status: 202 });
}
