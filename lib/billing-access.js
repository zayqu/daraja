import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { limitsForPlan } from "@/lib/entitlements";
export async function getBillingUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, role: true } });
}
export async function activePlanForUser(userId, now = new Date()) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE", endDate: { gt: now } },
    orderBy: { endDate: "desc" }, select: { plan: true, endDate: true },
  });
  const plan = subscription?.plan || "FREE";
  return { plan, limits: limitsForPlan(plan), expiresAt: subscription?.endDate || null };
}
