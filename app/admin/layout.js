import DashboardFrame from "@/components/dashboard/DashboardFrame";
import { requireAdminPage } from "@/lib/admin-guard";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  await requireAdminPage();
  const [pendingJobs, pendingEmployers] = await Promise.all([
    prisma.job.count({ where: { moderationStatus: "PENDING_REVIEW" } }),
    prisma.employer.count({ where: { verificationStatus: "PENDING" } }),
  ]);

  return (
    <DashboardFrame counts={{ pendingJobs, pendingEmployers }}>
      {children}
    </DashboardFrame>
  );
}
