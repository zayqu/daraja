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

    const allowedCategories = [
      "Government",
      "NGO & Development",
      "Banking & Finance",
      "Technology",
      "Sales & Marketing",
      "Accounting & Audit",
      "HR & Administration",
      "Legal",
      "Logistics & Transport",
      "Hospitality & Tourism",
      "Agriculture",
      "Mining, Energy, Oil & Gas",
      "Manufacturing",
      "Internships & Graduate Programs",
      "Education",
      "Health",
      "Engineering",
      "General",
    ];
    const allowedTypes = [
      "FULL_TIME",
      "PART_TIME",
      "CONTRACT",
      "INTERNSHIP",
      "FREELANCE",
    ];
    const clean = (value) => typeof value === "string" ? value.trim() : "";
    const cleanTitle = clean(title);
    const cleanCompany = clean(company);
    const cleanLocation = clean(location);
    const cleanDescription = clean(description);
    const cleanCategory = clean(category);
    const cleanType = clean(type) || "FULL_TIME";
    const cleanSalary = clean(salary);

    if (!cleanTitle || !cleanCompany || !cleanLocation || !cleanDescription || !cleanCategory) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: title, company, location, description, category",
        },
        { status: 400 }
      );
    }

    if (
      cleanTitle.length > 160 ||
      cleanCompany.length > 160 ||
      cleanLocation.length > 160 ||
      cleanSalary.length > 160 ||
      cleanDescription.length > 10000
    ) {
      return NextResponse.json(
        { error: "One or more fields exceed the allowed length." },
        { status: 400 }
      );
    }

    if (!allowedCategories.includes(cleanCategory) || !allowedTypes.includes(cleanType)) {
      return NextResponse.json(
        { error: "Invalid job category or job type." },
        { status: 400 }
      );
    }

    const deadlineDate = deadline ? new Date(deadline) : null;
    if (deadlineDate && (Number.isNaN(deadlineDate.getTime()) || deadlineDate < new Date())) {
      return NextResponse.json(
        { error: "Application deadline must be a valid future date." },
        { status: 400 }
      );
    }

    const job = await prisma.job.create({
      data: {
        title: cleanTitle,
        company: cleanCompany,
        location: cleanLocation,
        description: cleanDescription,
        category: cleanCategory,
        type: cleanType,
        salary: cleanSalary || null,
        deadline: deadlineDate,
        source: "daraja",
        language: "en",
        active: false,
      },
    });

    return NextResponse.json(
      {
        message: "Job submitted for review.",
        submissionId: job.id,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
