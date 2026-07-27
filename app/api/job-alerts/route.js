import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateJobAlertSubscription } from "@/lib/job-alert-validation.mjs";

export async function POST(request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 4096) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    if (body?.website) {
      return NextResponse.json({ subscribed: true });
    }

    const validation = validateJobAlertSubscription(body);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await prisma.jobAlertSubscriber.upsert({
      where: { email: validation.email },
      update: {
        active: true,
        consentedAt: new Date(),
        interests: validation.interests,
      },
      create: {
        email: validation.email,
        consentedAt: new Date(),
        interests: validation.interests,
      },
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
