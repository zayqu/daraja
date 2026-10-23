import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { absoluteSiteUrl } from "@/lib/site-config";
import {
  buildLinkedInAuthorizationUrl,
  LINKEDIN_STATE_COOKIE,
} from "@/lib/linkedin";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(absoluteSiteUrl("/auth/signin?callbackUrl=/account/linkedin"));
  }

  const clientId = String(process.env.AUTH_LINKEDIN_ID || "").trim();
  const clientSecret = String(process.env.AUTH_LINKEDIN_SECRET || "").trim();
  if (!clientId || !clientSecret || !process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY) {
    return NextResponse.redirect(absoluteSiteUrl("/account/linkedin?error=not-configured"));
  }

  const state = randomBytes(32).toString("base64url");
  const response = NextResponse.redirect(buildLinkedInAuthorizationUrl({ clientId, state }));
  response.cookies.set(LINKEDIN_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/linkedin/callback",
    maxAge: 10 * 60,
  });
  return response;
}
