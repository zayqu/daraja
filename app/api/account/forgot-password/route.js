import { NextResponse } from "next/server";
import { accountEmailConfigured, normalizeEmail, sendPasswordResetEmail } from "@/lib/password-auth";
import prisma from "@/lib/prisma";
import { readProtectedJson } from "@/lib/request-security";

const SENT = { ok: true, message: "If an account uses that email, we sent a link to reset the password." };

export async function POST(request) {
  const { body, error } = await readProtectedJson(request, {
    scope: "account-forgot-password",
    limit: 3,
    maxBytes: 1_024,
    requireOrigin: true,
  });
  if (error) return error;
  if (!accountEmailConfigured()) {
    return NextResponse.json({ error: "Password reset is temporarily unavailable." }, { status: 503 });
  }
  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, suspendedAt: true } });
  if (user && !user.suspendedAt) {
    await sendPasswordResetEmail(email).catch(() => {});
  }
  return NextResponse.json(SENT);
}
