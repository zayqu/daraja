import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  encryptLinkedInToken,
  exchangeLinkedInCode,
  fetchLinkedInProfile,
  LINKEDIN_STATE_COOKIE,
} from "@/lib/linkedin";
import { absoluteSiteUrl } from "@/lib/site-config";

function finish(path) {
  const response = NextResponse.redirect(absoluteSiteUrl(path));
  response.cookies.set(LINKEDIN_STATE_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/linkedin/callback",
    maxAge: 0,
  });
  return response;
}

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) return finish("/auth/signin?callbackUrl=/account/linkedin");

  const url = new URL(request.url);
  if (url.searchParams.get("error")) return finish("/account/linkedin?error=cancelled");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get(LINKEDIN_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return finish("/account/linkedin?error=invalid-state");
  }

  const clientId = String(process.env.AUTH_LINKEDIN_ID || "").trim();
  const clientSecret = String(process.env.AUTH_LINKEDIN_SECRET || "").trim();
  if (!clientId || !clientSecret) return finish("/account/linkedin?error=not-configured");

  try {
    const token = await exchangeLinkedInCode({ code, clientId, clientSecret });
    if (!token?.access_token) throw new Error("LinkedIn did not return an access token");

    const profile = await fetchLinkedInProfile(token.access_token);
    if (!profile?.sub) throw new Error("LinkedIn did not return a member identifier");

    const expiresIn = Number(token.expires_in);
    const expiresAt = Number.isFinite(expiresIn)
      ? new Date(Date.now() + expiresIn * 1000)
      : null;

    await prisma.$transaction([
      prisma.linkedInConnection.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          memberId: profile.sub,
          displayName: profile.name || null,
          profileImageUrl: profile.picture || null,
          accessTokenCiphertext: encryptLinkedInToken(token.access_token),
          expiresAt,
          scope: String(token.scope || "openid profile w_member_social"),
        },
        update: {
          memberId: profile.sub,
          displayName: profile.name || null,
          profileImageUrl: profile.picture || null,
          accessTokenCiphertext: encryptLinkedInToken(token.access_token),
          expiresAt,
          scope: String(token.scope || "openid profile w_member_social"),
          connectedAt: new Date(),
        },
      }),
      prisma.auditEvent.create({
        data: {
          actorUserId: session.user.id,
          action: "LINKEDIN_SHARING_CONNECTED",
          entityType: "User",
          entityId: session.user.id,
        },
      }),
    ]);

    return finish("/account/linkedin?connected=1");
  } catch {
    return finish("/account/linkedin?error=connection-failed");
  }
}
