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
        applicationUrl: true,
        deadline: true,
      },
    });

    if (!job) {
      return jsonError("Job not found", 404);
    }
    if (job.deadline && job.deadline < new Date()) {
      return jsonError("Applications are closed", 410);
    }
    if (job.applicationUrl) {
      if (job.applicationUrl.startsWith("mailto:")) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: job.applicationUrl,
            "Cache-Control": "private, no-store",
          },
        });
      }

      if (!isSafePublicHttpUrl(job.applicationUrl)) {
        return jsonError("The application link is not allowed", 400);
      }

      // Stored destinations on a trusted source host are re-read live before
      // redirecting. This lets the source evolve from /auth to /auth/login,
      // or to a different application route, without Daraja hardcoding it.
      if (isAllowedResolverUrl(job.source, job.applicationUrl)) {
        const { response, url: resolvedUrl } = await fetchAllowedApplicationPage({
          source: job.source,
          url: job.applicationUrl,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
          const finalTarget = extractFinalApplicationUrl(
            await readBoundedApplicationHtml(response),
            resolvedUrl
          );
          if (finalTarget && finalTarget !== resolvedUrl) {
            return redirectTo(finalTarget);
          }
        }

        if (response.ok && isLikelyDirectApplicationUrl(resolvedUrl)) {
          return redirectTo(resolvedUrl);
        }
      } else {
        return redirectTo(job.applicationUrl);
      }
    }

    // Compatibility path for records created before applicationUrl existed.
    // Keep resolving the source page safely until the next source refresh
    // repopulates the distinct destination.
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

    if (job.source === "daraja" || isLikelyDirectApplicationUrl(job.sourceUrl)) {
      return redirectTo(job.sourceUrl);
    }

    if (!isAllowedResolverUrl(job.source, job.sourceUrl)) {
      return jsonError("A direct application link could not be verified", 502);
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

    return jsonError("A direct application link could not be verified", 502);
  } catch (error) {
    console.error("Application redirect error:", error);
    return jsonError("Unable to open the application right now", 502);
  }
}
