import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getActor, isAdmin } from "@/lib/employer-access";
import { JOB_CATEGORIES } from "@/lib/job-categories";
import prisma from "@/lib/prisma";
import { PUBLIC_JOBS_CACHE_TAG } from "@/lib/public-jobs";
import { readProtectedJson } from "@/lib/request-security";

// Move every job in one category to another. Moved jobs are marked as
// admin-edited so the next scrape does not move them back.
export async function POST(request) {
  const actor = await getActor();
  if (!isAdmin(actor)) return NextResponse.json({ error: "Admin access required" }, { status: actor ? 403 : 401 });
  const { body, error } = await readProtectedJson(request, {
    scope: "admin-category-move",
    limit: 20,
    maxBytes: 4_096,
    requireOrigin: true,
    rateIdentity: actor.id,
  });
  if (error) return error;
  const from = typeof body.from === "string" ? body.from.trim().slice(0, 100) : "";
  const to = typeof body.to === "string" ? body.to : "";
  if (!from) return NextResponse.json({ error: "Choose the category to move jobs from" }, { status: 400 });
  if (!JOB_CATEGORIES.includes(to)) return NextResponse.json({ error: "Choose a category to move jobs to" }, { status: 400 });
  if (from === to) return NextResponse.json({ error: "Choose two different categories" }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const moved = await tx.job.updateMany({ where: { category: from }, data: { category: to, adminEditedAt: new Date() } });
    await tx.auditEvent.create({
      data: {
        actorUserId: actor.id,
        action: "CATEGORY_JOBS_MOVED",
        entityType: "Category",
        entityId: to,
        metadata: { from, to, count: moved.count },
      },
    });
    return moved;
  });
  revalidateTag(PUBLIC_JOBS_CACHE_TAG, "seconds");
  return NextResponse.json({ moved: result.count });
}
