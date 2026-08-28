import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { candidateCareerEnabled, ensureJobSeeker, getCandidateUser } from "@/lib/candidate-access";
import { readProtectedJson } from "@/lib/request-security";

export async function GET() {
  if (!candidateCareerEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await getCandidateUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!user.jobSeeker) return NextResponse.json({ applications: [] });
  const applications = await prisma.application.findMany({
    where: { jobSeekerId: user.jobSeeker.id },
    orderBy: { createdAt: "desc" },
    include: { job: { select: { slug: true, title: true, company: true, location: true } } },
  });
  return NextResponse.json({ applications });
}

export async function POST(request) {
  if (!candidateCareerEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await getCandidateUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { body, error } = await readProtectedJson(request, {
    scope: "candidate-application",
    limit: 20,
    maxBytes: 16_384,
  });
  if (error) return error;
  const coverLetter = typeof body.coverLetter === "string" ? body.coverLetter.trim().slice(0, 10000) : "";
  const job = await prisma.job.findFirst({
    where: {
      id: body.jobId,
      active: true,
      OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
    },
    select: { id: true, sourceUrl: true },
  });
  if (!job) return NextResponse.json({ error: "This vacancy is no longer accepting applications" }, { status: 409 });
  if (job.sourceUrl) {
    return NextResponse.json({ error: "Apply through the official employer destination", applyUrl: job.sourceUrl }, { status: 409 });
  }
  try {
    const application = await prisma.$transaction(async (tx) => {
      const profile = await ensureJobSeeker(tx, user);
      const applicationKey = `${profile.id}:${job.id}`;
      const existing = await tx.application.findUnique({ where: { applicationKey }, select: { id: true } });
      if (existing) throw Object.assign(new Error("DUPLICATE_APPLICATION"), { code: "DUPLICATE_APPLICATION" });
      return tx.application.create({
        data: {
          jobId: job.id,
          jobSeekerId: profile.id,
          applicationKey,
          coverLetter: coverLetter || null,
        },
      });
    });
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (error?.code === "DUPLICATE_APPLICATION" || error?.code === "P2002") {
      return NextResponse.json({ error: "You have already applied for this vacancy" }, { status: 409 });
    }
    console.error("Candidate application failed:", error);
    return NextResponse.json({ error: "Application could not be submitted" }, { status: 500 });
  }
}
