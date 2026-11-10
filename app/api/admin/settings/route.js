import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getActor, isAdmin } from "@/lib/employer-access";
import { SITE_SETTINGS, invalidateSiteSettings } from "@/lib/features";
import prisma from "@/lib/prisma";
import { PUBLIC_JOBS_CACHE_TAG } from "@/lib/public-jobs";
import { readProtectedJson } from "@/lib/request-security";
import { parseSettingValue } from "@/lib/admin-settings-validation.mjs";

// { key, value } saves one setting; { key, reset: true } goes back to the default.
export async function PATCH(request) {
  const actor = await getActor();
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 });
  const { body, error } = await readProtectedJson(request, {
    scope: "admin-settings",
    limit: 30,
    maxBytes: 16_384,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  if (error) return error;

  const key = typeof body.key === "string" ? body.key : "";
  const definition = SITE_SETTINGS[key];
  if (!definition) return NextResponse.json({ error: "Unknown setting" }, { status: 400 });

  if (body.reset === true) {
    await prisma.$transaction([
      prisma.siteSetting.deleteMany({ where: { key } }),
      prisma.auditEvent.create({
        data: { actorUserId: actor.id, action: "SETTING_RESET", entityType: "SiteSetting", entityId: key, metadata: {} },
      }),
    ]);
  } else {
    const { value, error: invalid } = parseSettingValue(key, definition, body.value);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    await prisma.$transaction([
      prisma.siteSetting.upsert({
        where: { key },
        create: { key, value, updatedById: actor.id },
        update: { value, updatedById: actor.id },
      }),
      prisma.auditEvent.create({
        data: {
          actorUserId: actor.id,
          action: "SETTING_CHANGED",
          entityType: "SiteSetting",
          entityId: key,
          metadata: { value: definition.type === "list" ? `${value.length} phrases` : value },
        },
      }),
    ]);
  }
  invalidateSiteSettings();
  revalidateTag(PUBLIC_JOBS_CACHE_TAG, "seconds");
  return NextResponse.json({ ok: true });
}
