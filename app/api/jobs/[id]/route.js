import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request, context) {
  try {
    const { id } = await context.params;

    const job = await prisma.job.findUnique({
      where: { id: id },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const { id } = await context.params;

    await prisma.job.update({
      where: { id: id },
      data: { active: false },
    });

    return NextResponse.json({ message: "Job removed successfully" });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to remove job" }, { status: 500 });
  }
}