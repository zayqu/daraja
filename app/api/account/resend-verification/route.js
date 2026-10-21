import { NextResponse } from "next/server";
import { accountEmailConfigured, normalizeEmail, sendVerificationEmail } from "@/lib/password-auth";
import prisma from "@/lib/prisma";
import { readProtectedJson } from "@/lib/request-security";

const SENT = { ok: true, message: "If that account is waiting for confirmation, we sent a new link." };

export async function POST(request) {
  const { body, error } = await readProtectedJson(request, {
    scope: "account-resend-verification",
    limit: 3,
    maxBytes: 1_024,
    requireOrigin: true,
  });
  if (error) return error;
  const email = normalizeEmail(body.email);
  if (!email || !accountEmailConfigured()) return NextResponse.json(SENT);
  const user = await prisma.user.findUnique({ where: { email }, select: { password: true, emailVerified: true } });
  if (user?.password && !user.emailVerified) {
    await sendVerificationEmail(email).catch(() => {});
  }
  return NextResponse.json(SENT);
}
