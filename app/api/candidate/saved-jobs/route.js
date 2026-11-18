import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { candidateCareerEnabled, getCandidateUser } from "@/lib/candidate-access";
import { readProtectedJson } from "@/lib/request-security";

async function actor() {
  if (!candidateCareerEnabled()) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  const user = await getCandidateUser();
  return user ? { user } : { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
}

export async function GET(request) {
  const { user, error } = await actor();
  if (error) return error;

  const jobId = new URL(request.url).searchParams.get("jobId");
  if (jobId !== null) {
    if (!jobId || jobId.length > 128) {
      return NextResponse.json({ error: "Invalid vacancy." }, { status: 400 });
    }
    const savedJob = await prisma.savedJob.findUnique({
      where: { userId_jobId: { userId: user.id, jobId } },
      select: { id: true },
    });
    return NextResponse.json(
      { saved: Boolean(savedJob) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const savedJobs = await prisma.savedJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { job: { select: { slug: true, title: true, company: true, location: true, deadline: true, active: true } } },
  });
  return NextResponse.json({ savedJobs }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request) {
  const { user, error } = await actor();
  if (error) return error;
  const parsed = await readProtectedJson(request, {
    scope: "candidate-saved-job",
    limit: 60,
    maxBytes: 1_024,
  });
  if (parsed.error) return parsed.error;
  const { jobId } = parsed.body;
  const job = await prisma.job.findFirst({ where: { id: jobId, active: true }, select: { id: true } });
  if (!job) return NextResponse.json({ error: "Active vacancy not found" }, { status: 404 });
  const savedJob = await prisma.savedJob.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    create: { userId: user.id, jobId },
    update: {},
  });
  return NextResponse.json({ savedJob }, { status: 201 });
}

export async function DELETE(request) {
  const { user, error } = await actor();
  if (error) return error;
  const parsed = await readProtectedJson(request, {
    scope: "candidate-saved-job",
    limit: 60,
    maxBytes: 1_024,
  });
  if (parsed.error) return parsed.error;
  const { jobId } = parsed.body;
  await prisma.savedJob.deleteMany({ where: { userId: user.id, jobId } });
  return NextResponse.json({ saved: false });
}
