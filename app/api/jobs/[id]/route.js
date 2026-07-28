import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request, context) {
  try {
    const { id } = await context.params;

    const job = await prisma.job.findFirst({
      where: {
        active: true,
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
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      job: {
        ...job,
        featured: false,
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}
