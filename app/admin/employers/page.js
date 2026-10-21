import Link from "next/link";
import AdminRowActions from "@/components/admin/AdminRowActions";
import { Badge, PageHeader, Pagination, Panel, formatDate, pageNumber } from "@/components/admin/AdminUi";
import styles from "@/components/admin/admin.module.css";
import { employerActions } from "@/lib/admin-actions";
import { requireAdminPage } from "@/lib/admin-guard";
import { employerPortalEnabled } from "@/lib/features";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const STATUS = {
  PENDING: ["amber", "Waiting for verification"],
  VERIFIED: ["green", "Verified"],
  REJECTED: ["red", "Rejected"],
  SUSPENDED: ["gray", "Suspended"],
};

export default async function AdminEmployersPage({ searchParams }) {
  await requireAdminPage("/admin/employers");
  const params = await searchParams;
  const q = String(params?.q || "").trim().slice(0, 120);
  const status = STATUS[params?.status] ? params.status : "";
  const page = pageNumber(params?.page);
  const where = {
    ...(status ? { verificationStatus: status } : {}),
    ...(q
      ? {
          OR: [
            { companyName: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [total, employers] = await Promise.all([
    prisma.employer.count({ where }),
    prisma.employer.findMany({
      where,
      orderBy: [{ verificationStatus: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        companyName: true,
        industry: true,
        website: true,
        verificationStatus: true,
        verificationNote: true,
        createdAt: true,
        user: { select: { email: true } },
        _count: { select: { jobs: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Employers"
        description={
          employerPortalEnabled()
            ? "Companies that post vacancies on Daraja. Verify them before their jobs go live."
            : "The employer portal is switched off on the live site, so employers cannot sign up or post yet. You can still prepare companies here."
        }
        actions={<Link className={styles.buttonPrimary} href="/admin/employers/new">Add employer</Link>}
      />
      <Panel
        flush
        title={`${total} employer${total === 1 ? "" : "s"}`}
        actions={
          <form className={styles.filters} method="get">
            <input className={styles.input} type="search" name="q" defaultValue={q} placeholder="Search company or email" aria-label="Search employers" />
            <select className={styles.select} name="status" defaultValue={status} aria-label="Status">
              <option value="">All statuses</option>
              {Object.entries(STATUS).map(([value, [, label]]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button className={styles.button} type="submit">Filter</button>
          </form>
        }
      >
        {employers.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Industry</th>
                  <th>Jobs</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {employers.map((employer) => {
                  const [tone, label] = STATUS[employer.verificationStatus] || ["gray", employer.verificationStatus];
                  return (
                    <tr key={employer.id}>
                      <td>
                        <Link className={styles.primaryCell} href={`/admin/employers/${employer.id}`}>{employer.companyName}</Link>
                        <span className={styles.subtle}>{employer.user?.email}</span>
                      </td>
                      <td>{employer.industry || "—"}</td>
                      <td>{employer._count.jobs}</td>
                      <td>
                        <Badge tone={tone}>{label}</Badge>
                        {employer.verificationNote ? <span className={styles.subtle}>{employer.verificationNote}</span> : null}
                      </td>
                      <td>{formatDate(employer.createdAt)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link className={styles.button} href={`/admin/employers/${employer.id}`}>Edit</Link>
                          {employer.website ? (
                            <a className={styles.buttonGhost} href={employer.website} target="_blank" rel="noreferrer nofollow">Website</a>
                          ) : null}
                        </div>
                        <AdminRowActions actions={employerActions(employer)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>No employers yet.</p>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/employers" params={{ q, status }} />
      </Panel>
    </>
  );
}
