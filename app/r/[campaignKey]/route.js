import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// This is a distribution-only redirect, not a job application endpoint.
// No applicant identity, IP address, cookies, browser fingerprint or CV is stored.
export const dynamic = "force-dynamic";

const CAMPAIGN_KEY = /^daraja_pilot_[a-z0-9_-]{4,40}$/;
const INVALID = () => new Response("Campaign unavailable", {
  status: 404,
  headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
});

function safeDestination(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password ||
        !url.hostname.includes(".") || url.hostname.endsWith(".daraja.co.tz") ||
        url.href.length > 2000) return null;
    return url;
  } catch {
    return null;
  }
}

function isLikelyHumanNavigation(request) {
  const userAgent = request.headers.get("user-agent") || "";
  const purpose = [
    request.headers.get("purpose"), request.headers.get("sec-purpose"),
    request.headers.get("x-purpose"),
  ].filter(Boolean).join(" ");
  if (/prefetch|prerender/i.test(purpose)) return false;
  if (/bot|crawler|spider|preview|facebookexternalhit|Google-InspectionTool|headless|monitor/i.test(userAgent)) return false;
  // A count describes redirect requests, never unique people or completed applications.
  return true;
}

export async function GET(request, { params }) {
  const { campaignKey } = await params;
  if (typeof campaignKey !== "string" || !CAMPAIGN_KEY.test(campaignKey)) return INVALID();

  const campaign = await prisma.distributionCampaign.findUnique({
    where: { campaignKey },
    select: {
      status: true, publishedAt: true, destinationMode: true, destinationUrl: true,
      employer: { select: { verificationStatus: true } },
      job: { select: { active: true, moderationStatus: true, deadline: true } },
    },
  });
  if (!campaign || campaign.destinationMode !== "PARTNER_DIRECT" ||
      campaign.status !== "LIVE" || !campaign.publishedAt ||
      campaign.employer.verificationStatus !== "VERIFIED") return INVALID();

  if (campaign.destinationMode === "AJIRA_LANDING" &&
      (!campaign.job || !campaign.job.active ||
       campaign.job.moderationStatus !== "PUBLISHED" ||
       (campaign.job.deadline && campaign.job.deadline < new Date()))) return INVALID();

  const destination = safeDestination(campaign.destinationUrl);
  if (!destination) return INVALID();

  destination.searchParams.set("utm_source", "daraja");
  destination.searchParams.set("utm_medium", "whatsapp_channel");
  destination.searchParams.set("utm_campaign", campaignKey);

  if (request.method === "GET" && isLikelyHumanNavigation(request)) {
    try {
      await prisma.distributionCampaign.update({
        where: { campaignKey },
        data: { outboundRedirects: { increment: 1 }, redirectsRecordedAt: new Date() },
      });
    } catch (error) {
      // A reporting outage must not block a candidate's journey to the official ATS.
      console.error("Campaign aggregate redirect counter unavailable");
    }
  }
  const response = NextResponse.redirect(destination.toString(), { status: 302 });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
