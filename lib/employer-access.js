import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { employerPortalEnabled } from "@/lib/features";

export { employerPortalEnabled };

export async function getActor() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      employer: {
        select: {
          id: true,
          companyName: true,
          industry: true,
          website: true,
          verificationStatus: true,
          verificationNote: true,
          autoPublish: true,
        },
      },
    },
  });
}

export function canManageEmployer(actor, employerId) {
  return Boolean(
    actor &&
    (actor.role === "ADMIN" ||
      (actor.role === "EMPLOYER" && actor.employer?.id === employerId))
  );
}

export function canPublishEmployerJobs(actor) {
  return Boolean(
    actor?.role === "ADMIN" ||
    (actor?.role === "EMPLOYER" &&
      actor.employer?.verificationStatus === "VERIFIED")
  );
}

export function isAdmin(actor) {
  return actor?.role === "ADMIN";
}

// A suspended employer keeps its record but may not resubmit its profile (that
// would reset an administrator's decision) or send new vacancies.
export function isSuspendedEmployer(actor) {
  return actor?.employer?.verificationStatus === "SUSPENDED";
}

// Verified employers an administrator marked "trusted" (D-035) publish new
// vacancies without review.
export function publishesWithoutReview(employer) {
  return Boolean(employer?.autoPublish && employer.verificationStatus === "VERIFIED");
}

export function safeAuditMetadata(value = {}) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => !/password|secret|token|authorization|cookie/i.test(key)
    )
  );
}
