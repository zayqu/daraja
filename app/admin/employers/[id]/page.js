import Link from "next/link";
import { notFound } from "next/navigation";
import AdminRowActions from "@/components/admin/AdminRowActions";
import EmployerForm from "@/components/admin/EmployerForm";
import { JobStatusBadge, PageHeader, Panel, formatDate } from "@/components/admin/AdminUi";
import styles from "@/components/admin/admin.module.css";
import { employerActions } from "@/lib/admin-actions";
import { requireAdminPage } from "@/lib/admin-guard";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminEmployerPage({ params }) {
  const { id } = await params;
  await requireAdminPage(`/admin/employers/${id}`);
  const employer = await prisma.employer.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, title: true, deadline: true, moderationStatus: true, active: true },
      },
    },
  });
  if (!employer) notFound();

  return (
    <>
      <PageHeader
        title={employer.companyName}
        description={`Managed by ${employer.user?.name || employer.user?.email} (${employer.user?.email})`}
        actions={<Link className={styles.button} href="/admin/employers">Back to employers</Link>}
      />
      <Panel title={`Verification: ${employer.verificationStatus.toLowerCase()}`} actions={<AdminRowActions actions={employerActions(employer)} />}>
        <p className={styles.help} style={{ marginTop: 0 }}>
          {employer.verificationNote || "Verified employers' vacancies can be published."}
          {employer.verifiedAt ? ` Verified ${formatDate(employer.verifiedAt)}.` : ""}
        </p>
      </Panel>
      <Panel title="Company details">
        <EmployerForm
          employer={{
            id: employer.id,
            companyName: employer.companyName,
            industry: employer.industry || "",
            website: employer.website || "",
            logo: employer.logo || "",
          }}
        />
      </Panel>
      <Panel title={`Vacancies (${employer.jobs.length})`} flush>
        {employer.jobs.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <tbody>
                {employer.jobs.map((job) => (
                  <tr key={job.id}>
                    <td><Link className={styles.primaryCell} href={`/admin/jobs/${job.id}`}>{job.title}</Link></td>
                    <td>{formatDate(job.deadline)}</td>
                    <td><JobStatusBadge status={job.moderationStatus} active={job.active} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>This employer has not posted any vacancies.</p>
        )}
      </Panel>
    </>
  );
}
