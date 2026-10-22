import { NextResponse } from "next/server";
import { ACCOUNT_DELETION_CONFIRMATION, AccountDeletionError, eraseAccount } from "@/lib/account-deletion";
import { getActor, isAdmin } from "@/lib/employer-access";
import prisma from "@/lib/prisma";
import { ASSIGNABLE_ROLES, isOwnerEmail } from "@/lib/platform-roles";
import { readProtectedJson } from "@/lib/request-security";

const ALLOWED = new Set(ASSIGNABLE_ROLES);

// Shared checks: the caller is an admin, the request is same-origin and
// throttled, and the target is neither the caller nor the owner account.
async function loadTarget(request, params, scope) {
  const actor = await getActor();
  if (!isAdmin(actor)) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 }) };
  }
  const { body, error } = await readProtectedJson(request, {
    scope,
    limit: 20,
    maxBytes: 4_096,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  if (error) return { error };
  const { id } = await params;
  if (id === actor.id) {
    return { error: NextResponse.json({ error: "You cannot change your own account here" }, { status: 409 }) };
  }
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, suspendedAt: true },
  });
  if (!target) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  if (isOwnerEmail(target.email)) {
    return { error: NextResponse.json({ error: "The owner account is always an active admin" }, { status: 409 }) };
  }
  return { actor, body, target };
}

// Change a role, or suspend / reinstate an account.
export async function PATCH(request, { params }) {
  const { actor, body, target, error } = await loadTarget(request, params, "admin-user-update");
  if (error) return error;

  if (typeof body.suspended === "boolean") {
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if (body.suspended && !reason) {
      return NextResponse.json({ error: "A reason is required to suspend an account" }, { status: 400 });
    }
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: target.id },
        data: body.suspended
          ? { suspendedAt: new Date(), suspendedReason: reason }
          : { suspendedAt: null, suspendedReason: null },
        select: { id: true, suspendedAt: true },
      });
      // Suspension signs the person out everywhere immediately.
      if (body.suspended) await tx.session.deleteMany({ where: { userId: target.id } });
      await tx.auditEvent.create({
        data: {
          actorUserId: actor.id,
          action: body.suspended ? "USER_SUSPENDED" : "USER_REINSTATED",
          entityType: "User",
          entityId: target.id,
          metadata: body.suspended ? { reason } : {},
        },
      });
      return updated;
    });
    return NextResponse.json({ user });
  }

  const role = typeof body.role === "string" ? body.role : "";
  if (!ALLOWED.has(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (target.role === role) return NextResponse.json({ user: { id: target.id, role } });

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: target.id }, data: { role }, select: { id: true, role: true } });
    await tx.auditEvent.create({
      data: {
        actorUserId: actor.id,
        action: "USER_ROLE_CHANGED",
        entityType: "User",
        entityId: target.id,
        metadata: { from: target.role, to: role },
      },
    });
    return updated;
  });
  return NextResponse.json({ user });
}

// Permanently erase an account with the same rules as self-service deletion.
export async function DELETE(request, { params }) {
  const { actor, target, error } = await loadTarget(request, params, "admin-user-delete");
  if (error) return error;
  try {
    await eraseAccount({
      userId: target.id,
      email: target.email,
      confirmation: ACCOUNT_DELETION_CONFIRMATION,
      acknowledgeDataLoss: true,
    });
  } catch (deletionError) {
    if (deletionError instanceof AccountDeletionError) {
      return NextResponse.json({ error: deletionError.message }, { status: deletionError.status });
    }
    throw deletionError;
  }
  await prisma.auditEvent.create({
    data: {
      actorUserId: actor.id,
      action: "USER_DELETED_BY_ADMIN",
      entityType: "User",
      entityId: "erased-account",
      metadata: { role: target.role },
    },
  });
  return NextResponse.json({ ok: true });
}
