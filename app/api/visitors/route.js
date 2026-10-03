import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectMutation } from "@/lib/request-security";
import {
  currentVisitorPeriod,
  isLikelyBot,
  VISITOR_PERIOD_COOKIE,
} from "@/lib/visitor-counter";

const COOKIE_MAX_AGE = 35 * 24 * 60 * 60;

export async function POST(request) {
  const error = protectMutation(request, {
    scope: "visitor-counter",
    limit: 12,
    windowMs: 60_000,
    requireOrigin: true,
  });
  if (error) return error;

  if (request.headers.get("x-daraja-consent") !== "accepted") {
    return NextResponse.json(
      { counted: false, uniqueVisitors: null },
      { status: 202, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (isLikelyBot(request.headers.get("user-agent"))) {
    return NextResponse.json(
      { counted: false, uniqueVisitors: null },
      { status: 202, headers: { "Cache-Control": "no-store" } }
    );
  }

  const period = currentVisitorPeriod();
  const alreadyCounted =
    request.cookies.get(VISITOR_PERIOD_COOKIE)?.value === period;

  try {
    const record = alreadyCounted
      ? await prisma.visitorCounter.findUnique({
          where: { period },
          select: { uniqueVisitors: true },
        })
      : await prisma.visitorCounter.upsert({
          where: { period },
          create: { period, uniqueVisitors: 1 },
          update: { uniqueVisitors: { increment: 1 } },
          select: { uniqueVisitors: true },
        });

    const response = NextResponse.json(
      {
        counted: !alreadyCounted,
        uniqueVisitors: record?.uniqueVisitors || 0,
        period,
      },
      { headers: { "Cache-Control": "no-store" } }
    );

    if (!alreadyCounted) {
      response.cookies.set(VISITOR_PERIOD_COOKIE, period, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
    }

    return response;
  } catch (visitorError) {
    console.error("Visitor counter unavailable:", visitorError);
    return NextResponse.json(
      { error: "Visitor counter unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
