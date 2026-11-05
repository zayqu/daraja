import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { getActor, isAdmin } from "@/lib/employer-access";
import { readProtectedJson } from "@/lib/request-security";

const allowedTypes = new Set(["RECRUITMENT_AGENCY", "DIRECT_EMPLOYER", "BANK"]);
const allowedModes = new Set(["PARTNER_DIRECT", "AJIRA_LANDING"]);
const allowedStatuses = new Set(["DRAFT", "LIVE", "CLOSED"]);
const errorResponse = (message, status = 400) => NextResponse.json({ error: message }, { status });

function optionalCount(value) {
  if (value === null || value === "") return null;
  if (!Number.isSafeInteger(value) || value < 0 || value > 100_000_000) return undefined;
  return value;
}

function postUrl(value) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 500) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "whatsapp.com" ||
        !url.pathname.startsWith("/channel/") || url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

async function adminRequest(request) {
  const actor = await getActor();
  if (!isAdmin(actor)) return { error: errorResponse("Admin access required", actor ? 403 : 401) };
  const { body, error } = await readProtectedJson(request, {
    scope: "distribution-campaigns",
    limit: 20,
    maxBytes: 4096,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  return error ? { error } : { actor, body };
}

export async function POST(request) {
  const { actor, body, error } = await adminRequest(request);
  if (error) return error;
  if (typeof body.employerId !== "string" || typeof body.jobId !== "string" ||
      !allowedTypes.has(body.partnerType) || !allowedModes.has(body.destinationMode) || body.partnerApproved !== true ||
      typeof body.approvalReference !== "string" ||
      body.approvalReference.trim().length < 10 || body.approvalReference.length > 300) {
    return errorResponse("Verified partner, owned vacancy, partner permission and permission reference are required.");
  }
  const [employer, job] = await Promise.all([
    prisma.employer.findUnique({ where: { id: body.employerId }, select: { verificationStatus: true } }),
    prisma.job.findUnique({ where: { id: body.jobId }, select: {
      employerId: true, active: true, moderationStatus: true, deadline: true, applicationUrl: true,
    } }),
  ]);
  if (!employer || employer.verificationStatus !== "VERIFIED") return errorResponse("Verify the partner first.", 409);
  if (!job || job.employerId !== body.employerId || !job.active ||
      job.moderationStatus !== "PUBLISHED" || (job.deadline && job.deadline < new Date())) {
    return errorResponse("Use a currently published vacancy owned by this verified partner.", 409);
  }
  // Distribution-only campaign must lead to the partner's official external application system.
  let destination;
  try { destination = new URL(job.applicationUrl); }
  catch { return errorResponse("An official HTTPS application link is required.", 409); }
  if (destination.protocol !== "https:" || destination.username || destination.password ||
      !destination.hostname.includes(".") || destination.hostname.endsWith(".daraja.co.tz")) {
    return errorResponse("An external official HTTPS application link is required.", 409);
  }
  const campaignKey = `daraja_pilot_${randomBytes(8).toString("hex")}`;
  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.distributionCampaign.create({
      data: {
        campaignKey, employerId: body.employerId, jobId: body.jobId,
        partnerType: body.partnerType, destinationMode: body.destinationMode,
        destinationUrl: destination.toString(), approvedByPartnerAt: new Date(),
      },
    });
    await tx.auditEvent.create({ data: {
      actorUserId: actor.id, employerId: body.employerId,
      action: "DISTRIBUTION_CAMPAIGN_CREATED", entityType: "DistributionCampaign",
      entityId: created.id, metadata: { approvalReference: body.approvalReference.trim().slice(0, 300) },
    } });
    return created;
  });
  return NextResponse.json({ id: campaign.id, campaignKey: campaign.campaignKey }, { status: 201 });
}

export async function PATCH(request) {
  const { actor, body, error } = await adminRequest(request);
  if (error) return error;
  if (typeof body.id !== "string" || body.id.length > 100) return errorResponse("Invalid campaign.");
  const current = await prisma.distributionCampaign.findUnique({
    where: { id: body.id },
    select: { id: true, employerId: true, status: true, job: { select: {
      active: true, moderationStatus: true, deadline: true,
    } } },
  });
  if (!current) return errorResponse("Campaign not found.", 404);
  if (!allowedStatuses.has(body.status)) return errorResponse("Invalid campaign status.");
  if (current.status === "CLOSED" && body.status !== "CLOSED") return errorResponse("Closed campaigns cannot reopen.", 409);
  if (body.status === "LIVE" && (!current.job.active || current.job.moderationStatus !== "PUBLISHED" ||
      (current.job.deadline && current.job.deadline < new Date()))) {
    return errorResponse("Cannot run a campaign for a closed vacancy.", 409);
  }
  const link = postUrl(body.whatsappPostUrl);
  if (link === undefined) return errorResponse("Use the real WhatsApp Channel post URL.");
  if (body.status === "LIVE" && !link) return errorResponse("A real WhatsApp post URL is required before marking live.");
  const counts = {};
  for (const key of ["views24h", "views7d", "reportedApplications", "reportedInterviews", "reportedHires"]) {
    if (Object.hasOwn(body, key)) {
      const number = optionalCount(body[key]);
      if (number === undefined) return errorResponse(`Invalid ${key} count.`);
      counts[key] = number;
    }
  }
  if (Object.hasOwn(body, "ga4Sessions") || Object.hasOwn(body, "ga4ApplyClicks")) {
    return errorResponse("GA4 statistics must come from a verified integration, not manual entry.");
  }
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.distributionCampaign.update({
      where: { id: current.id },
      data: {
        status: body.status, whatsappPostUrl: link,
        ...counts,
        ...(body.status === "LIVE" && current.status === "DRAFT" ? { publishedAt: now } : {}),
        ...(Object.hasOwn(counts, "views24h") || Object.hasOwn(counts, "views7d")
          ? { viewsRecordedAt: now } : {}),
        ...(Object.hasOwn(counts, "reportedApplications") || Object.hasOwn(counts, "reportedInterviews") ||
          Object.hasOwn(counts, "reportedHires") ? { outcomesRecordedAt: now } : {}),
      },
    });
    await tx.auditEvent.create({ data: {
      actorUserId: actor.id, employerId: current.employerId,
      action: "DISTRIBUTION_CAMPAIGN_UPDATED", entityType: "DistributionCampaign",
      entityId: current.id, metadata: { status: body.status, fields: Object.keys(counts) },
    } });
  });
  return NextResponse.json({ ok: true });
}
