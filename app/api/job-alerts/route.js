import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  EXPERIENCE_LEVELS,
  JOB_CATEGORIES,
  WORK_ARRANGEMENTS,
} from "@/lib/job-categories";
import { protectMutation, readProtectedJson } from "@/lib/request-security";

const MAX_VALUES = 10;
const MAX_VALUE_LENGTH = 80;

function normalizeList(value, allowedValues) {
  const values = Array.isArray(value) ? value : [];
  const normalized = [...new Set(
    values
      .map((item) => String(item).replace(/\s+/g, " ").trim())
      .filter((item) => item && item.length <= MAX_VALUE_LENGTH)
  )].slice(0, MAX_VALUES);
  return allowedValues
    ? normalized.filter((item) => allowedValues.includes(item))
    : normalized;
}

function publicPreferences(subscriber) {
  if (!subscriber) return null;
  return {
    categories: subscriber.categories,
    locations: subscriber.locations,
    experienceLevels: subscriber.experienceLevels,
    workArrangements: subscriber.workArrangements,
    organisations: subscriber.organisations,
    keywords: subscriber.keywords,
    active: subscriber.active,
    consentedAt: subscriber.consentedAt,
  };
}

async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return session.user;
}

export async function GET(request) {
  const token = new URL(request.url).searchParams.get("unsubscribe");
  if (token) {
    if (!/^[0-9a-f-]{36}$/i.test(token)) {
      return NextResponse.redirect(
        new URL("/alerts/unsubscribed?status=invalid", request.url)
      );
    }
    return NextResponse.redirect(
      new URL(`/alerts/unsubscribe?token=${encodeURIComponent(token)}`, request.url)
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to manage job alerts." }, { status: 401 });
  }
  const subscriber = await prisma.jobAlertSubscriber.findUnique({
    where: { userId: user.id },
  });
  return NextResponse.json({ preferences: publicPreferences(subscriber) });
}

export async function POST(request) {
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

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to save job alerts." }, { status: 401 });
  }

  const { body, error: requestError } = await readProtectedJson(request, {
    scope: "job-alert-preferences",
    limit: 20,
    maxBytes: 8_192,
  });
  if (requestError) return requestError;

  try {
    const categories = normalizeList(body.categories, JOB_CATEGORIES);
    if (!categories.length) {
      return NextResponse.json(
        { error: "Choose at least one job category." },
        { status: 400 }
      );
    }
    if (body.consent !== true) {
      return NextResponse.json(
        { error: "Consent is required before alerts can be enabled." },
        { status: 400 }
      );
    }

    const subscriber = await prisma.jobAlertSubscriber.upsert({
      where: { email: user.email.toLowerCase() },
      update: {
        userId: user.id,
        categories,
        locations: normalizeList(body.locations),
        experienceLevels: normalizeList(body.experienceLevels, EXPERIENCE_LEVELS),
        workArrangements: normalizeList(body.workArrangements, WORK_ARRANGEMENTS),
        organisations: normalizeList(body.organisations),
        keywords: normalizeList(body.keywords),
        interests: [],
        active: true,
        consentedAt: new Date(),
      },
      create: {
        userId: user.id,
        email: user.email.toLowerCase(),
        categories,
        locations: normalizeList(body.locations),
        experienceLevels: normalizeList(body.experienceLevels, EXPERIENCE_LEVELS),
        workArrangements: normalizeList(body.workArrangements, WORK_ARRANGEMENTS),
        organisations: normalizeList(body.organisations),
        keywords: normalizeList(body.keywords),
        consentedAt: new Date(),
      },
    });
    return NextResponse.json({ preferences: publicPreferences(subscriber) });
  } catch (error) {
    console.error("Job alert preferences failed:", error);
    return NextResponse.json(
      { error: "Preferences could not be saved. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to manage job alerts." }, { status: 401 });
  }
  const requestError = protectMutation(request, {
    scope: "job-alert-preferences",
    limit: 20,
  });
  if (requestError) return requestError;
  await prisma.jobAlertSubscriber.updateMany({
    where: { userId: user.id },
    data: { active: false },
  });
  return NextResponse.json({ active: false });
}
