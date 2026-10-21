import Link from "next/link";
import { notFound } from "next/navigation";
import AdminRowActions from "@/components/admin/AdminRowActions";
import JobForm from "@/components/admin/JobForm";
import { JobStatusBadge, PageHeader, Panel, formatDate } from "@/components/admin/AdminUi";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin-guard";
import { applicationFields, deadlineInputValue } from "@/lib/admin-job-input";
import { JOB_CATEGORIES } from "@/lib/job-categories";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminEditJobPage({ params, searchParams }) {
  const { id } = await params;
  await requireAdminPage(`/admin/jobs/${id}`);
  const created = (await searchParams)?.created === "1";
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      employer: { select: { companyName: true, verificationStatus: true } },
      _count: { select: { applications: true, savedBy: true } },
    },
  });
  if (!job) notFound();

  const moderate = `/api/admin/jobs/${job.id}/moderate`;
  const statusActions = [
    ...(job.moderationStatus !== "PUBLISHED" || !job.active
      ? [{ label: "Publish", url: moderate, body: { status: "PUBLISHED" }, tone: "primary" }]
      : []),
    ...(job.moderationStatus !== "ARCHIVED"
      ? [{ label: "Archive", url: moderate, body: { status: "ARCHIVED" }, askReason: "Why is this job being removed from the site?" }]
      : []),
    {
      label: "Delete permanently",
      method: "DELETE",
      url: `/api/admin/jobs/${job.id}`,
      confirm: `Permanently delete "${job.title}"? This cannot be undone.`,
      tone: "danger",
      redirectTo: "/admin/jobs",
    },
  ];

  return (
    <>
      <PageHeader
        title={job.title}
        description={`${job.company} · ${job.location}`}
        actions={
          <>
            <Link className={styles.button} href="/admin/jobs">Back to jobs</Link>
            <a className={styles.button} href={`/jobs/${job.slug}`} target="_blank" rel="noreferrer">View on site</a>
          </>
        }
      />
      {created ? <p className={styles.notice} role="status">Job saved.</p> : null}

      <Panel title="Status" actions={<AdminRowActions actions={statusActions} />}>
        <div className={styles.stats} style={{ marginBottom: 0 }}>
          <div className={styles.stat}><span>Status</span><strong style={{ fontSize: "1rem" }}><JobStatusBadge status={job.moderationStatus} active={job.active} /></strong>{job.moderationNote ? <em>{job.moderationNote}</em> : null}</div>
          <div className={styles.stat}><span>Source</span><strong style={{ fontSize: "1rem" }}>{job.source}</strong>{job.sourceUrl ? <em><a href={job.sourceUrl} target="_blank" rel="noreferrer nofollow">Original page</a></em> : null}</div>
          <div className={styles.stat}><span>Added</span><strong style={{ fontSize: "1rem" }}>{formatDate(job.createdAt)}</strong>{job.adminEditedAt ? <em>Edited by admin {formatDate(job.adminEditedAt)}</em> : null}</div>
          <div className={styles.stat}><span>Interest</span><strong style={{ fontSize: "1rem" }}>{job._count.savedBy} saved · {job._count.applications} applied</strong></div>
        </div>
      </Panel>

      <Panel title="Edit job">
        <JobForm
          categories={JOB_CATEGORIES}
          job={{
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            category: job.category,
            type: job.type || "",
            salary: job.salary || "",
            deadline: deadlineInputValue(job.deadline),
            description: job.description,
            ...applicationFields(job.applicationUrl),
          }}
        />
      </Panel>
    </>
  );
}
