import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  extractFinalApplicationUrl,
  fetchAllowedApplicationPage,
  isAllowedResolverUrl,
  isLikelyDirectApplicationUrl,
  isSafePublicHttpUrl,
  readBoundedApplicationHtml,
} from "@/lib/application-target";

export const dynamic = "force-dynamic";

const REQUEST_TIMEOUT_MS = 15_000;
const AJIRA_LOGIN_URL = "https://portal.ajira.go.tz/auth";

function redirectTo(url) {
  const response = NextResponse.redirect(url, { status: 302 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function jsonError(message, status) {
  const response = NextResponse.json({ error: message }, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
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
      return jsonError("Job not found", 404);
    }
    if (job.deadline && job.deadline < new Date()) {
      return jsonError("Applications are closed", 410);
    }
    if (!job.sourceUrl) {
      return jsonError("No application link is available", 404);
    }
    if (job.sourceUrl.startsWith("mailto:")) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: job.sourceUrl,
          "Cache-Control": "private, no-store",
        },
      });
    }
    if (!isSafePublicHttpUrl(job.sourceUrl)) {
      return jsonError("The application link is not allowed", 400);
    }

    // Employer-posted jobs and known ATS links already point at the application target.
    if (job.source === "daraja" || isLikelyDirectApplicationUrl(job.sourceUrl)) {
      return redirectTo(job.sourceUrl);
    }

    // Only fetch exact, source-owned hosts. Other verified destinations are
    // opened in the candidate's browser without turning Daraja into a proxy.
    if (!isAllowedResolverUrl(job.source, job.sourceUrl)) {
      return redirectTo(job.sourceUrl);
    }

    const { response, url: resolvedUrl } = await fetchAllowedApplicationPage({
      source: job.source,
      url: job.sourceUrl,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.ok && isLikelyDirectApplicationUrl(resolvedUrl)) {
      return redirectTo(resolvedUrl);
    }

    if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
      const finalTarget = extractFinalApplicationUrl(
        await readBoundedApplicationHtml(response),
        resolvedUrl
      );
      if (finalTarget) return redirectTo(finalTarget);
    }

    // Ajira requires authentication before applying. Never send the user back to
    // the vacancy description page when the unauthenticated page exposes no CTA.
    if (job.source === "ajira") {
      return redirectTo(AJIRA_LOGIN_URL);
    }

    return jsonError("A direct application link could not be verified", 502);
  } catch (error) {
    console.error("Application redirect error:", error);
    return jsonError("Unable to open the application right now", 502);
  }
}
