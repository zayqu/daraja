import { NextResponse } from "next/server";
import { candidateCareerEnabled, employerPortalEnabled } from "@/lib/features";
import { consumeToken, normalizeEmail, startSession } from "@/lib/password-auth";
import prisma from "@/lib/prisma";
import { roleHome } from "@/lib/platform-roles";

export async function GET(request) {
  const url = new URL(request.url);
  const email = normalizeEmail(url.searchParams.get("email"));
  const token = url.searchParams.get("token") || "";
  const fail = NextResponse.redirect(new URL("/auth/signin?error=link", url));

  if (!(await consumeToken("verify", email, token))) return fail;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, suspendedAt: true } });
  if (!user || user.suspendedAt) return fail;

  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  const home = roleHome(user.role, { employerPortal: employerPortalEnabled() });
  // First-time candidate verification continues into the existing protected
  // profile editor. Employer and admin destinations remain role-specific.
  const destination =
    user.role === "JOB_SEEKER" && candidateCareerEnabled()
      ? "/account/profile"
      : home;
  const response = NextResponse.redirect(new URL(destination, url));
  return startSession(response, request, user.id);
}
