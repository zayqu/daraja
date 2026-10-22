// Email + password accounts that live beside Google sign-in.
//
// Auth.js keeps database sessions (see auth.js). Its Credentials provider only
// supports JWT sessions, so password sign-in verifies the password here and
// then creates the same database Session row and cookie Auth.js reads. Every
// session therefore stays revocable and bounded by SESSION_MAX_AGE_SECONDS.

import { randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { hashToken, sessionCookieName } from "@/lib/password-crypto";
import { siteSetting } from "@/lib/features";
import { SITE_ORIGIN } from "@/lib/site-config";

export {
  hashPassword,
  normalizeEmail,
  passwordProblem,
  safeRedirectPath,
  verifyPassword,
} from "@/lib/password-crypto";

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export async function startSession(response, request, userId) {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await prisma.session.create({ data: { sessionToken, userId, expires } });
  const name = sessionCookieName(request);
  response.cookies.set(name, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: name.startsWith("__Secure-"),
    expires,
  });
  return response;
}

const PURPOSES = {
  verify: { prefix: "verify-email:", ttl: VERIFY_TTL_MS },
  reset: { prefix: "password-reset:", ttl: RESET_TTL_MS },
};

// One-time tokens reuse Auth.js's VerificationToken table. Only a hash is
// stored, and issuing a new token replaces any earlier one for that purpose.
export async function issueToken(purpose, email) {
  const { prefix, ttl } = PURPOSES[purpose];
  const identifier = `${prefix}${email}`;
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token: hashToken(token), expires: new Date(Date.now() + ttl) },
    }),
  ]);
  return token;
}

export async function consumeToken(purpose, email, token) {
  const { prefix } = PURPOSES[purpose];
  if (!email || typeof token !== "string" || token.length < 20 || token.length > 200) return false;
  const identifier = `${prefix}${email}`;
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier, token: hashToken(token) } },
  });
  if (!record) return false;
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  return record.expires.getTime() > Date.now();
}

export function accountLink(path, params) {
  const url = new URL(path, SITE_ORIGIN);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

export function accountEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && siteSetting("email.accountFrom"));
}

export async function sendAccountEmail({ to, subject, intro, actionLabel, actionUrl, note }, fetchFn = fetch) {
  if (!accountEmailConfigured()) throw new Error("Account email is not configured");
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7f9;font-family:Arial,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td style="font-weight:800;letter-spacing:.12em;color:#0f766e">DARAJA</td></tr>
<tr><td style="padding-top:20px;font-size:16px;line-height:1.6">${escapeHtml(intro)}</td></tr>
<tr><td style="padding:24px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">${escapeHtml(actionLabel)}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:#6b7280">${escapeHtml(note)}</td></tr>
</table></td></tr></table></body></html>`;
  const response = await fetchFn("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: siteSetting("email.accountFrom"),
      to: [to],
      subject,
      html,
      text: `${intro}\n\n${actionLabel}: ${actionUrl}\n\n${note}`,
    }),
  });
  if (!response.ok) throw new Error(`Account email failed (HTTP ${response.status})`);
}

export async function sendVerificationEmail(email) {
  const token = await issueToken("verify", email);
  await sendAccountEmail({
    to: email,
    subject: "Confirm your Daraja account",
    intro: "Welcome to Daraja. Confirm your email address to finish creating your account.",
    actionLabel: "Confirm my email",
    actionUrl: accountLink("/api/account/verify-email", { email, token }),
    note: "This link works once and expires in 24 hours. If you did not create a Daraja account, you can ignore this email.",
  });
}

export async function sendPasswordResetEmail(email) {
  const token = await issueToken("reset", email);
  await sendAccountEmail({
    to: email,
    subject: "Reset your Daraja password",
    intro: "We received a request to set a new password for your Daraja account.",
    actionLabel: "Choose a new password",
    actionUrl: accountLink("/auth/reset-password", { email, token }),
    note: "This link works once and expires in 1 hour. If you did not ask for this, you can ignore this email and your password stays the same.",
  });
}
