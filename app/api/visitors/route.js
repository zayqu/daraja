import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectMutation } from "@/lib/request-security";
import {
  currentVisitorPeriod,
  isLikelyBot,
  VISITOR_PERIOD_COOKIE,
  VISITOR_SEEN_COOKIE,
  VISITOR_SESSION_COOKIE,
} from "@/lib/visitor-counter";

const PERIOD_COOKIE_MAX_AGE = 35 * 24 * 60 * 60;
const SEEN_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
const SESSION_COOKIE_MAX_AGE = 30 * 60;

const metricSelect = {
  totalVisits: true,
  newVisitors: true,
  returningVisitors: true,
  pageViews: true,
};

export async function POST(request) {
  const error = protectMutation(request, {
    scope: "visitor-counter",
    limit: 180,
    windowMs: 60_000,
    requireOrigin: true,
  });
  if (error) return error;

  if (isLikelyBot(request.headers.get("user-agent"))) {
    return NextResponse.json(
      { counted: false },
      { status: 202, headers: { "Cache-Control": "no-store" } }
    );
  }

  const period = currentVisitorPeriod();
  const countedThisMonth =
    request.cookies.get(VISITOR_PERIOD_COOKIE)?.value === period;
  const seenBefore = request.cookies.get(VISITOR_SEEN_COOKIE)?.value === "1";
  const activeSession =
    request.cookies.get(VISITOR_SESSION_COOKIE)?.value === "1";

  const isNewVisitor = !countedThisMonth && !seenBefore;
  const isReturningVisitor = !countedThisMonth && seenBefore;
  const isNewVisit = !activeSession;

  const create = {
    period,
    uniqueVisitors: countedThisMonth ? 0 : 1,
    totalVisits: isNewVisit ? 1 : 0,
    newVisitors: isNewVisitor ? 1 : 0,
    returningVisitors: isReturningVisitor ? 1 : 0,
    pageViews: 1,
  };

  const update = {
    pageViews: { increment: 1 },
    ...(isNewVisit ? { totalVisits: { increment: 1 } } : {}),
    ...(!countedThisMonth
      ? { uniqueVisitors: { increment: 1 } }
      : {}),
    ...(isNewVisitor ? { newVisitors: { increment: 1 } } : {}),
    ...(isReturningVisitor
      ? { returningVisitors: { increment: 1 } }
      : {}),
  };

  try {
    const record = await prisma.visitorCounter.upsert({
      where: { period },
      create,
      update,
      select: metricSelect,
    });

    const response = NextResponse.json(
      { counted: true, period, ...record },
      { headers: { "Cache-Control": "no-store" } }
    );

    response.cookies.set(VISITOR_SESSION_COOKIE, "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE,
    });

    response.cookies.set(VISITOR_SEEN_COOKIE, "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SEEN_COOKIE_MAX_AGE,
    });

    if (!countedThisMonth) {
      response.cookies.set(VISITOR_PERIOD_COOKIE, period, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: PERIOD_COOKIE_MAX_AGE,
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
