import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { protectMutation } from "@/lib/request-security";

export async function DELETE(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const error = protectMutation(request, {
    scope: "linkedin-disconnect",
    limit: 6,
    windowMs: 60_000,
    requireOrigin: true,
    rateIdentity: session.user.id,
  });
  if (error) return error;

  await prisma.$transaction([
    prisma.linkedInConnection.deleteMany({ where: { userId: session.user.id } }),
    prisma.auditEvent.create({
      data: {
        actorUserId: session.user.id,
        action: "LINKEDIN_SHARING_DISCONNECTED",
        entityType: "User",
        entityId: session.user.id,
      },
    }),
  ]);

  return NextResponse.json({ disconnected: true });
}
