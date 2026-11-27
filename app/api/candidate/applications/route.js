import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { candidateCareerEnabled, ensureJobSeeker, getCandidateUser } from "@/lib/candidate-access";
import { readProtectedJson } from "@/lib/request-security";
import { cvSnapshot, findApplyableJob, scoreCvForJob } from "@/lib/apply-with-cv";

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
  // Apply with Daraja CV: only vacancies employers posted on Daraja.
  const job = await findApplyableJob(typeof body.jobId === "string" ? body.jobId.slice(0, 200) : "");
  if (!job) return NextResponse.json({ error: "This vacancy is not taking applications on Daraja" }, { status: 409 });
  const cvId = typeof body.cvId === "string" ? body.cvId.slice(0, 64) : "";
  try {
    const application = await prisma.$transaction(async (tx) => {
      const profile = await ensureJobSeeker(tx, user);
      // The CV must be the candidate's own.
      const cv = cvId
        ? await tx.candidateCv.findFirst({
            where: { id: cvId, jobSeekerId: profile.id },
            select: { id: true, name: true, kind: true, mode: true, language: true, targetJobId: true, content: true, theme: true, updatedAt: true },
          })
        : null;
      if (cvId && !cv) throw Object.assign(new Error("CV_NOT_FOUND"), { code: "CV_NOT_FOUND" });
      const scores = cv ? scoreCvForJob(cv, job) : null;
      const data = {
        coverLetter: coverLetter || null,
        cvId: cv?.id || null,
        cvSnapshot: cv ? cvSnapshot(cv) : undefined,
        atsScore: scores?.atsScore ?? null,
        matchScore: scores?.matchScore ?? null,
      };
      const applicationKey = `${profile.id}:${job.id}`;
      const existing = await tx.application.findUnique({ where: { applicationKey }, select: { id: true, status: true } });
      if (existing && existing.status !== "WITHDRAWN") {
        throw Object.assign(new Error("DUPLICATE_APPLICATION"), { code: "DUPLICATE_APPLICATION" });
      }
      // Applying again after withdrawing reuses the same record.
      if (existing) {
        return tx.application.update({ where: { id: existing.id }, data: { ...data, status: "PENDING" } });
      }
      return tx.application.create({
        data: { jobId: job.id, jobSeekerId: profile.id, applicationKey, ...data },
      });
    });
    return NextResponse.json({ application: { id: application.id, status: application.status } }, { status: 201 });
  } catch (error) {
    if (error?.code === "CV_NOT_FOUND") {
      return NextResponse.json({ error: "Choose one of your own CVs" }, { status: 400 });
    }
    if (error?.code === "DUPLICATE_APPLICATION" || error?.code === "P2002") {
      return NextResponse.json({ error: "You have already applied for this vacancy" }, { status: 409 });
    }
    console.error("Candidate application failed:", error);
    return NextResponse.json({ error: "Application could not be submitted" }, { status: 500 });
  }
}
