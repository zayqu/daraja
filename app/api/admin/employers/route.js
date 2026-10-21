import { NextResponse } from "next/server";
import { parseEmployerProfile } from "@/lib/admin-employer-input";
import { getActor, isAdmin, safeAuditMetadata } from "@/lib/employer-access";
import prisma from "@/lib/prisma";
import { isOwnerEmail } from "@/lib/platform-roles";
import { readProtectedJson } from "@/lib/request-security";

// Add a company for an existing Daraja user (found by email). The user
// becomes an employer; the admin may verify the company straight away.
export async function POST(request) {
  const actor = await getActor();
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 });
  const { body, error } = await readProtectedJson(request, {
    scope: "admin-employer-create",
    limit: 20,
    maxBytes: 4_096,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  if (error) return error;

  const { data, error: invalid } = parseEmployerProfile(body);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const user = email
    ? await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, email: true, employer: { select: { id: true } } } })
    : null;
  if (!user) {
    return NextResponse.json(
      { error: "No Daraja account uses that email. Ask the employer to create an account first." },
      { status: 404 }
    );
  }
  if (user.employer) return NextResponse.json({ error: "That account already has a company" }, { status: 409 });
  if (user.role === "ADMIN" || isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Admin accounts cannot own a company profile" }, { status: 409 });
  }
  const verify = body.verify === true;
  const employer = await prisma.$transaction(async (tx) => {
    const created = await tx.employer.create({
      data: {
        ...data,
        userId: user.id,
        verificationStatus: verify ? "VERIFIED" : "PENDING",
        verified: verify,
        verifiedAt: verify ? new Date() : null,
      },
    });
    await tx.user.update({ where: { id: user.id }, data: { role: "EMPLOYER" } });
    await tx.auditEvent.create({
      data: {
        actorUserId: actor.id,
        employerId: created.id,
        action: "EMPLOYER_CREATED_BY_ADMIN",
        entityType: "Employer",
        entityId: created.id,
        metadata: safeAuditMetadata({ companyName: data.companyName, verified: verify }),
      },
    });
    return created;
  });
  return NextResponse.json({ employer: { id: employer.id } }, { status: 201 });
}
