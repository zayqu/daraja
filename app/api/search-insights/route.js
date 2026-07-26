import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import CATEGORIES from "@/config/job-categories.json";

export async function POST(request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 2048) {
      return NextResponse.json({ recorded: false }, { status: 413 });
    }

    const body = await request.json();
    const query = String(body.query || "").replace(/\s+/g, " ").trim();
    const category = String(body.category || "").trim();
    const resultCount = Number(body.resultCount);

    if (
      query.length < 2 ||
      query.length > 100 ||
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount > 100000
    ) {
      return NextResponse.json({ recorded: false }, { status: 400 });
    }

    await prisma.jobSearchInsight.create({
      data: {
        query,
        normalizedQuery: query.toLocaleLowerCase("en").replace(/[^\p{L}\p{N}\s]/gu, ""),
        category: CATEGORIES.includes(category) ? category : null,
        resultCount,
      },
    });

    return NextResponse.json({ recorded: true });
  } catch (error) {
    console.error("Job search insight could not be recorded:", error);
    return NextResponse.json({ recorded: false }, { status: 500 });
  }
}
