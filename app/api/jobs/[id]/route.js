import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PUBLIC_JOB_SELECT } from "@/lib/public-job";

const DETAIL_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=900";

export async function GET(request, context) {
  try {
    const { id } = await context.params;

    const job = await prisma.job.findFirst({
      where: {
        id,
        active: true,
      },
      select: PUBLIC_JOB_SELECT,
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(
      { job },
      { headers: { "Cache-Control": DETAIL_CACHE_CONTROL } }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
