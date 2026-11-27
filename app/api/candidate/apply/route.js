import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { candidateCareerEnabled, getCandidateUser } from "@/lib/candidate-access";
import { loadSiteSettings } from "@/lib/features";
import { bestCvId, candidateExtrasPricing, findApplyableJob, scoreCvForJob } from "@/lib/apply-with-cv";

const privateJson = (payload, init = {}) =>
  NextResponse.json(payload, { ...init, headers: { "Cache-Control": "private, no-store, max-age=0" } });

// What the Apply with Daraja CV sheet needs for one job: the candidate's CVs
// scored against it, the best one, and whether they already applied.
export async function GET(request) {
  await loadSiteSettings();
  if (!candidateCareerEnabled()) return privateJson({ error: "Not found" }, { status: 404 });
  const jobId = new URL(request.url).searchParams.get("jobId") || "";
  const job = await findApplyableJob(jobId.slice(0, 200));
  if (!job) return privateJson({ error: "This vacancy is not taking applications on Daraja" }, { status: 404 });

  const user = await getCandidateUser();
  if (!user) return privateJson({ signedIn: false, job: { id: job.id, title: job.title, company: job.company } });

  const [cvs, application] = user.jobSeeker
    ? await Promise.all([
        prisma.candidateCv.findMany({
          where: { jobSeekerId: user.jobSeeker.id },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: { id: true, name: true, kind: true, mode: true, targetJobId: true, content: true, updatedAt: true },
        }),
        prisma.application.findUnique({
          where: { applicationKey: `${user.jobSeeker.id}:${job.id}` },
          select: { id: true, status: true, createdAt: true },
        }),
      ])
    : [[], null];

  const scored = cvs.map((cv) => scoreCvForJob(cv, job));
  return privateJson({
    signedIn: true,
    job: { id: job.id, slug: job.slug, title: job.title, company: job.company },
    cvs: scored,
    bestCvId: bestCvId(scored),
    application: application && application.status !== "WITHDRAWN" ? application : null,
    pricing: candidateExtrasPricing(),
  });
}
