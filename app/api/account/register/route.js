import { NextResponse } from "next/server";
import { employerPortalEnabled } from "@/lib/features";
import {
  accountEmailConfigured,
  hashPassword,
  normalizeEmail,
  passwordProblem,
  sendVerificationEmail,
} from "@/lib/password-auth";
import prisma from "@/lib/prisma";
import { readProtectedJson } from "@/lib/request-security";

// The same reply whether or not the email is new, so the form cannot be used
// to discover who has a Daraja account.
const SENT = { ok: true, message: "Check your email to confirm your account." };

export async function POST(request) {
  const { body, error } = await readProtectedJson(request, {
    scope: "account-register",
    limit: 5,
    maxBytes: 4_096,
    requireOrigin: true,
  });
  if (error) return error;

  if (!accountEmailConfigured()) {
    return NextResponse.json(
      { error: "Account sign-up is temporarily unavailable. Please use Google." },
      { status: 503 }
    );
  }

  const email = normalizeEmail(body.email);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const password = typeof body.password === "string" ? body.password : "";
  // Nobody can sign up as an admin; employer sign-up needs the employer portal.
  const role = body.accountType === "employer" && employerPortalEnabled() ? "EMPLOYER" : "JOB_SEEKER";

  if (!name) return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true, _count: { select: { accounts: true } } },
  });

  // A confirmed account or a Google account is never overwritten here.
  if (existing && (existing.emailVerified || existing._count.accounts > 0)) {
    return NextResponse.json(SENT);
  }

  const passwordHash = await hashPassword(password);
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { name, password: passwordHash, role } });
  } else {
    await prisma.user.create({ data: { email, name, password: passwordHash, role } });
  }

  try {
    await sendVerificationEmail(email);
  } catch {
    return NextResponse.json(
      { error: "We could not send the confirmation email. Please try again shortly." },
      { status: 502 }
    );
  }
  return NextResponse.json(SENT);
}
