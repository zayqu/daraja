import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { limitsForPlan, planAvailableToRole } from "@/lib/entitlements";

export async function getBillingUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true },
  });
}

export async function activePlanForUser(user, now = new Date(), db = prisma) {
  const subscription = await db.subscription.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      startDate: { lte: now },
      endDate: { gt: now },
    },
    orderBy: { endDate: "desc" },
    select: { plan: true, endDate: true },
  });
  const plan = subscription && planAvailableToRole(subscription.plan, user.role)
    ? subscription.plan
    : "FREE";
  return {
    plan,
    limits: limitsForPlan(plan, user.role),
    expiresAt: plan === "FREE" ? null : subscription.endDate,
  };
}

export async function invoicesForUser(userId, db = prisma) {
  return db.invoice.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      plan: true,
      status: true,
      amountMinor: true,
      currency: true,
      dueAt: true,
      paidAt: true,
      createdAt: true,
    },
    take: 100,
  });
}
