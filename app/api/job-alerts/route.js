import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRequestBodyError, readJsonBody } from "@/lib/http";

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
    const body = await readJsonBody(request, 4096);
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
    const requestError = getRequestBodyError(error);
    if (requestError) {
      return NextResponse.json(
        { error: requestError.message },
        { status: requestError.status }
      );
    }
    console.error("Job alert subscription failed:", error);
    return NextResponse.json(
      { error: "Subscription could not be saved. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get("unsubscribe");
    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
      return NextResponse.redirect(new URL("/alerts/unsubscribed?status=invalid", request.url));
    }

    await prisma.jobAlertSubscriber.updateMany({
      where: { unsubscribeToken: token },
      data: { active: false },
    });
    return NextResponse.redirect(new URL("/alerts/unsubscribed", request.url));
  } catch (error) {
    console.error("Job alert unsubscribe failed:", error);
    return NextResponse.redirect(new URL("/alerts/unsubscribed?status=error", request.url));
  }
}
