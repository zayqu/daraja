import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    const location = searchParams.get("location");
    const search = searchParams.get("search");
    const source = searchParams.get("source");
    const type = searchParams.get("type");

    const skip = (page - 1) * limit;

    const where = { active: true };

    if (category) where.category = category;
    if (source) where.source = source;
    if (type) where.type = type;
    if (location) {
      where.location = { contains: location, mode: "insensitive" };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        select: {
          id: true,
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

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      company,
      location,
      description,
      category,
      type,
      salary,
      deadline,
    } = body;

    if (!title || !company || !location || !description || !category) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: title, company, location, description, category",
        },
        { status: 400 }
      );
    }

    const job = await prisma.job.create({
      data: {
        title,
        company,
        location,
        description,
        category,
        type: type || "FULL_TIME",
        salary: salary || null,
        deadline: deadline ? new Date(deadline) : null,
        source: "daraja",
        language: "en",
      },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}