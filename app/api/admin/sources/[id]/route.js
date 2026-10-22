import { NextResponse } from "next/server";
import { getActor, isAdmin } from "@/lib/employer-access";
import prisma from "@/lib/prisma";
import { readProtectedJson } from "@/lib/request-security";
import sourceSettings from "@/scraper/lib/source-settings";
import verifiedAgency from "@/scraper/sources/verified-agency";

const { applySourceSettings, getSourceCatalog, parseSourceInput } = sourceSettings;
const { collectVerifiedAgencyJobs } = verifiedAgency;
const TEST_TIMEOUT_MS = 45_000;

async function adminRequest(request, scope) {
  const actor = await getActor();
  if (!isAdmin(actor)) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 }) };
  }
  const { body, error } = await readProtectedJson(request, {
    scope,
    limit: 20,
    maxBytes: 16_384,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  return error ? { error } : { actor, body };
}

// The merged source (catalogue file + admin row), or null.
async function findSource(id) {
  const rows = await prisma.scraperSourceSetting.findMany();
  const source = applySourceSettings(getSourceCatalog(), rows).find((entry) => entry.id === id) || null;
  return { source, row: rows.find((entry) => entry.sourceId === id) || null };
}

function audit(tx, actor, action, id, metadata = {}) {
  return tx.auditEvent.create({
    data: { actorUserId: actor.id, action, entityType: "ScraperSource", entityId: id, metadata },
  });
}

// { enabled } switches a source on/off. { autoPublish } changes its review
// rule. { source: {...} } edits a configurable source's details.
export async function PATCH(request, { params }) {
  const { actor, body, error } = await adminRequest(request, "admin-source-edit");
  if (error) return error;
  const { id } = await params;
  const { source } = await findSource(id);
  if (!source) return NextResponse.json({ error: "Unknown source" }, { status: 404 });

  let data = {};
  let action = "SOURCE_EDITED";
  if (body.source && typeof body.source === "object") {
    if (source.adapter !== "verified-agency") {
      return NextResponse.json({ error: "This built-in source has a fixed scraper; only on/off and review rules can change" }, { status: 409 });
    }
    const { row, error: invalid } = parseSourceInput(body.source);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    const { enabled, autoPublish, ...details } = row;
    data = {
      ...details,
      ...(typeof body.source.enabled === "boolean" ? { enabled } : {}),
      ...(typeof body.source.autoPublish === "boolean" ? { autoPublish } : {}),
    };
  } else {
    if (typeof body.enabled === "boolean") {
      if (!source.adapter) {
        return NextResponse.json({ error: "This source has no scraper yet, so it cannot be switched on" }, { status: 409 });
      }
      data.enabled = body.enabled;
      action = body.enabled ? "SOURCE_ENABLED" : "SOURCE_DISABLED";
    }
    if (typeof body.autoPublish === "boolean") {
      data.autoPublish = body.autoPublish;
      if (action === "SOURCE_EDITED") action = body.autoPublish ? "SOURCE_AUTO_PUBLISH_ON" : "SOURCE_AUTO_PUBLISH_OFF";
    }
    if (!Object.keys(data).length) return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }

  const setting = await prisma.$transaction(async (tx) => {
    const saved = await tx.scraperSourceSetting.upsert({
      where: { sourceId: id },
      create: { sourceId: id, enabled: data.enabled ?? Boolean(source.enabled), ...data, updatedById: actor.id },
      update: { ...data, updatedById: actor.id },
    });
    await audit(tx, actor, action, id, { name: source.name });
    return saved;
  });
  return NextResponse.json({ setting });
}

// Removes a source from the catalogue (kept as a hidden row so the next
// scrape skips it and the decision is auditable). Its jobs stay until they close.
export async function DELETE(request, { params }) {
  const { actor, error } = await adminRequest(request, "admin-source-delete");
  if (error) return error;
  const { id } = await params;
  const { source } = await findSource(id);
  if (!source) return NextResponse.json({ error: "Unknown source" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.scraperSourceSetting.upsert({
      where: { sourceId: id },
      create: { sourceId: id, enabled: false, deletedAt: new Date(), updatedById: actor.id },
      update: { enabled: false, deletedAt: new Date(), updatedById: actor.id },
    });
    await audit(tx, actor, "SOURCE_DELETED", id, { name: source.name });
  });
  return NextResponse.json({ ok: true });
}

// Test: collect this source once without saving anything and report what
// would be imported. Configurable sources only; no browser is started.
export async function POST(request, { params }) {
  const { actor, error } = await adminRequest(request, "admin-source-test");
  if (error) return error;
  const { id } = await params;
  const { source } = await findSource(id);
  if (!source) return NextResponse.json({ error: "Unknown source" }, { status: 404 });
  if (source.adapter !== "verified-agency") {
    return NextResponse.json({ error: "Built-in scrapers are checked by the hourly run; see its report instead" }, { status: 409 });
  }
  let timer;
  try {
    const jobs = await Promise.race([
      collectVerifiedAgencyJobs(source, { render: null }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("The test took too long and was stopped")), TEST_TIMEOUT_MS);
      }),
    ]);
    await prisma.auditEvent.create({
      data: { actorUserId: actor.id, action: "SOURCE_TESTED", entityType: "ScraperSource", entityId: id, metadata: { found: jobs.length } },
    });
    return NextResponse.json({
      found: jobs.length,
      health: jobs.health || {},
      sample: jobs.slice(0, 5).map(({ title, company, location, deadline, applicationUrl }) => ({
        title,
        company,
        location,
        deadline,
        applicationUrl,
      })),
    });
  } catch (testError) {
    return NextResponse.json({ error: String(testError.message || testError).slice(0, 300) }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
