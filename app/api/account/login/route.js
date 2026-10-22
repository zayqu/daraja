import { NextResponse } from "next/server";
import { employerPortalEnabled } from "@/lib/features";
import {
  normalizeEmail,
  safeRedirectPath,
  startSession,
  verifyPassword,
} from "@/lib/password-auth";
import prisma from "@/lib/prisma";
import { roleHome } from "@/lib/platform-roles";
import { readProtectedJson } from "@/lib/request-security";

const INVALID = "That email and password do not match an account.";

export async function POST(request) {
  const { body, error } = await readProtectedJson(request, {
    scope: "account-login",
    limit: 10,
    maxBytes: 4_096,
    requireOrigin: true,
  });
  if (error) return error;

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true, password: true, emailVerified: true, suspendedAt: true },
      })
    : null;

  // Always run the hash check so unknown emails take as long as wrong passwords.
  const valid = await verifyPassword(password, user?.password);
  if (!user || !valid) {
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Confirm your email first. We can send the link again.", code: "EMAIL_NOT_VERIFIED" },
      { status: 403 }
    );
  }
  if (user.suspendedAt) {
    return NextResponse.json(
      { error: "This account is suspended. Contact Daraja support." },
      { status: 403 }
    );
  }

  const home = roleHome(user.role, { employerPortal: employerPortalEnabled() });
  const redirectTo = safeRedirectPath(body.callbackUrl, home);
  const response = NextResponse.json({ redirectTo });
  return startSession(response, request, user.id);
}
