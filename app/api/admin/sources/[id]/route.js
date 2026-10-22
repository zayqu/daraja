import { NextResponse } from "next/server";
import { getActor, isAdmin } from "@/lib/employer-access";
import prisma from "@/lib/prisma";
import { readProtectedJson } from "@/lib/request-security";
import sourceSettings from "@/scraper/lib/source-settings";

const { getSourceCatalog } = sourceSettings;

// Turn a scraper source on or off. Only sources with a tested adapter can be
// switched; the next hourly scrape follows the new setting.
export async function PATCH(request, { params }) {
  const actor = await getActor();
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 });
  const { body, error } = await readProtectedJson(request, {
    scope: "admin-source-toggle",
    limit: 20,
    maxBytes: 4_096,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  if (error) return error;
  const { id } = await params;
  const source = getSourceCatalog().find((entry) => entry.id === id);
  if (!source) return NextResponse.json({ error: "Unknown source" }, { status: 404 });
  if (!source.adapter) {
    return NextResponse.json({ error: "This source has no scraper yet, so it cannot be switched on" }, { status: 409 });
  }
  if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "enabled must be true or false" }, { status: 400 });

  const setting = await prisma.$transaction(async (tx) => {
    const saved = await tx.scraperSourceSetting.upsert({
      where: { sourceId: id },
      create: { sourceId: id, enabled: body.enabled, updatedById: actor.id },
      update: { enabled: body.enabled, updatedById: actor.id },
    });
    await tx.auditEvent.create({
      data: {
        actorUserId: actor.id,
        action: body.enabled ? "SOURCE_ENABLED" : "SOURCE_DISABLED",
        entityType: "ScraperSource",
        entityId: id,
        metadata: { name: source.name },
      },
    });
    return saved;
  });
  return NextResponse.json({ setting });
}
