import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INTERESTS = 5;

function normalizeInterests(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(
    values
      .map((interest) => String(interest).replace(/\s+/g, " ").trim())
      .filter((interest) => interest.length >= 2 && interest.length <= 60)
  )].slice(0, MAX_INTERESTS);
}

export async function POST(request) {
  try {
    const unsubscribeToken = new URL(request.url).searchParams.get("unsubscribe");
    if (unsubscribeToken) {
      if (!/^[0-9a-f-]{36}$/i.test(unsubscribeToken)) {
        return NextResponse.redirect(
          new URL("/alerts/unsubscribed?status=invalid", request.url),
          303
        );
      }

      await prisma.jobAlertSubscriber.updateMany({
        where: { unsubscribeToken },
        data: { active: false },
      });
      return NextResponse.redirect(new URL("/alerts/unsubscribed", request.url), 303);
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 4096) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const interests = normalizeInterests(body.interests);

    if (body.website) {
      return NextResponse.json({ subscribed: true });
    }
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }
    if (body.consent !== true) {
      return NextResponse.json(
        { error: "Please agree to receive job alerts." },
        { status: 400 }
      );
    }
    if (!interests.length) {
      return NextResponse.json(
        { error: "Enter at least one job field or position." },
        { status: 400 }
      );
    }

    await prisma.jobAlertSubscriber.upsert({
      where: { email },
      update: { active: true, consentedAt: new Date(), interests },
      create: { email, consentedAt: new Date(), interests },
    });

    return NextResponse.json({ subscribed: true });
  } catch (error) {
    console.error("Job alert subscription failed:", error);
    return NextResponse.json(
      { error: "Subscription could not be saved. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const token = new URL(request.url).searchParams.get("unsubscribe");
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.redirect(
      new URL("/alerts/unsubscribed?status=invalid", request.url)
    );
  }

  return NextResponse.redirect(
    new URL(`/alerts/unsubscribe?token=${encodeURIComponent(token)}`, request.url)
  );
}
