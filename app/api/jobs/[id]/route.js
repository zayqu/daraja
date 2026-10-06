import { NextResponse } from "next/server";
import { findPublicJob, serializePublicJob } from "@/lib/public-job";

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const job = await findPublicJob(id);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job: serializePublicJob(job) });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
