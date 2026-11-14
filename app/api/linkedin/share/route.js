import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { decryptLinkedInToken, publishLinkedInTextShare } from "@/lib/linkedin";
import { readProtectedJson } from "@/lib/request-security";

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { error, body } = await readProtectedJson(request, {
    scope: "linkedin-share",
    limit: 10,
    windowMs: 60_000,
    requireOrigin: true,
    rateIdentity: session.user.id,
    maxBytes: 8_192,
  });
  if (error) return error;

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 3000) {
    return NextResponse.json(
      { error: "Post text must be between 1 and 3000 characters." },
      { status: 400 },
    );
  }

  const connection = await prisma.linkedInConnection.findUnique({
    where: { userId: session.user.id },
  });
  if (!connection) {
    return NextResponse.json({ error: "Connect LinkedIn before publishing." }, { status: 409 });
  }
  if (connection.expiresAt && connection.expiresAt <= new Date()) {
    return NextResponse.json({ error: "Your LinkedIn connection has expired. Reconnect it first." }, { status: 409 });
  }

  try {
    const result = await publishLinkedInTextShare({
      accessToken: decryptLinkedInToken(connection.accessTokenCiphertext),
      memberId: connection.memberId,
      text,
    });

    await prisma.auditEvent.create({
      data: {
        actorUserId: session.user.id,
        action: "LINKEDIN_POST_PUBLISHED",
        entityType: "LinkedInPost",
        entityId: result.postId || "unknown",
        metadata: { characterCount: text.length },
      },
    });

    return NextResponse.json({ published: true, postId: result.postId });
  } catch {
    return NextResponse.json(
      { error: "LinkedIn could not publish the post. Reconnect LinkedIn and try again." },
      { status: 502 },
    );
  }
}
