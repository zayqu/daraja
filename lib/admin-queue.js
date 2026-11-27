import { cache } from "react";
import prisma from "@/lib/prisma";

// What is waiting for an administrator: vacancies in review and employers to
// verify. The admin sidebar, the admin overview and the admin's phone dock
// show these counts; `cache` runs the two queries once per request.
export const getAdminQueueCounts = cache(async () => {
  const [pendingJobs, pendingEmployers] = await Promise.all([
    prisma.job.count({ where: { moderationStatus: "PENDING_REVIEW" } }),
    prisma.employer.count({ where: { verificationStatus: "PENDING" } }),
  ]);
  return { pendingJobs, pendingEmployers };
});
