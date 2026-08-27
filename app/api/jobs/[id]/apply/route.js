import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  extractFinalApplicationUrl,
  isLikelyDirectApplicationUrl,
  isSafePublicHttpUrl,
} from "@/lib/application-target";

export const dynamic = "force-dynamic";

const REQUEST_TIMEOUT_MS = 15_000;
const AJIRA_LOGIN_URL = "https://portal.ajira.go.tz/auth";

function redirectTo(url) {
  return NextResponse.redirect(url, { status: 302 });
}

export async function GET(_request, context) {
  try {
    const { id } = await context.params;
    const job = await prisma.job.findFirst({
      where: {
        active: true,
        moderationStatus: "PUBLISHED",
        OR: [{ id }, { slug: id }],
      },
      select: {
        id: true,
        slug: true,
        source: true,
        sourceUrl: true,
        deadline: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.deadline && job.deadline < new Date()) {
      return NextResponse.json({ error: "Applications are closed" }, { status: 410 });
    }
    if (!job.sourceUrl) {
      return NextResponse.json(
        { error: "No application link is available" },
        { status: 404 }
      );
    }
    if (job.sourceUrl.startsWith("mailto:")) {
      return new Response(null, {
        status: 302,
        headers: { Location: job.sourceUrl },
      });
    }
    if (!isSafePublicHttpUrl(job.sourceUrl)) {
      return NextResponse.json(
        { error: "The application link is not allowed" },
        { status: 400 }
      );
    }

    // Employer-posted jobs and known ATS links already point at the application target.
    if (job.source === "daraja" || isLikelyDirectApplicationUrl(job.sourceUrl)) {
      return redirectTo(job.sourceUrl);
    }

    const response = await fetch(job.sourceUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "DarajaJobsBot/1.0 (+https://www.ajira.daraja.co.tz)",
      },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.ok && isLikelyDirectApplicationUrl(response.url)) {
      return redirectTo(response.url);
    }

    if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
      const finalTarget = extractFinalApplicationUrl(
        await response.text(),
        response.url || job.sourceUrl
      );
      if (finalTarget) return redirectTo(finalTarget);
    }

    // Ajira requires authentication before applying. Never send the user back to
    // the vacancy description page when the unauthenticated page exposes no CTA.
    if (job.source === "ajira") {
      return redirectTo(AJIRA_LOGIN_URL);
    }

    return NextResponse.json(
      { error: "A direct application link could not be verified" },
      { status: 502 }
    );
  } catch (error) {
    console.error("Application redirect error:", error);
    return NextResponse.json(
      { error: "Unable to open the application right now" },
      { status: 502 }
    );
  }
}
