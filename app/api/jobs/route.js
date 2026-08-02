import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : 20;
    const category = searchParams.get("category");
    const location = searchParams.get("location");
    const search = searchParams.get("search");
    const source = searchParams.get("source");
    const type = searchParams.get("type");
    const status = searchParams.get("status") || "active";

    const skip = (page - 1) * limit;

    const where = { active: true };

    if (status === "expired") {
      where.deadline = { lt: new Date() };
    } else if (status !== "all") {
      where.OR = [
        { deadline: null },
        { deadline: { gte: new Date() } },
      ];
    }

    if (category) where.category = category;
    if (source) where.source = source;
    if (type) where.type = type;
    if (location) {
      where.location = { contains: location, mode: "insensitive" };
    }
    if (search) {
      const searchConditions = [
        { title: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          company: true,
          location: true,
          category: true,
          type: true,
          salary: true,
          deadline: true,
          source: true,
          sourceUrl: true,
          featured: true,
          language: true,
          createdAt: true,
        },
      }),
      prisma.job.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
