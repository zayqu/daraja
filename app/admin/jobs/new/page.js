import Link from "next/link";
import JobForm from "@/components/admin/JobForm";
import { PageHeader, Panel } from "@/components/admin/AdminUi";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin-guard";
import { getCategoryNames } from "@/lib/public-jobs";

export const dynamic = "force-dynamic";

export default async function AdminNewJobPage() {
  await requireAdminPage("/admin/jobs/new");
  return (
    <>
      <PageHeader
        title="Post a job"
        description="Publish a vacancy on Daraja directly. It is marked as posted by Daraja."
        actions={<Link className={styles.button} href="/admin/jobs">Back to jobs</Link>}
      />
      <Panel>
        <JobForm categories={await getCategoryNames()} />
      </Panel>
    </>
  );
}
