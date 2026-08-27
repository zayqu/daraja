import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import legacySlug from "@/lib/legacy-job-slug";

const { findJobByLegacySlug } = legacySlug;

export async function GET(request, context) {
  try {
    const { id } = await context.params;

    let job = await prisma.job.findFirst({
      where: {
        active: true,
        moderationStatus: "PUBLISHED",
        OR: [
          { id },
          { slug: id },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        company: true,
        location: true,
        description: true,
        category: true,
        type: true,
        salary: true,
        deadline: true,
        sourceUrl: true,
        source: true,
        createdAt: true,
      },
    });
    if (!job) {
      job = await findJobByLegacySlug(prisma, id, {
        slug: true,
        title: true,
        company: true,
        location: true,
        description: true,
        category: true,
        type: true,
        salary: true,
        deadline: true,
        sourceUrl: true,
        source: true,
        createdAt: true,
      });
    }

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const sourceUrl = job.sourceUrl?.startsWith("mailto:")
      ? job.sourceUrl
      : job.sourceUrl
        ? `/api/jobs/${encodeURIComponent(job.slug || job.id)}/apply`
        : null;

    return NextResponse.json({
      job: {
        ...job,
        sourceUrl,
        featured: false,
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
