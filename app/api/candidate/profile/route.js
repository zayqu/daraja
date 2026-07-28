import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { candidateCareerEnabled, getCandidateUser, validHttpsUrl } from "@/lib/candidate-access";

const clean = (value, max = 160) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

export async function GET() {
  if (!candidateCareerEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await getCandidateUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const profile = await prisma.jobSeeker.findUnique({
    where: { userId: user.id },
    include: { documents: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  return NextResponse.json({ profile });
}

export async function PUT(request) {
  if (!candidateCareerEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await getCandidateUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json();
  const fullName = clean(body.fullName);
  if (!fullName) return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  const cvUrl = body.cvUrl ? validHttpsUrl(body.cvUrl) : null;
  const portfolioUrl = body.portfolioUrl ? validHttpsUrl(body.portfolioUrl) : null;
  if ((body.cvUrl && !cvUrl) || (body.portfolioUrl && !portfolioUrl)) {
    return NextResponse.json({ error: "Document and portfolio links must use HTTPS" }, { status: 400 });
  }
  const profile = await prisma.jobSeeker.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fullName,
      phone: clean(body.phone, 40) || null,
      headline: clean(body.headline) || null,
      location: clean(body.location) || null,
      experienceLevel: clean(body.experienceLevel, 80) || null,
      workArrangement: clean(body.workArrangement, 80) || null,
      cvUrl,
      portfolioUrl,
    },
    update: {
      fullName,
      phone: clean(body.phone, 40) || null,
      headline: clean(body.headline) || null,
      location: clean(body.location) || null,
      experienceLevel: clean(body.experienceLevel, 80) || null,
      workArrangement: clean(body.workArrangement, 80) || null,
      cvUrl,
      portfolioUrl,
    },
  });
  return NextResponse.json({ profile });
}
