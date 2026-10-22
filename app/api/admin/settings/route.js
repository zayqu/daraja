import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getActor, isAdmin } from "@/lib/employer-access";
import { SITE_SETTINGS, invalidateSiteSettings } from "@/lib/features";
import prisma from "@/lib/prisma";
import { PUBLIC_JOBS_CACHE_TAG } from "@/lib/public-jobs";
import { readProtectedJson } from "@/lib/request-security";

const SENDER = /^(?:[^<>@\n]{1,80}<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/;

// Validates one setting value against its definition in lib/features.js.
function parseValue(definition, value) {
  if (definition.type === "boolean") {
    return typeof value === "boolean" ? { value } : { error: "Choose on or off" };
  }
  if (definition.type === "list") {
    const list = (Array.isArray(value) ? value : String(value || "").split("\n"))
      .map((item) => String(item).trim())
      .filter((item) => item.length >= 3)
      .slice(0, 200)
      .map((item) => item.slice(0, 120));
    return { value: [...new Set(list)] };
  }
  const text = typeof value === "string" ? value.trim().slice(0, 200) : "";
  if (text && !SENDER.test(text)) return { error: "Use an email address, e.g. Daraja <no-reply@daraja.co.tz>" };
  return { value: text };
}

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
    const { value, error: invalid } = parseValue(definition, body.value);
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
