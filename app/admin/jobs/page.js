import Link from "next/link";
import AdminRowActions, { BulkActions } from "@/components/admin/AdminRowActions";
import { JobStatusBadge, PageHeader, Pagination, Panel, formatDate, pageNumber } from "@/components/admin/AdminUi";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin-guard";
import { getCategoryNames } from "@/lib/public-jobs";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const STATUS_FILTERS = [
  ["", "All jobs"],
  ["live", "Live"],
  ["PENDING_REVIEW", "Needs review"],
  ["closed", "Closed (past deadline)"],
  ["REJECTED", "Rejected"],
  ["ARCHIVED", "Archived"],
];

function statusWhere(status) {
  if (status === "live") return { moderationStatus: "PUBLISHED", active: true };
  if (status === "closed") return { moderationStatus: "PUBLISHED", active: false };
  if (["PENDING_REVIEW", "REJECTED", "ARCHIVED", "DRAFT"].includes(status)) return { moderationStatus: status };
  return {};
}

function jobActions(job) {
  const moderate = `/api/admin/jobs/${job.id}/moderate`;
  const actions = [];
  if (job.moderationStatus !== "PUBLISHED" || !job.active) {
    actions.push({ label: "Publish", url: moderate, body: { status: "PUBLISHED" }, tone: "primary" });
  }
  if (job.moderationStatus === "PENDING_REVIEW") {
    actions.push({ label: "Reject", url: moderate, body: { status: "REJECTED" }, askReason: "Why is this job rejected?" });
  }
  if (job.moderationStatus !== "ARCHIVED") {
    actions.push({ label: "Archive", url: moderate, body: { status: "ARCHIVED" }, askReason: "Why is this job being removed from the site?" });
  }
  actions.push({
    label: "Delete",
    method: "DELETE",
    url: `/api/admin/jobs/${job.id}`,
    confirm:
      job.source === "daraja"
        ? `Permanently delete "${job.title}"? This cannot be undone.`
        : `Permanently delete "${job.title}"? It came from ${job.source}, so the next scrape may add it again. Archive keeps it off the site for good.`,
    tone: "danger",
  });
  return actions;
}

export default async function AdminJobsPage({ searchParams }) {
  await requireAdminPage("/admin/jobs");
  const params = await searchParams;
  const q = String(params?.q || "").trim().slice(0, 120);
  const status = String(params?.status || "");
  const categories = await getCategoryNames();
  const category = String(params?.category || "").slice(0, 100);
  const source = String(params?.source || "").slice(0, 80);
  const page = pageNumber(params?.page);

  const where = {
    ...statusWhere(status),
    ...(category ? { category } : {}),
    ...(source ? { source } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, jobs, sources] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        title: true,
        company: true,
        location: true,
        category: true,
        source: true,
        deadline: true,
        active: true,
        moderationStatus: true,
        adminEditedAt: true,
        createdAt: true,
      },
    }),
    prisma.job.groupBy({ by: ["source"], _count: { _all: true }, orderBy: { source: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Every vacancy on Daraja: scraped, employer-submitted and posted by you."
        actions={<Link className={styles.buttonPrimary} href="/admin/jobs/new">Post a job</Link>}
      />

      <Panel
        flush
        title={`${total} job${total === 1 ? "" : "s"}`}
        actions={
          <form className={styles.filters} method="get">
            <input className={styles.input} type="search" name="q" defaultValue={q} placeholder="Search title or company" aria-label="Search jobs" />
            <select className={styles.select} name="status" defaultValue={status} aria-label="Status">
              {STATUS_FILTERS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select className={styles.select} name="category" defaultValue={category} aria-label="Category">
              <option value="">All categories</option>
              {categories.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select className={styles.select} name="source" defaultValue={source} aria-label="Source">
              <option value="">All sources</option>
              {sources.map((entry) => (
                <option key={entry.source} value={entry.source}>
                  {entry.source} ({entry._count._all})
                </option>
              ))}
            </select>
            <button className={styles.button} type="submit">Filter</button>
          </form>
        }
      >
        {jobs.length ? (
          <>
            <form id="bulk-jobs" hidden />
            <BulkActions
              formId="bulk-jobs"
              url="/api/admin/jobs"
              actions={[
                { label: "Publish", status: "PUBLISHED", tone: "primary" },
                { label: "Archive", status: "ARCHIVED", askReason: "Why are these jobs being removed from the site?" },
                { label: "Reject", status: "REJECTED", askReason: "Why are these jobs rejected?" },
              ]}
            />
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.stackOnMobile}`}>
                <thead>
                  <tr>
                    <th aria-label="Select" />
                    <th>Job</th>
                    <th>Category</th>
                    <th>Source</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className={styles.selectCell}>
                        <input type="checkbox" name="ids" value={job.id} form="bulk-jobs" aria-label={`Select ${job.title}`} />
                      </td>
                      <td data-label="Job">
                        <Link className={styles.primaryCell} href={`/admin/jobs/${job.id}`}>{job.title}</Link>
                        <span className={styles.subtle}>
                          {job.company} · {job.location}
                          {job.adminEditedAt ? " · edited by admin" : ""}
                        </span>
                      </td>
                      <td data-label="Category">{job.category}</td>
                      <td data-label="Source">{job.source}</td>
                      <td data-label="Deadline">{formatDate(job.deadline)}</td>
                      <td data-label="Status"><JobStatusBadge status={job.moderationStatus} active={job.active} /></td>
                      <td>
                        <AdminRowActions
                          actions={jobActions(job)}
                          links={[
                            { label: "Edit", href: `/admin/jobs/${job.id}` },
                            { label: "View on site", href: `/jobs/${job.slug}`, external: true },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className={styles.empty}>No jobs match these filters.</p>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/jobs" params={{ q, status, category, source }} />
      </Panel>
    </>
  );
}
