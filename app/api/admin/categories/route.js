import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getActor, isAdmin } from "@/lib/employer-access";
import { categorySlug } from "@/lib/job-categories";
import prisma from "@/lib/prisma";
import { PUBLIC_JOBS_CACHE_TAG } from "@/lib/public-jobs";
import { readProtectedJson } from "@/lib/request-security";

const clean = (value, max = 100) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "");

function keywordList(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(/[,\n]+/);
  return [...new Set(list.map((item) => clean(String(item), 60).toLowerCase()).filter((item) => item.length >= 2))].slice(0, 60);
}

async function adminRequest(request, scope) {
  const actor = await getActor();
  if (!isAdmin(actor)) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 }) };
  }
  const { body, error } = await readProtectedJson(request, {
    scope,
    limit: 20,
    maxBytes: 8_192,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  return error ? { error } : { actor, body };
}

function audit(tx, actor, action, entityId, metadata) {
  return tx.auditEvent.create({
    data: { actorUserId: actor.id, action, entityType: "Category", entityId, metadata },
  });
}

function done(payload) {
  revalidateTag(PUBLIC_JOBS_CACHE_TAG, "seconds");
  return NextResponse.json(payload);
}

// { action: "create", name, keywords } adds a category.
// { action: "move", from, to } moves every job from one category to another.
export async function POST(request) {
  const { actor, body, error } = await adminRequest(request, "admin-category-write");
  if (error) return error;

  if (body.action === "create") {
    const name = clean(body.name);
    const slug = categorySlug(name);
    if (!name || !slug) return NextResponse.json({ error: "Enter a category name" }, { status: 400 });
    const clash = await prisma.category.findFirst({ where: { OR: [{ name }, { slug }] }, select: { id: true } });
    if (clash) return NextResponse.json({ error: "A category with that name already exists" }, { status: 409 });
    const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: { name, slug, keywords: keywordList(body.keywords), sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
      await audit(tx, actor, "CATEGORY_CREATED", created.id, { name });
      return created;
    });
    return done({ category });
  }

  const from = clean(body.from);
  const to = clean(body.to);
  const target = to ? await prisma.category.findUnique({ where: { name: to }, select: { id: true } }) : null;
  if (!from) return NextResponse.json({ error: "Choose the category to move jobs from" }, { status: 400 });
  if (!target) return NextResponse.json({ error: "Choose a category to move jobs to" }, { status: 400 });
  if (from === to) return NextResponse.json({ error: "Choose two different categories" }, { status: 400 });
  const moved = await prisma.$transaction(async (tx) => {
    const result = await tx.job.updateMany({ where: { category: from }, data: { category: to, adminEditedAt: new Date() } });
    await audit(tx, actor, "CATEGORY_JOBS_MOVED", target.id, { from, to, count: result.count });
    return result.count;
  });
  return done({ moved });
}

// Edit one category: { id, name?, keywords?, sortOrder?, active? }.
// A rename also updates every job and every job-alert preference using it;
// the slug stays, so sector pages and links keep working.
export async function PATCH(request) {
  const { actor, body, error } = await adminRequest(request, "admin-category-write");
  if (error) return error;
  const category = await prisma.category.findUnique({ where: { id: clean(body.id, 40) } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  // { move: "up" | "down" } swaps the category with its neighbour in the list.
  if (body.move === "up" || body.move === "down") {
    const ordered = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
    const index = ordered.findIndex((row) => row.id === category.id);
    const swapWith = body.move === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= ordered.length) return NextResponse.json({ category });
    [ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]];
    await prisma.$transaction([
      ...ordered.map((row, position) => prisma.category.update({ where: { id: row.id }, data: { sortOrder: position } })),
      prisma.auditEvent.create({
        data: { actorUserId: actor.id, action: "CATEGORY_REORDERED", entityType: "Category", entityId: category.id, metadata: { move: body.move } },
      }),
    ]);
    return done({ category });
  }

  const data = {};
  const name = body.name === undefined ? category.name : clean(body.name);
  if (!name) return NextResponse.json({ error: "Enter a category name" }, { status: 400 });
  if (name !== category.name) {
    const clash = await prisma.category.findUnique({ where: { name }, select: { id: true } });
    if (clash) return NextResponse.json({ error: "A category with that name already exists" }, { status: 409 });
    data.name = name;
  }
  if (body.keywords !== undefined) data.keywords = keywordList(body.keywords);
  if (typeof body.active === "boolean") {
    if (!body.active && category.isFallback) {
      return NextResponse.json({ error: "The fallback category is used for unsorted jobs and cannot be hidden" }, { status: 409 });
    }
    data.active = body.active;
  }
  if (!Object.keys(data).length) return NextResponse.json({ category });

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.category.update({ where: { id: category.id }, data });
    if (data.name) {
      await tx.job.updateMany({ where: { category: category.name }, data: { category: data.name } });
      await tx.$executeRaw`UPDATE "JobAlertSubscriber" SET "categories" = array_replace("categories", ${category.name}, ${data.name}) WHERE ${category.name} = ANY("categories")`;
    }
    await audit(tx, actor, "CATEGORY_EDITED", category.id, { from: category.name, ...data });
    return saved;
  });
  return done({ category: updated });
}

// Delete a category. Its jobs move to `moveTo` (default: the fallback).
export async function DELETE(request) {
  const { actor, body, error } = await adminRequest(request, "admin-category-write");
  if (error) return error;
  const category = await prisma.category.findUnique({ where: { id: clean(body.id, 40) } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  if (category.isFallback) {
    return NextResponse.json({ error: "The fallback category cannot be deleted" }, { status: 409 });
  }
  const target = body.moveTo
    ? await prisma.category.findUnique({ where: { name: clean(body.moveTo) } })
    : await prisma.category.findFirst({ where: { isFallback: true } });
  if (!target || target.id === category.id) {
    return NextResponse.json({ error: "Choose where this category's jobs should go" }, { status: 400 });
  }
  const moved = await prisma.$transaction(async (tx) => {
    const result = await tx.job.updateMany({ where: { category: category.name }, data: { category: target.name } });
    await tx.$executeRaw`UPDATE "JobAlertSubscriber" SET "categories" = array_remove("categories", ${category.name}) WHERE ${category.name} = ANY("categories")`;
    await tx.category.delete({ where: { id: category.id } });
    await audit(tx, actor, "CATEGORY_DELETED", category.id, { name: category.name, movedTo: target.name, count: result.count });
    return result.count;
  });
  return done({ moved });
}
