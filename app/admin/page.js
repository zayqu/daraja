import Link from "next/link";
import AdminJobReviewQueue from "@/components/AdminJobReviewQueue";
import { Badge, PageHeader, Panel, StatCard, formatDate } from "@/components/admin/AdminUi";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin-guard";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ACTION_LABELS = {
  JOB_PUBLISHED: "Published a job",
  JOB_REJECTED: "Rejected a job",
  JOB_ARCHIVED: "Archived a job",
  JOB_CREATED_BY_ADMIN: "Posted a job",
  JOB_EDITED_BY_ADMIN: "Edited a job",
  JOB_DELETED_BY_ADMIN: "Deleted a job",
  USER_ROLE_CHANGED: "Changed a user's role",
  USER_SUSPENDED: "Suspended a user",
  USER_REINSTATED: "Reinstated a user",
  USER_DELETED_BY_ADMIN: "Deleted a user",
  OWNER_ADMIN_GRANTED: "Owner admin access granted",
  EMPLOYER_VERIFIED: "Verified an employer",
  EMPLOYER_REJECTED: "Rejected an employer",
  EMPLOYER_SUSPENDED: "Suspended an employer",
  EMPLOYER_CREATED_BY_ADMIN: "Added an employer",
  EMPLOYER_EDITED_BY_ADMIN: "Edited an employer",
  CATEGORY_JOBS_MOVED: "Moved jobs between categories",
  SOURCE_ENABLED: "Turned a source on",
  SOURCE_DISABLED: "Turned a source off",
  JOB_SUBMITTED_FOR_REVIEW: "Employer submitted a job",
};

export default async function AdminOverviewPage() {
  await requireAdminPage("/admin");
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [liveJobs, pendingCount, newJobs, users, newUsers, employers, pendingEmployers, pendingJobs, activity] =
    await Promise.all([
      prisma.job.count({ where: { moderationStatus: "PUBLISHED", active: true } }),
      prisma.job.count({ where: { moderationStatus: "PENDING_REVIEW" } }),
      prisma.job.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.employer.count(),
      prisma.employer.count({ where: { verificationStatus: "PENDING" } }),
      prisma.job.findMany({
        where: { moderationStatus: "PENDING_REVIEW" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          source: true,
          sourceUrl: true,
          description: true,
          deadline: true,
          moderationNote: true,
        },
      }),
      prisma.auditEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { id: true, action: true, entityType: true, createdAt: true, actor: { select: { email: true } } },
      }),
    ]);

  return (
    <>
      <PageHeader
        title="Overview"
        description="What needs your attention on Daraja today."
        actions={
          <>
            <Link className={styles.buttonPrimary} href="/admin/jobs/new">Post a job</Link>
            <Link className={styles.button} href="/admin/users">Manage users</Link>
          </>
        }
      />

      <div className={styles.stats}>
        <StatCard label="Live jobs" value={liveJobs} note={`${newJobs} added this week`} href="/admin/jobs?status=live" />
        <StatCard label="Needs review" value={pendingCount} note="Jobs held before going live" href="/admin/jobs?status=PENDING_REVIEW" />
        <StatCard label="Users" value={users} note={`${newUsers} joined this week`} href="/admin/users" />
        <StatCard label="Employers" value={employers} note={`${pendingEmployers} waiting for verification`} href="/admin/employers" />
      </div>

      <Panel
        title={`Jobs waiting for review (${pendingCount})`}
        actions={<Link className={styles.button} href="/admin/jobs?status=PENDING_REVIEW">See all</Link>}
      >
        <AdminJobReviewQueue
          jobs={pendingJobs.map((job) => ({ ...job, deadline: job.deadline?.toISOString() ?? null }))}
        />
      </Panel>

      <Panel title="Recent admin activity" flush>
        {activity.length ? (
          <ul className={styles.activity}>
            {activity.map((event) => (
              <li key={event.id}>
                <span>
                  <strong>{ACTION_LABELS[event.action] || event.action}</strong>
                  <span className={styles.subtle}>{event.actor?.email || "System"}</span>
                </span>
                <span>
                  <Badge>{event.entityType}</Badge>
                  <span className={styles.subtle}>{formatDate(event.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No admin activity yet.</p>
        )}
      </Panel>
    </>
  );
}
