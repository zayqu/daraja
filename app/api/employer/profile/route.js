import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { employerPortalEnabled, getActor, safeAuditMetadata } from "@/lib/employer-access";
import { readProtectedJson } from "@/lib/request-security";

const clean = (value, max = 160) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function GET() {
  if (!employerPortalEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!actor.employer) return NextResponse.json({ employer: null });
  return NextResponse.json({ employer: actor.employer });
}

export async function POST(request) {
  if (!employerPortalEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (actor.role !== "JOB_SEEKER" && actor.role !== "EMPLOYER") {
    return NextResponse.json({ error: "Account is not eligible" }, { status: 403 });
  }
  const { body, error } = await readProtectedJson(request, {
    scope: "employer-profile",
    limit: 15,
    maxBytes: 8_192,
  });
  if (error) return error;
  const companyName = clean(body.companyName);
  const website = clean(body.website, 500);
  const industry = clean(body.industry);
  if (!companyName) return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  if (website) {
    try {
      const url = new URL(website);
      if (url.protocol !== "https:") throw new Error();
    } catch {
      return NextResponse.json({ error: "Use a valid HTTPS company website" }, { status: 400 });
    }
  }
  const employer = await prisma.$transaction(async (tx) => {
    const record = await tx.employer.upsert({
      where: { userId: actor.id },
      create: { userId: actor.id, companyName, website: website || null, industry: industry || null },
      update: {
        companyName,
        website: website || null,
        industry: industry || null,
        verified: false,
        verificationStatus: "PENDING",
        verificationNote: null,
        verifiedAt: null,
      },
    });
    await tx.user.update({ where: { id: actor.id }, data: { role: "EMPLOYER" } });
    await tx.auditEvent.create({
      data: {
        actorUserId: actor.id,
        employerId: record.id,
        action: "EMPLOYER_VERIFICATION_REQUESTED",
        entityType: "Employer",
        entityId: record.id,
        metadata: safeAuditMetadata({ website, industry }),
      },
    });
    return record;
  });
  return NextResponse.json({ employer }, { status: 202 });
}
