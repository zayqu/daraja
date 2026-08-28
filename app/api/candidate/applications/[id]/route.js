import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { candidateCareerEnabled, getCandidateUser } from "@/lib/candidate-access";
import { readProtectedJson } from "@/lib/request-security";

export async function PATCH(request, { params }) {
  if (!candidateCareerEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await getCandidateUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!user.jobSeeker) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  const { body, error } = await readProtectedJson(request, {
    scope: "candidate-application-status",
    limit: 30,
    maxBytes: 1_024,
  });
  if (error) return error;
  const { id } = await params;
  const { status } = body;
  if (status !== "WITHDRAWN") return NextResponse.json({ error: "Candidates may only withdraw applications" }, { status: 400 });
  const result = await prisma.application.updateMany({
    where: { id, jobSeekerId: user.jobSeeker.id, status: { in: ["PENDING", "REVIEWED"] } },
    data: { status: "WITHDRAWN" },
  });
  if (!result.count) return NextResponse.json({ error: "Application cannot be withdrawn" }, { status: 409 });
  return NextResponse.json({ status: "WITHDRAWN" });
}
