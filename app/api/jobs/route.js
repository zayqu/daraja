import { NextResponse } from "next/server";
import { normalizeJobsSearchParams } from "@/lib/job-search";
import {
  PUBLIC_JOBS_PAGE_SIZE,
  readPublicJobs,
} from "@/lib/public-jobs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = normalizeJobsSearchParams(searchParams);
    const requestedLimit = Number.parseInt(
      searchParams.get("limit") || String(PUBLIC_JOBS_PAGE_SIZE),
      10
    );
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : PUBLIC_JOBS_PAGE_SIZE;
    const source = (searchParams.get("source") || "").trim().slice(0, 100);

    const result = await readPublicJobs({
      ...filters,
      source,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
