import Link from "next/link";
import EmployerForm from "@/components/admin/EmployerForm";
import { PageHeader, Panel } from "@/components/dashboard/DashboardUi";
import styles from "@/components/dashboard/dashboard.module.css";
import { requireAdminPage } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function AdminNewEmployerPage() {
  await requireAdminPage("/admin/employers/new");
  return (
    <>
      <PageHeader
        title="Add employer"
        description="Create a company profile for someone who already has a Daraja account."
        actions={<Link className={styles.button} href="/admin/employers">Back to employers</Link>}
      />
      <Panel>
        <EmployerForm />
      </Panel>
    </>
  );
}
