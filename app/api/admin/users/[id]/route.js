import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActor, isAdmin } from "@/lib/employer-access";
import { ASSIGNABLE_ROLES, isOwnerEmail } from "@/lib/platform-roles";
import { readProtectedJson } from "@/lib/request-security";

const ALLOWED = new Set(ASSIGNABLE_ROLES);

export async function PATCH(request, { params }) {
  const actor = await getActor();
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 });
  const { body, error } = await readProtectedJson(request, {
    scope: "admin-user-role",
    limit: 20,
    maxBytes: 4_096,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  if (error) return error;
  const { id } = await params;
  const role = typeof body.role === "string" ? body.role : "";
  if (!ALLOWED.has(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (id === actor.id) return NextResponse.json({ error: "You cannot change your own role" }, { status: 409 });

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (isOwnerEmail(target.email)) return NextResponse.json({ error: "The owner account is always an admin" }, { status: 409 });
  if (target.role === role) return NextResponse.json({ user: { id: target.id, role } });

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id }, data: { role }, select: { id: true, role: true } });
    await tx.auditEvent.create({
      data: {
        actorUserId: actor.id,
        action: "USER_ROLE_CHANGED",
        entityType: "User",
        entityId: id,
        metadata: { from: target.role, to: role },
      },
    });
    return updated;
  });
  return NextResponse.json({ user });
}
