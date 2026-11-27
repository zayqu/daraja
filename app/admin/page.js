import Link from "next/link";
import AdminJobReviewQueue from "@/components/AdminJobReviewQueue";
import { Badge, PageHeader, Panel, StatCard, formatDate } from "@/components/dashboard/DashboardUi";
import styles from "@/components/dashboard/dashboard.module.css";
import NavIcon from "@/components/ui/NavIcon";
import { requireAdminPage } from "@/lib/admin-guard";
import { getAdminQueueCounts } from "@/lib/admin-queue";
import prisma from "@/lib/prisma";
import sourceSettingsModule from "@/scraper/lib/source-settings";

const { applySourceSettings, getSourceCatalog } = sourceSettingsModule;

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

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(date, now) {
  const days = Math.floor((now - new Date(date)) / DAY_MS);
  if (days <= 0) return "today";
  return days === 1 ? "1 day" : `${days} days`;
}

function lastUpdateLabel(date, now) {
  if (!date) return "No jobs yet";
  const hours = Math.floor((now - new Date(date)) / (60 * 60 * 1000));
  if (hours < 1) return "Updated within the hour";
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${formatDate(date)}`;
}

// Admin overview (Figma Desktop · Admin overview): what is waiting, the
// review queue, employers to verify and whether job sources are still bringing
// in vacancies. Approving still goes through the editor checks (D-029).
export default async function AdminOverviewPage() {
  await requireAdminPage("/admin");
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

  const [
    liveJobs,
    { pendingJobs: pendingCount, pendingEmployers },
    newLiveJobs,
    newCandidates,
    pendingJobs,
    oldestPending,
    employersToVerify,
    sourceSettings,
    sourceLatest,
    activity,
  ] = await Promise.all([
    prisma.job.count({ where: { moderationStatus: "PUBLISHED", active: true } }),
    getAdminQueueCounts(),
    prisma.job.count({ where: { moderationStatus: "PUBLISHED", active: true, createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { role: "JOB_SEEKER", createdAt: { gte: weekAgo } } }),
    prisma.job.findMany({
      where: { moderationStatus: "PENDING_REVIEW" },
      orderBy: { createdAt: "desc" },
      take: 8,
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
        createdAt: true,
      },
    }),
    prisma.job.findFirst({
      where: { moderationStatus: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.employer.findMany({
      where: { verificationStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 4,
      select: { id: true, companyName: true, createdAt: true },
    }),
    prisma.scraperSourceSetting.findMany(),
    prisma.job.groupBy({ by: ["source"], _max: { createdAt: true } }),
    prisma.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, entityType: true, createdAt: true, actor: { select: { email: true } } },
    }),
  ]);

  const latestBySource = Object.fromEntries(sourceLatest.map((row) => [row.source, row._max.createdAt]));
  const sources = applySourceSettings(getSourceCatalog(), sourceSettings)
    .filter((source) => source.adapter && source.enabled)
    .map((source) => {
      const latest = latestBySource[source.id] || null;
      const quiet = !latest || now - new Date(latest) > 2 * DAY_MS;
      return { id: source.id, name: source.name, latest, quiet };
    })
    .sort((a, b) => Number(b.quiet) - Number(a.quiet) || a.name.localeCompare(b.name))
    .slice(0, 5);

  const waiting = [
    pendingCount ? `${pendingCount} ${pendingCount === 1 ? "vacancy" : "vacancies"}` : null,
    pendingEmployers ? `${pendingEmployers} ${pendingEmployers === 1 ? "employer" : "employers"}` : null,
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        title="Habari, Admin"
        description={waiting.length ? `${waiting.join(" and ")} ${pendingCount + pendingEmployers === 1 ? "is" : "are"} waiting for you.` : "Nothing is waiting for you right now."}
        actions={
          <>
            <Link className={styles.button} href="/">View the site</Link>
            <Link className={styles.buttonPrimary} href="/admin/jobs/new">Post a job</Link>
          </>
        }
      />

      <div className={styles.stats}>
        <StatCard
          icon="document"
          label="Waiting review"
          value={pendingCount}
          note={oldestPending ? `Oldest: ${daysAgo(oldestPending.createdAt, now)}` : "Queue is clear"}
          tone={oldestPending && now - oldestPending.createdAt > 2 * DAY_MS ? "warning" : undefined}
          href="/admin/jobs?status=PENDING_REVIEW"
        />
        <StatCard
          icon="employer"
          label="Employers to verify"
          value={pendingEmployers}
          note={employersToVerify[0] ? `Oldest: ${daysAgo(employersToVerify[0].createdAt, now)}` : "All checked"}
          href="/admin/employers?status=PENDING"
        />
        <StatCard
          icon="jobs"
          label="Live vacancies"
          value={liveJobs.toLocaleString("en-GB")}
          note={`+${newLiveJobs} this week`}
          href="/admin/jobs?status=live"
        />
        <StatCard
          icon="users"
          label="New candidates"
          value={newCandidates.toLocaleString("en-GB")}
          note="Last 7 days"
          href="/admin/users"
        />
      </div>

      <div className={styles.overviewGrid}>
        <Panel
          title={
            <>
              Vacancies waiting {pendingCount ? <Badge tone="amber">{pendingCount}</Badge> : null}
            </>
          }
          actions={<Link className={styles.linkArrow} href="/admin/jobs?status=PENDING_REVIEW">Open queue</Link>}
          flush
        >
          <AdminJobReviewQueue
            jobs={pendingJobs.map((job) => ({
              ...job,
              deadline: job.deadline?.toISOString() ?? null,
              createdAt: job.createdAt.toISOString(),
            }))}
          />
        </Panel>

        <div className={styles.overviewSide}>
          <section className={styles.card} aria-label="Employers to verify">
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>
                Employers to verify {pendingEmployers ? <Badge tone="amber">{pendingEmployers}</Badge> : null}
              </h2>
            </div>
            {employersToVerify.length ? (
              <ul className={styles.miniList}>
                {employersToVerify.map((employer) => (
                  <li key={employer.id}>
                    <span className={styles.miniMark} aria-hidden="true"><NavIcon name="employer" size={18} /></span>
                    <span>
                      <strong>{employer.companyName}</strong>
                      <small>Sent {formatDate(employer.createdAt)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.help}>No employers are waiting.</p>
            )}
            <div className={styles.cardFooter}>
              <Link href="/admin/employers?status=PENDING">Review employers →</Link>
            </div>
          </section>

          <section className={styles.card} aria-label="Job sources">
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Job sources</h2>
            </div>
            {sources.length ? (
              <ul className={styles.miniList}>
                {sources.map((source) => (
                  <li key={source.id}>
                    <span className={`${styles.statusDot} ${source.quiet ? styles.statusDotWarn : ""}`} aria-hidden="true" />
                    <span>
                      <strong>{source.name}</strong>
                      <small>{lastUpdateLabel(source.latest, now)}</small>
                    </span>
                    {source.quiet ? (
                      <Link className={styles.checkLink} href={`/admin/jobs?source=${encodeURIComponent(source.id)}`}>Check</Link>
                    ) : (
                      <Badge tone="green">OK</Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.help}>No job sources are switched on.</p>
            )}
            <div className={styles.cardFooter}>
              <Link href="/admin/sources">All sources →</Link>
            </div>
          </section>
        </div>
      </div>

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
