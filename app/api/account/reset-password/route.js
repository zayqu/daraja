import { NextResponse } from "next/server";
import { employerPortalEnabled } from "@/lib/features";
import {
  consumeToken,
  hashPassword,
  normalizeEmail,
  passwordProblem,
  startSession,
} from "@/lib/password-auth";
import prisma from "@/lib/prisma";
import { roleHome } from "@/lib/platform-roles";
import { readProtectedJson } from "@/lib/request-security";

export async function POST(request) {
  const { body, error } = await readProtectedJson(request, {
    scope: "account-reset-password",
    limit: 5,
    maxBytes: 4_096,
    requireOrigin: true,
  });
  if (error) return error;
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (!(await consumeToken("reset", email, body.token))) {
    return NextResponse.json(
      { error: "This reset link has expired or was already used. Request a new one." },
      { status: 400 }
    );
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, emailVerified: true, suspendedAt: true },
  });
  if (!user || user.suspendedAt) {
    return NextResponse.json({ error: "This account cannot be reset." }, { status: 403 });
  }

  // The reset link proves the email; every other signed-in device is signed out.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(password), emailVerified: user.emailVerified || new Date() },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  const response = NextResponse.json({
    redirectTo: roleHome(user.role, { employerPortal: employerPortalEnabled() }),
  });
  return startSession(response, request, user.id);
}
