import DashboardFrame from "@/components/dashboard/DashboardFrame";
import { requireAdminPage } from "@/lib/admin-guard";
import { getAdminQueueCounts } from "@/lib/admin-queue";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  await requireAdminPage();
  const counts = await getAdminQueueCounts();

  return (
    <DashboardFrame counts={counts}>
      {children}
    </DashboardFrame>
  );
}
