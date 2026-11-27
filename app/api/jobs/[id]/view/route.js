import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isLikelyBot, recordJobView } from "@/lib/job-views";

// The job page calls this once per browser per job per day (see
// JobViewBeacon). Only published jobs are counted and nothing about the
// visitor is stored.
export async function POST(request, context) {
  try {
    if (isLikelyBot(request.headers.get("user-agent"))) {
      return new NextResponse(null, { status: 204 });
    }
    const { id } = await context.params;
    const jobId = String(id || "").slice(0, 64);
    const job = await prisma.job.findFirst({
      where: { id: jobId, moderationStatus: "PUBLISHED" },
      select: { id: true },
    });
    if (job) await recordJobView(job.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Job view error:", error);
    return new NextResponse(null, { status: 204 });
  }
}
