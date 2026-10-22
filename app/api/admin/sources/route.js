import { NextResponse } from "next/server";
import { getActor, isAdmin } from "@/lib/employer-access";
import prisma from "@/lib/prisma";
import { readProtectedJson } from "@/lib/request-security";
import sourceSettings from "@/scraper/lib/source-settings";

const { getSourceCatalog, parseSourceInput } = sourceSettings;

// Add a new job website. New sources start switched off and held for review
// (docs/JOB-SOURCE-POLICY.md) until an administrator tests and approves them.
export async function POST(request) {
  const actor = await getActor();
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 });
  const { body, error } = await readProtectedJson(request, {
    scope: "admin-source-create",
    limit: 20,
    maxBytes: 16_384,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  if (error) return error;

  const rows = await prisma.scraperSourceSetting.findMany({ select: { sourceId: true } });
  const existingIds = [...getSourceCatalog().map((source) => source.id), ...rows.map((row) => row.sourceId)];
  const { row, error: invalid } = parseSourceInput({ ...body, enabled: false, autoPublish: false }, { isNew: true, existingIds });
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const setting = await prisma.$transaction(async (tx) => {
    const created = await tx.scraperSourceSetting.create({
      data: { ...row, createdById: actor.id, updatedById: actor.id },
    });
    await tx.auditEvent.create({
      data: {
        actorUserId: actor.id,
        action: "SOURCE_CREATED",
        entityType: "ScraperSource",
        entityId: row.sourceId,
        metadata: { name: row.name, url: row.url },
      },
    });
    return created;
  });
  return NextResponse.json({ source: { id: setting.sourceId } }, { status: 201 });
}
