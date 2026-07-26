import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 4096) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();

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

    await prisma.jobAlertSubscriber.upsert({
      where: { email },
      update: { active: true, consentedAt: new Date() },
      create: { email, consentedAt: new Date() },
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
